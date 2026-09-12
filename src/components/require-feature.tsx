import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { hasFeature, minPlanFor, planById, FEATURE_LABEL, type Feature } from "@/lib/plans";
import { useUserPlan } from "@/lib/user-plan";

/**
 * Trava central de acesso por plano — use isto em vez de checar plano "na unha"
 * em qualquer tela. Bloqueia visualmente quando o usuário não tem a feature;
 * a proteção que importa de verdade (custo real, dados sensíveis) é sempre
 * feita de novo no servidor — este componente é só a UI.
 */
export function RequireFeature({ feature, children }: { feature: Feature; children: ReactNode }) {
  const plan = useUserPlan();
  if (hasFeature(feature, plan)) return <>{children}</>;

  const needed = planById(minPlanFor(feature));
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface border border-border">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-lg font-heading font-black uppercase">
        Recurso do plano {needed.name}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground text-pretty">
        {FEATURE_LABEL[feature]} faz parte do plano {needed.name}. Seu plano atual é{" "}
        {planById(plan).name}.
      </p>
      <Link
        to="/plans"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-discipline px-5 py-2.5 text-sm font-heading font-black text-black active:scale-[0.98] transition-transform"
      >
        Ver planos
      </Link>
    </div>
  );
}
