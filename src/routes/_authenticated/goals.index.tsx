import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, Target, BarChart3, Sparkles } from "lucide-react";
import { goalCategoryLabel, goalProgress, goalStatusLabel, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals/")({
  component: GoalsList,
  head: () => ({
    meta: [
      { title: "Metas de Vida — Disciplina Absoluta" },
      { name: "description", content: "Defina metas de longo prazo e conecte cada tarefa ao seu propósito." },
      { property: "og:title", content: "Metas de Vida — Disciplina Absoluta" },
      { property: "og:description", content: "Defina metas de longo prazo e conecte cada tarefa ao seu propósito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function GoalsList() {
  const goals = useStore((s) => s.lifeGoals);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Início
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-heading font-extrabold uppercase">Metas de Vida</h1>
        <Link to="/goals/new" className="flex items-center gap-1 text-discipline text-xs font-bold">
          <Plus className="size-3" /> Nova
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/goals/impact" className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-2">
          <BarChart3 className="size-4 text-discipline" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Impacto</span>
        </Link>
        <Link to="/goals/assistant" className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-2">
          <Sparkles className="size-4 text-info" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Assistente</span>
        </Link>
      </div>

      {goals.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <Target className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Sem metas, tarefas viram rotina sem propósito. Crie sua primeira meta de vida.
          </p>
          <Link to="/goals/new" className="inline-flex items-center gap-2 bg-discipline text-black font-bold text-sm px-4 py-2 rounded-lg">
            Criar meta
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((g) => {
          const p = goalProgress(g, tasks, sessions);
          return (
            <Link
              key={g.id}
              to="/goals/$id"
              params={{ id: g.id }}
              className="block bg-surface border border-border rounded-2xl p-4 hover:border-discipline/40 transition"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                  {goalCategoryLabel[g.category]}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    g.priority === "alta"
                      ? "bg-struggle/20 text-struggle"
                      : g.priority === "media"
                        ? "bg-warning/20 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g.priority}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    g.status === "concluida"
                      ? "bg-discipline/20 text-discipline"
                      : g.status === "pausada"
                        ? "bg-muted text-muted-foreground"
                        : "bg-info/20 text-info"
                  }`}
                >
                  {goalStatusLabel[g.status]}
                </span>
              </div>
              <h2 className="font-heading font-bold text-base leading-tight">{g.name}</h2>
              {g.targetDate && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Prevista para {g.targetDate}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all"
                    style={{ width: `${Math.max(p.pct, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-heading font-black text-discipline tabular-nums">{p.pct}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {p.objectivesDone}/{p.objectivesTotal} objetivos · {p.linkedTasks} tarefas vinculadas · {p.completions} conclusões
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
