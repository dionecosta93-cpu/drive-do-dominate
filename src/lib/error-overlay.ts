/**
 * Alarme de erro visível — pega qualquer erro de JS não tratado (ou promise
 * rejeitada sem catch) em qualquer tela do app e mostra um aviso fixo na tela,
 * com a mensagem e onde aconteceu. Não depende de React (manipula o DOM
 * direto), então funciona mesmo se o próprio React tiver travado.
 *
 * Por quê isso existe: depois de restaurar o app offline (ver
 * src/lib/html-snapshot.ts + public/offline-app.html), não tinha como saber
 * se algo tinha quebrado silenciosamente -- o console do navegador não dá
 * pra ver num celular sem cabo/depurador. Isso resolve isso pra qualquer
 * situação, não só offline.
 */
let installed = false;
let lastMessage = "";
let repeatCount = 0;
const MAX_ENTRIES = 5;
const entries: string[] = [];

function showBanner(text: string) {
  try {
    if (text === lastMessage) {
      // Mesmo erro repetindo (ex.: um retry em loop) -- não deixa a tela
      // encher de cópias idênticas, só conta quantas vezes aconteceu.
      repeatCount++;
      render();
      return;
    }
    lastMessage = text;
    repeatCount = 1;
    entries.push(text);
    if (entries.length > MAX_ENTRIES) entries.shift();
    render();
  } catch {
    // se nem isso der certo, não tem mais o que fazer no cliente
  }
}

function render() {
  let el = document.getElementById("__error_overlay__");
  if (!el) {
    el = document.createElement("div");
    el.id = "__error_overlay__";
    el.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#7f1d1d;" +
      "color:#fff;font:11px/1.4 monospace;padding:10px 14px;white-space:pre-wrap;" +
      "max-height:35vh;overflow:auto;box-shadow:0 2px 8px rgba(0,0,0,.5)";
    if (!document.body) return;
    document.body.appendChild(el);
  }
  const last = entries[entries.length - 1];
  const shown = entries.slice(0, -1).concat(repeatCount > 1 ? `${last} (x${repeatCount})` : last);
  el.textContent = shown.join("\n---\n");
}

export function installGlobalErrorOverlay() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    showBanner(`ERRO: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason =
      e.reason instanceof Error ? `${e.reason.message}\n${e.reason.stack}` : String(e.reason);
    showBanner(`PROMISE REJEITADA: ${reason}`);
  });
}
