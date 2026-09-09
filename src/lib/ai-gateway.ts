/**
 * Configuração do provedor de IA usado pelas rotas /api/* (server-side).
 *
 * Independente da Lovable: leia de variáveis de ambiente. Enquanto `AI_API_KEY`
 * (ou o legado `LOVABLE_API_KEY`) não estiver definido, os recursos de IA ficam
 * desligados e as rotas respondem 503 — a UI trata isso como "em breve".
 *
 * Para reativar no futuro, defina no ambiente do servidor:
 *   AI_API_KEY=...            (obrigatório)
 *   AI_GATEWAY_URL=...        (opcional; default: gateway compatível com OpenAI)
 */

const DEFAULT_GATEWAY = "https://ai.gateway.lovable.dev";

export interface AiGateway {
  base: string;
  /** Cabeçalhos de autenticação a mesclar no fetch para o provedor. */
  authHeaders: Record<string, string>;
}

export function getAiGateway(): AiGateway | null {
  const key = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const base = (process.env.AI_GATEWAY_URL || DEFAULT_GATEWAY).replace(/\/$/, "");
  return {
    base,
    // Cobre os dois estilos aceitos pelo gateway (Bearer e header dedicado).
    authHeaders: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key },
  };
}

/** Resposta padrão quando a IA não está configurada. */
export const aiDisabledResponse = () =>
  Response.json(
    { error: "ai_disabled", message: "Recursos de IA ainda não configurados." },
    { status: 503 },
  );
