// Service worker da Forja — escrito à mão (não gerado por build).
//
// Por quê: no pipeline nitro/vite (build multi-ambiente), o vite-plugin-pwa gerava
// este arquivo num diretório intermediário que o nitro já tinha esvaziado antes —
// o sw.js nunca chegava no site publicado, então o app não abria offline (mesmo
// depois de já ter sido aberto antes). Por ser um arquivo estático em public/,
// o nitro copia ele de forma confiável em qualquer preset de deploy.
//
// Estratégia (igual à anterior, só que sem depender do Workbox):
//   - Navegação (HTML): network-first com timeout curto; sem rede, usa a última
//     versão em cache dessa página ou cai para /offline.html.
//   - JS/CSS/fonte/imagem do mesmo domínio: cache-first.
//   - /api/* e /~oauth nunca são interceptados (sempre rede).
//
// Suba a versão abaixo só quando quiser forçar a limpeza dos caches antigos.
const VERSION = "v1";
const HTML_CACHE = `forja-html-${VERSION}`;
const ASSET_CACHE = `forja-assets-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

// Pré-cache mínimo: garante que /offline.html funcione mesmo na primeira vez
// que o app abre sem internet (antes de qualquer navegação ter sido cacheada).
const PRECACHE_URLS = ["/offline.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(HTML_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        /* alguma URL pode falhar num deploy fresco; não trava a instalação */
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== HTML_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/~oauth")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response && response.ok) void cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/offline.html")) ||
      new Response("offline", { status: 503, statusText: "Offline" })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) void cache.put(request, response.clone());
    return response;
  } catch {
    return cached || new Response("offline", { status: 503, statusText: "Offline" });
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
