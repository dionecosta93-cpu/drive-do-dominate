import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, TrendingUp, AlertTriangle } from "lucide-react";
import { goalCategoryLabel, goalImpact, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals/impact")({
  component: ImpactPanel,
  head: () => ({
    meta: [
      { title: "Painel de Impacto — Disciplina Absoluta" },
      { name: "description", content: "Veja quais metas recebem mais atenção e quais estão sendo negligenciadas." },
      { property: "og:title", content: "Painel de Impacto — Disciplina Absoluta" },
      { property: "og:description", content: "Veja quais metas recebem mais atenção e quais estão sendo negligenciadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ImpactPanel() {
  const goals = useStore((s) => s.lifeGoals);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const impact = goalImpact(goals, tasks, sessions);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/goals" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Metas
      </Link>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Painel de Impacto</h1>

      {goals.length === 0 && (
        <p className="text-sm text-muted-foreground">Crie metas para acompanhar o impacto das suas tarefas.</p>
      )}

      {impact.mostAttention && (
        <div className="bg-discipline/10 border border-discipline/20 rounded-2xl p-4 mb-3 flex gap-3">
          <TrendingUp className="size-5 text-discipline shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-0.5">Mais atenção</p>
            <p className="text-sm font-medium">{impact.mostAttention.goal.name}</p>
            <p className="text-[11px] text-muted-foreground">{impact.mostAttention.weekCount} execuções nos últimos 7 dias</p>
          </div>
        </div>
      )}

      {impact.neglected && impact.neglected.weekCount === 0 && (
        <div className="bg-struggle/10 border border-struggle/20 rounded-2xl p-4 mb-6 flex gap-3">
          <AlertTriangle className="size-5 text-struggle shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-struggle mb-0.5">Negligenciada</p>
            <p className="text-sm font-medium">{impact.neglected.goal.name}</p>
            <p className="text-[11px] text-muted-foreground">Sem execução na última semana. Agende uma ação hoje.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {impact.rows.map((r) => (
          <Link
            key={r.goal.id}
            to="/goals/$id"
            params={{ id: r.goal.id }}
            className="block bg-surface border border-border rounded-2xl p-4 hover:border-discipline/40 transition"
          >
            <div className="flex justify-between items-start gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                  {goalCategoryLabel[r.goal.category]}
                </p>
                <h2 className="font-heading font-bold text-base leading-tight truncate">{r.goal.name}</h2>
              </div>
              <span className="font-heading font-black text-lg text-discipline tabular-nums">{r.pct}%</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full"
                style={{ width: `${Math.max(r.pct, 2)}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Metric label="Semana" value={r.weekCount} />
              <Metric label="Mês" value={r.monthCount} />
              <Metric label="Ano" value={r.yearCount} />
              <Metric label="Minutos" value={r.minutes} />
            </div>
          </Link>
        ))}
      </div>

      {impact.unlinkedToday > 0 && (
        <p className="text-[11px] text-muted-foreground mt-6">
          {impact.unlinkedToday} tarefas ainda não estão ligadas a nenhuma meta. Vincule-as para dar propósito à rotina.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background rounded-lg py-2">
      <p className="font-heading font-black text-sm tabular-nums">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
