/**
 * Camada de Analytics desacoplada, que fala com o Codane Analytics central
 * (POST /api/events — mesmo contrato usado pela landing e por outros apps).
 *
 * - NÃO é um painel; apenas envia eventos para o Analytics central externo.
 * - Desligada por padrão: só envia se `VITE_APP_ID`, `VITE_ANALYTICS_API_URL` e
 *   `VITE_ANALYTICS_INGEST_KEY` estiverem configurados (ver `.env.example`).
 * - Fire-and-forget, nunca lança, nunca bloqueia a UI.
 * - Só envia identificadores técnicos (UUID de usuário, id de sessão) e props
 *   explicitamente passadas pelo chamador — nada de e-mail, senha, tokens.
 */

import { isNativeApp } from "@/lib/native";

export type AnalyticsEvent =
  | "app_open"
  | "sign_up"
  | "login"
  | "logout"
  | "onboarding_completed"
  | "feature_used"
  | "content_created"
  | "content_shared"
  | "invite_sent"
  | "subscription_started"
  | "subscription_cancelled";

type Props = Record<string, string | number | boolean | null | undefined>;

const APP_ID = (import.meta.env.VITE_APP_ID as string | undefined)?.trim() || "";
const API_URL = (import.meta.env.VITE_ANALYTICS_API_URL as string | undefined)?.trim() || "";
const INGEST_KEY = (import.meta.env.VITE_ANALYTICS_INGEST_KEY as string | undefined)?.trim() || "";
const ENABLED = Boolean(APP_ID && API_URL && INGEST_KEY && typeof window !== "undefined");

const SESSION_KEY = "forja-analytics-session";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        (crypto.randomUUID?.() as string | undefined) ??
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

/** Preenchido após o login para correlacionar eventos (UUID, não é dado pessoal). */
let currentUserId: string | null = null;
export function setAnalyticsUser(userId: string | null) {
  currentUserId = userId;
}

/** Remove chaves potencialmente sensíveis por engano. */
function sanitize(props?: Props): Props {
  if (!props) return {};
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (/pass|senha|token|secret|email|cpf|card|cart[aã]o/i.test(k)) continue;
    if (typeof v === "string" && v.length > 200) out[k] = v.slice(0, 200);
    else out[k] = v;
  }
  return out;
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (!ENABLED) return;
  try {
    const body = JSON.stringify({
      app_id: APP_ID,
      ingest_key: INGEST_KEY,
      event,
      user_id: currentUserId,
      timestamp: new Date().toISOString(),
      platform: isNativeApp() ? "android" : "web",
      properties: { session_id: sessionId(), ...sanitize(props) },
    });
    const url = `${API_URL.replace(/\/$/, "")}/api/events`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics nunca quebra a aplicação */
  }
}

/** Atalho para o evento genérico de uso de funcionalidade. */
export const trackFeature = (feature: string, props?: Props) =>
  track("feature_used", { feature, ...props });

/** Atalho para criação de conteúdo (tarefa, meta, livro, transação, lista…). */
export const trackCreated = (kind: string, props?: Props) =>
  track("content_created", { kind, ...props });
