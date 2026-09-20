import { isAuthRetryableFetchError } from "@supabase/supabase-js";

/**
 * Sessão do Supabase guardada no aparelho (localStorage, chave `sb-<projeto>-auth-token`).
 */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      const session = parsed as { refresh_token?: unknown; user?: unknown } | null;
      if (session && typeof session.refresh_token === "string" && session.user) return true;
    }
  } catch {
    // storage bloqueado ou JSON corrompido: trata como sem sessão salva
  }
  return false;
}

/**
 * getSession() devolve `session: null` + erro quando o access token expirou (dura ~1h)
 * e a renovação pela rede falha — que é exatamente o caso de abrir o app sem internet.
 * Isso NÃO significa "deslogado": a sessão continua salva e volta a valer quando a rede
 * voltar. Só devolve true nesse caso (offline, ou erro de rede na renovação) E com sessão
 * salva; um erro real de auth (token revogado, etc.) continua mandando pro login.
 */
export function canTrustStoredSession(error: unknown): boolean {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const networkError = isAuthRetryableFetchError(error);
  return (offline || networkError) && hasStoredSession();
}
