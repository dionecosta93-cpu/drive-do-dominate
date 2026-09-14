/**
 * Guarda uma cópia do HTML já renderizado (com a IU real, não só a casca) no
 * Cache Storage ("forja-html-v1" — o mesmo cache que public/sw.js usa e que
 * public/offline-app.html lê pra restaurar o app completo quando abre offline).
 *
 * Por quê isso existe: o plano original era o service worker cachear a
 * navegação principal sozinho (networkFirst em public/sw.js). Isso funciona
 * num navegador comum, mas o WebView do Android tem suporte limitado/inconsistente
 * pra Service Worker interceptar a NAVEGAÇÃO (diferente de scripts/imagens, que
 * funcionam bem) — então esse cache podia nunca ser preenchido de verdade dentro
 * do app nativo, mesmo com o app usado várias vezes. Aqui a gente garante o
 * mesmo resultado diretamente, sem depender dessa interceptação: tira uma "foto"
 * do DOM já hidratado e escreve no cache manualmente.
 */
const HTML_CACHE = "forja-html-v1";
const REFRESH_MS = 2 * 60 * 1000;

let started = false;

function shouldRun(): boolean {
  if (typeof window === "undefined" || !("caches" in window)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  return true;
}

async function saveSnapshot() {
  try {
    const html = "<!doctype html>\n" + document.documentElement.outerHTML;
    const headers = { "Content-Type": "text/html; charset=utf-8" };
    const cache = await caches.open(HTML_CACHE);
    await cache.put(location.href, new Response(html, { headers }));
    // Também sob a raiz — é a chave que a tela offline tenta quando a rota
    // exata não bate (ex.: abriu offline direto numa rota diferente).
    if (location.pathname !== "/") {
      await cache.put(location.origin + "/", new Response(html, { headers }));
    }
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
