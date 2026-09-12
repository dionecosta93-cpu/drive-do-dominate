/**
 * Plano real do usuário logado (lido de `public.user_plans`, só-leitura pro
 * cliente — ver supabase/migrations/20260912000000_*.sql). Atualizado no
 * login/troca de conta pelo listener em __root.tsx.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";

let currentPlan: PlanId = "free";
const listeners = new Set<() => void>();

function setPlan(plan: PlanId) {
  if (plan === currentPlan) return;
  currentPlan = plan;
  listeners.forEach((l) => l());
}

/** Busca o plano do usuário no Supabase e atualiza o estado global do hook. */
export async function refreshUserPlan(userId: string | null): Promise<PlanId> {
  if (!userId) {
    setPlan("free");
    return "free";
  }
  try {
    const { data, error } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    const plan = (!error && (data?.plan as PlanId | undefined)) || "free";
    setPlan(plan);
    return plan;
  } catch {
    setPlan("free");
    return "free";
  }
}

/** Plano atual (fora de componentes React — ex.: dentro de uma ação do assistente). */
export function getCurrentPlan(): PlanId {
  return currentPlan;
}

/** Hook: plano do usuário logado, atualizado automaticamente após refreshUserPlan(). */
export function useUserPlan(): PlanId {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => currentPlan,
  );
}
