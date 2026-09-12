/**
 * Autenticação + plano + cota diária pras rotas de IA (custo real por chamada).
 * Antes disto, essas rotas só tinham guardApiRequest (mesma origem + rate limit
 * por IP) — nenhuma checava QUEM está chamando nem o plano. Chame no início de
 * cada handler, antes de gastar a chamada de IA de verdade.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { hasFeature, CHAT_DAILY_LIMIT, type Feature, type PlanId } from "@/lib/plans";

/**
 * Cota diária por feature — cada uma conta separado (ai_usage.feature), então
 * usar o assistente de chat não consome a cota do coach de voz nem da busca de
 * livro, e vice-versa. Ajuste livremente.
 */
const DAILY_LIMIT: Partial<Record<Feature, Record<PlanId, number>>> = {
  ai_assistant: CHAT_DAILY_LIMIT,
  voice_coach: { free: 0, pro: 20, premium: 60 },
  reading: { free: 0, pro: 20, premium: 60 },
};

export interface AiAccessResult {
  ok: boolean;
  status: number;
  error?:
    "missing_token" | "invalid_token" | "plan_required" | "daily_limit_reached" | "server_error";
  userId?: string;
}

export async function checkAiAccess(request: Request, feature: Feature): Promise<AiAccessResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "missing_token" };
  }
  const token = authHeader.slice(7);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[ai-access] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes");
    return { ok: false, status: 500, error: "server_error" };
  }
  const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "invalid_token" };
  }
  const userId = userData.user.id;

  const { data: planRow } = await admin
    .from("user_plans")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (planRow?.plan as PlanId | undefined) ?? "free";

  const limit = DAILY_LIMIT[feature]?.[plan] ?? 0;
  if (limit <= 0 || !hasFeature(feature, plan)) {
    return { ok: false, status: 403, error: "plan_required", userId };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await admin
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .eq("feature", feature)
    .maybeSingle();
  const used = usageRow?.count ?? 0;
  if (used >= limit) {
    return { ok: false, status: 429, error: "daily_limit_reached", userId };
  }

  await admin
    .from("ai_usage")
    .upsert(
      { user_id: userId, usage_date: today, feature, count: used + 1 },
      { onConflict: "user_id,usage_date,feature" },
    );

  return { ok: true, status: 200, userId };
}
