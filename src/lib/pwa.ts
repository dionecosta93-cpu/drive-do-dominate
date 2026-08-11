/**
 * Registro do service worker — único ponto de registro do app.
 * Nunca registra em dev, dentro de iframe ou nos previews da Lovable.
 * `?sw=off` desliga e limpa o registro.
 */
const SW_URL = "/sw.js";

function shouldRegister(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return false;
  return true;
}

async function unregisterExisting() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignora */
  }
}

export function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!shouldRegister()) {
    void unregisterExisting();
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      /* offline não é erro */
    });
  });
}
