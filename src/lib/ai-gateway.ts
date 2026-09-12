/**
 * Configuração do provedor de IA usado pelas rotas /api/* (server-side): Gemini
 * (Google Generative Language API).
 *
 * Enquanto `AI_API_KEY` (ou o legado `LOVABLE_API_KEY`) não estiver definido, os
 * recursos de IA ficam desligados e as rotas respondem 503 — a UI trata isso como
 * "em breve".
 *
 *   AI_API_KEY=...            (obrigatório — chave da Gemini API)
 *   AI_GATEWAY_URL=...        (opcional; default: API pública da Gemini)
 */

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface AiGateway {
  apiKey: string;
  base: string;
}

export function getAiGateway(): AiGateway | null {
  const key = process.env.AI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const base = (process.env.AI_GATEWAY_URL || DEFAULT_BASE).replace(/\/$/, "");
  return { apiKey: key, base };
}

/** Resposta padrão quando a IA não está configurada. */
export const aiDisabledResponse = () =>
  Response.json(
    { error: "ai_disabled", message: "Recursos de IA ainda não configurados." },
    { status: 503 },
  );
