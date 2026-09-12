/**
 * fetch() para as rotas /api/* que precisam saber quem está chamando (IA, com
 * plano + cota por usuário) — anexa o token da sessão atual do Supabase.
 * Rotas sem custo/sem plano continuam usando fetch() normal.
 */
import { supabase } from "@/integrations/supabase/client";

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

/** Mensagem amigável para os erros que checkAiAccess (server) pode devolver. */
export function aiAccessErrorMessage(error: string | undefined): string {
  switch (error) {
    case "missing_token":
    case "invalid_token":
      return "Sua sessão expirou. Entre novamente para usar a IA.";
    case "plan_required":
      return "Esse recurso de IA não está no seu plano atual.";
    case "daily_limit_reached":
      return "Você atingiu o limite diário de uso da IA. Volta amanhã ou faz upgrade de plano.";
    default:
      return "Não consegui usar a IA agora.";
  }
}
