/**
 * Guarda uma cópia do app — HTML (cache "forja-html-v1") e os arquivos JS/CSS do
 * build (cache "forja-assets-v1", os MESMOS nomes que public/sw.js usa) — direto no
 * Cache Storage, sem depender do service worker interceptar nada. É o que
 * public/offline-app.html lê pra restaurar o app completo quando abre offline.
 *
 * Por quê isso existe: o plano original era o service worker (public/sw.js)
 * cachear tudo sozinho, interceptando as requisições (networkFirst pro HTML,
 * cacheFirst pros scripts/estilos). Isso funciona num navegador comum, mas o
 * WebView do Android tem suporte limitado/inconsistente pra Service Worker
 * interceptar requisições dentro do app nativo — então esses caches podiam
 * nunca ser preenchidos de verdade, mesmo com o app usado várias vezes.
 * Aqui a gente garante o mesmo resultado diretamente, via fetch() comum (que não
 * depende de interceptação nenhuma).
 *
 * No app nativo (Android/Capacitor), o Cache Storage sozinho não resolve os
 * arquivos JS/CSS: quando a tela offline restaura o HTML (document.write), essa
 * página não passa a ser "controlada" por nenhum service worker (não foi uma
 * navegação de verdade), então os <link>/<script> dela pedem rede normal e
 * falham offline mesmo com o arquivo certo guardado em Cache Storage -- nada
 * ali intercepta pra responder com ele. Por isso, no nativo, os arquivos são
 * passados pra uma ponte Java (window.AndroidOffline, registrada em
 * MainActivity.java) que os guarda em disco e os serve via
 * shouldInterceptRequest (OfflineWebViewClient.java) -- aí funciona
 * independente de qualquer suporte a Service Worker do WebView.
 *
 * Duas regras que fazem o app restaurado realmente FUNCIONAR (não só aparecer):
 *  1. Guardamos TODOS os JS/CSS do build (lista em /asset-manifest.json, gerada no
 *     build pelo vite.config.ts), não só os que a página atual referencia. O HTML só
 *     tem o entry + modulepreload da tela aberta; o entry importa react etc. logo ao
 *     iniciar e cada outra tela é um chunk carregado ao navegar. Sem esses arquivos a
 *     página restaurada ficava congelada (visual ok, nenhum toque respondia).
 *  2. O HTML guardado é o ORIGINAL entregue pelo servidor para "/", não o DOM já
 *     hidratado: ele traz os dados de hidratação do TanStack ($_TSR), que o React
 *     precisa pra subir de novo. A tela offline sempre restaura em "/".
 */
const HTML_CACHE = "forja-html-v1";
const ASSET_CACHE = "forja-assets-v1";
const REFRESH_MS = 2 * 60 * 1000;

interface AndroidOfflineBridge {
  cacheUrls(urlsJson: string): void;
  /** Baixa o que falta e apaga do disco o que não está na lista. Só em APKs novos. */
  syncAssets?(urlsJson: string): void;
}
declare global {
  interface Window {
    AndroidOffline?: AndroidOfflineBridge;
  }
}

let started = false;

function shouldRun(): boolean {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  return true;
}

async function saveHtml() {
  // HTML original do servidor pra "/" (rota sob _authenticated é ssr:false — o HTML
  // é o mesmo pra qualquer usuário, sem dado pessoal).
  const res = await fetch("/", { cache: "no-store", headers: { Accept: "text/html" } });
  if (!res.ok) return;
  const html = await res.text();
  if (html.length < 200) return;
  const cache = await caches.open(HTML_CACHE);
  await cache.put(
    location.origin + "/",
    new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
  );
}

function domAssetUrls(): string[] {
  const urls = new Set<string>();
  document
    .querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href], link[rel="modulepreload"][href]',
    )
    .forEach((el) => {
      if (el.href) urls.add(el.href);
    });
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
    if (el.src) urls.add(el.src);
  });
  return [...urls];
}

async function manifestUrls(): Promise<string[]> {
  try {
    const res = await fetch("/asset-manifest.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const files = (data as { files?: unknown }).files;
    if (!Array.isArray(files)) return [];
    return files
      .filter((f): f is string => typeof f === "string" && f.startsWith("/"))
      .map((f) => location.origin + f);
  } catch {
    return [];
  }
}

async function assetUrls(): Promise<string[]> {
  // DOM + manifesto: o DOM cobre a página que já estava aberta mesmo que um deploy
  // novo tenha saído (não apagamos os arquivos dela antes de recarregar).
  const all = new Set([...domAssetUrls(), ...(await manifestUrls())]);
  return [...all].filter((u) => u.startsWith(location.origin));
}

async function saveAssets() {
  const urls = await assetUrls();
  if (urls.length === 0) return;

  const bridge = window.AndroidOffline;
  if (bridge) {
    // Nativo: quem serve os arquivos offline é o Java (shouldInterceptRequest) — o
    // Cache Storage não é usado nesse caminho, então não duplicamos o download.
    try {
      if (typeof bridge.syncAssets === "function") bridge.syncAssets(JSON.stringify(urls));
      else bridge.cacheUrls(JSON.stringify(urls)); // APK antigo, sem a ponte nova
      return;
    } catch {
      // ponte falhou -- cai no Cache Storage abaixo
    }
  }

  const cache = await caches.open(ASSET_CACHE);
  await Promise.allSettled(
    urls.map(async (url) => {
      const existing = await cache.match(url);
      if (existing) return; // já temos essa versão (nome tem hash do conteúdo)
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) await cache.put(url, res);
    }),
  );
  // Remove o que não é mais referenciado (versões antigas do build).
  const keep = new Set(urls);
  for (const req of await cache.keys()) {
    if (!keep.has(req.url)) await cache.delete(req);
  }
}

async function saveSnapshot() {
  try {
    await saveAssets();
    await saveHtml();
  } catch {
    // sem cache disponível (ex.: aba anônima) — a lista simples ainda funciona
  }
}

export function startHtmlSnapshots() {
  if (started || !shouldRun()) return;
  started = true;
  // Espera a hidratação/roteamento inicial assentarem antes da primeira foto.
  window.setTimeout(() => void saveSnapshot(), 2500);
  window.setInterval(() => {
    if (navigator.onLine && document.visibilityState === "visible") void saveSnapshot();
  }, REFRESH_MS);
}
