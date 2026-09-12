/**
 * Planos FREE / PRO / PREMIUM.
 *
 * O plano de cada usuário vive em `public.user_plans` (Supabase) — só o
 * service role escreve lá (ver supabase/migrations/20260912000000_*.sql),
 * então o cliente nunca consegue se auto-promover. Liberação de plano hoje é
 * manual (sem gateway de pagamento ainda): ver scripts/set-plan.mjs.
 * `useUserPlan()` (src/lib/user-plan.ts) busca o plano atual do usuário logado.
 */

export type PlanId = "free" | "pro" | "premium";

/** Chaves de funcionalidades que podem virar pagas no futuro. */
export type Feature =
  | "tasks"
  | "focus_mode"
  | "basic_stats"
  | "calendar"
  | "reading"
  | "finance"
  | "shopping"
  | "devotional"
  | "ai_assistant"
  | "ai_reports"
  | "voice_coach"
  | "unlimited_goals"
  | "cloud_sync"
  | "priority_sync"
  | "pdf_export"
  | "custom_themes";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Preço mensal em centavos (referência para a tela; não é cobrado no modo demo). */
  priceMonthly: number;
  highlight?: boolean;
  features: Feature[];
  /** Texto amigável dos destaques para a tabela de comparação. */
  perks: string[];
}

export const FEATURE_LABEL: Record<Feature, string> = {
  tasks: "Tarefas e rotina",
  focus_mode: "Modo Foco (cronômetro, respiração)",
  basic_stats: "Estatísticas essenciais",
  calendar: "Agenda e calendário",
  reading: "Controle de leitura",
  finance: "Finanças pessoais",
  shopping: "Listas de compras",
  devotional: "Devocional diário",
  ai_assistant: "Assistente IA (criar/organizar por voz e texto)",
  ai_reports: "Relatórios e sugestões da IA",
  voice_coach: "Coach de voz no Modo Foco",
  unlimited_goals: "Metas de vida ilimitadas",
  cloud_sync: "Sincronização na nuvem",
  priority_sync: "Sincronização prioritária + backup",
  pdf_export: "Exportar relatórios em PDF",
  custom_themes: "Temas (claro, escuro, divertido)",
};

/** Limite de comandos no chat do assistente por dia — ajuste livremente. */
export const CHAT_DAILY_LIMIT: Record<PlanId, number> = {
  free: 5,
  pro: 15,
  premium: 30,
};

const FREE: Feature[] = [
  "tasks",
  "focus_mode",
  "basic_stats",
  "calendar",
  "devotional",
  "cloud_sync",
  "ai_assistant",
  "custom_themes",
];
const PRO: Feature[] = [
  ...FREE,
  "reading",
  "finance",
  "shopping",
  "ai_reports",
  "unlimited_goals",
  "voice_coach",
];
const PREMIUM: Feature[] = [...PRO, "priority_sync", "pdf_export"];

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    tagline: "O essencial para parar de adiar",
    priceMonthly: 0,
    features: FREE,
    perks: ["Tarefas, rotina e Modo Foco", "Sequências e disciplina", "Sincronização na nuvem"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Rotina, leitura, finanças e IA de análise",
    priceMonthly: 1990,
    highlight: true,
    features: PRO,
    perks: [
      "Tudo do Grátis",
      "Leitura, Finanças e Compras",
      "Relatórios e sugestões da IA",
      "Metas de vida ilimitadas",
      "Coach de voz no foco",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Assistente IA completo e recursos avançados",
    priceMonthly: 3990,
    features: PREMIUM,
    perks: [
      "Tudo do Pro",
      "Assistente IA (voz e texto) para criar e organizar",
      "Backup e sincronização prioritária",
      "Exportar relatórios em PDF",
      "Temas claro / escuro / AMOLED",
    ],
  },
];

export const planById = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** Checagem central de acesso a uma funcionalidade — nunca cheque plano "na unha". */
export function hasFeature(feature: Feature, plan: PlanId): boolean {
  return planById(plan).features.includes(feature);
}

/** O plano mínimo que já libera essa funcionalidade (pra sugerir upgrade). */
export function minPlanFor(feature: Feature): PlanId {
  return PLANS.find((p) => p.features.includes(feature))?.id ?? "premium";
}

export const formatPlanPrice = (cents: number): string =>
  cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(2).replace(".", ",")}/mês`;
