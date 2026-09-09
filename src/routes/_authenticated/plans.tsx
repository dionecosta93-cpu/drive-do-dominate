import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Crown, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  DEMO_MODE,
  FEATURE_LABEL,
  PLANS,
  formatPlanPrice,
  getUserPlan,
  type Feature,
  type PlanId,
} from "@/lib/plans";
import { track } from "@/lib/track";

export const Route = createFileRoute("/_authenticated/plans")({
  component: PlansScreen,
  head: () => ({
    meta: [
      { title: "Planos — Disciplina Absoluta" },
      {
        name: "description",
        content: "Compare os planos Grátis, Pro e Premium do Disciplina Absoluta.",
      },
    ],
  }),
});

const ALL_FEATURES = Object.keys(FEATURE_LABEL) as Feature[];

function PlansScreen() {
  const current = getUserPlan();
  const [selected, setSelected] = useState<PlanId>(PLANS.find((p) => p.highlight)?.id ?? "pro");

  const choose = (id: PlanId) => {
    setSelected(id);
    track("feature_used", { feature: "plans_selected", plan: id });
    if (DEMO_MODE) {
      toast("Modo demonstração: todos os recursos já estão liberados, sem cobrança.");
      return;
    }
    toast("Pagamentos ainda não disponíveis nesta versão.");
  };

  return (
    <div className="px-5 pt-8 pb-28 animate-rise">
      <button
        onClick={() => history.back()}
        className="flex items-center gap-1 text-muted-foreground text-xs mb-4"
      >
        <ChevronLeft className="size-4" /> Voltar
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Crown className="size-5 text-warning" />
        <h1 className="text-2xl font-heading font-extrabold uppercase">Planos</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Escolha o nível de acompanhamento. A arquitetura já está pronta para planos pagos.
      </p>

      {DEMO_MODE && (
        <div className="mb-6 rounded-2xl border border-discipline/30 bg-discipline/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-discipline mb-1">
            Modo demonstração
          </p>
          <p className="text-sm text-pretty">
            Acesso <span className="font-black">100%</span> liberado ·{" "}
            <span className="font-black">R$ 0,00</span>. Nenhuma cobrança, cartão ou assinatura
            real.
          </p>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {PLANS.map((plan) => {
          const active = selected === plan.id;
          const isCurrent = current === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => choose(plan.id)}
              className={`w-full text-left rounded-2xl border p-4 transition ${
                active
                  ? "border-discipline bg-discipline/10"
                  : "border-border bg-surface hover:border-discipline/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-lg">{plan.name}</span>
                    {plan.highlight && (
                      <span className="text-[9px] font-bold uppercase bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                        Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[9px] font-bold uppercase bg-discipline/20 text-discipline px-1.5 py-0.5 rounded">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{plan.tagline}</p>
                </div>
                <span className="shrink-0 font-heading font-black tabular-nums">
                  {formatPlanPrice(plan.priceMonthly)}
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs">
                    <Check className="size-3.5 text-discipline shrink-0 mt-0.5" />
                    <span className="text-pretty">{perk}</span>
                  </li>
                ))}
              </ul>
              <span
                className={`mt-3 inline-block w-full text-center py-2.5 rounded-xl text-xs font-bold uppercase ${
                  active ? "bg-discipline text-black" : "border border-border text-muted-foreground"
                }`}
              >
                {DEMO_MODE ? "Liberado no modo demo" : isCurrent ? "Plano atual" : "Escolher"}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Comparação de recursos
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface">
              <th className="text-left font-bold p-3">Recurso</th>
              {PLANS.map((p) => (
                <th key={p.id} className="p-3 text-center font-bold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_FEATURES.map((f) => (
              <tr key={f} className="border-t border-border">
                <td className="p-3 text-muted-foreground text-pretty">{FEATURE_LABEL[f]}</td>
                {PLANS.map((p) => (
                  <td key={p.id} className="p-3 text-center">
                    {p.features.includes(f) ? (
                      <Check className="size-4 text-discipline inline" />
                    ) : (
                      <Minus className="size-4 text-muted-foreground/40 inline" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground text-pretty">
        Esta é uma versão de demonstração — as telas de plano existem, mas não há cobrança. Os
        recursos acima já estão todos disponíveis para você agora.
      </p>
    </div>
  );
}
