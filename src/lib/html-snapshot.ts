/**
 * Guarda uma cópia do app renderizado — HTML (cache "forja-html-v1") e os
 * arquivos JS/CSS que ele referencia (cache "forja-assets-v1", os MESMOS nomes
 * que public/sw.js usa) — direto no Cache Storage, sem depender do service
 * worker interceptar nada. É o que public/offline-app.html lê pra restaurar o
 * app completo quando abre offline.
 *
 * Por quê isso existe: o plano original era o service worker (public/sw.js)
 * cachear tudo sozinho, interceptando as requisições (networkFirst pro HTML,
 * cacheFirst pros scripts/estilos). Isso funciona num navegador comum, mas o
 * WebView do Android tem suporte limitado/inconsistente pra Service Worker
 * interceptar requisições dentro do app nativo — então esses caches podiam
 * nunca ser preenchidos de verdade, mesmo com o app usado várias vezes (visto
 * na prática: a tela offline restaurava o HTML mas sem nenhum CSS/JS, porque
 * só o HTML tinha esse fallback direto — agora os assets também têm).
 * Aqui a gente garante o mesmo resultado diretamente: tira uma "foto" do DOM
 * já hidratado e busca+guarda os arquivos que ele referencia, via fetch()
 * comum (que não depende de interceptação nenhuma).
 *
 * No app nativo (Android/Capacitor), o Cache Storage sozinho não resolve os
 * arquivos JS/CSS: quando a tela offline restaura o HTML (document.write), essa
 * página não passa a ser "controlada" por nenhum service worker (não foi uma
 * navegação de verdade), então os <link>/<script> dela pedem rede normal e
 * falham offline mesmo com o arquivo certo guardado em Cache Storage -- nada
 * ali intercepta pra responder com ele. Por isso, no nativo, os mesmos arquivos
 * também são passados pra uma ponte Java (window.AndroidOffline, registrada em
 * MainActivity.java) que os guarda em disco e os serve via
 * shouldInterceptRequest (OfflineWebViewClient.java) -- aí funciona
 * independente de qualquer suporte a Service Worker do WebView.
 */
const HTML_CACHE = "forja-html-v1";
const ASSET_CACHE = "forja-assets-v1";
const REFRESH_MS = 2 * 60 * 1000;

interface AndroidOfflineBridge {
  cacheUrls(urlsJson: string): void;
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
  const html = "<!doctype html>\n" + document.documentElement.outerHTML;
  const headers = { "Content-Type": "text/html; charset=utf-8" };
  const cache = await caches.open(HTML_CACHE);
  await cache.put(location.href, new Response(html, { headers }));
  // Também sob a raiz — é a chave que a tela offline tenta quando a rota
  // exata não bate (ex.: abriu offline direto numa rota diferente).
  if (location.pathname !== "/") {
    await cache.put(location.origin + "/", new Response(html, { headers }));
  }
}

function assetUrls(): string[] {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((el) => {
    if (el.href) urls.add(el.href);
  });
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
    if (el.src) urls.add(el.src);
  });
  return [...urls].filter((u) => u.startsWith(location.origin));
}

async function saveAssets() {
  const urls = assetUrls();

  if (window.AndroidOffline) {
    try {
      window.AndroidOffline.cacheUrls(JSON.stringify(urls));
    } catch {
      // ponte nativa indisponível por algum motivo -- Cache Storage abaixo ainda ajuda no web
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
}

async function saveSnapshot() {
  try {
    await saveHtml();
    await saveAssets();
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
