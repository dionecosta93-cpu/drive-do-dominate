import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { GoalForm } from "@/components/goal-form";
import {
  goalCategoryLabel,
  goalProgress,
  goalSessions,
  goalStatusLabel,
  useStore,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals/$id")({
  component: GoalDetail,
  head: () => ({
    meta: [
      { title: "Meta — Disciplina Absoluta" },
      {
        name: "description",
        content: "Objetivos, tarefas vinculadas e progresso desta meta de vida.",
      },
      { property: "og:title", content: "Meta — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Objetivos, tarefas vinculadas e progresso desta meta de vida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function GoalDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const goal = useStore((s) => s.lifeGoals.find((g) => g.id === id));
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const updateLifeGoal = useStore((s) => s.updateLifeGoal);
  const removeLifeGoal = useStore((s) => s.removeLifeGoal);
  const addObjective = useStore((s) => s.addObjective);
  const toggleObjective = useStore((s) => s.toggleObjective);
  const removeObjective = useStore((s) => s.removeObjective);
  const [objName, setObjName] = useState("");
  const [editing, setEditing] = useState(false);

  if (!goal) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">Meta não encontrada.</p>
      </div>
    );
  }

  const p = goalProgress(goal, tasks, sessions);
  const linked = tasks.filter((t) => t.goalId === goal.id);
  const done = goalSessions(goal, tasks, sessions).length;

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/goals" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Metas
      </Link>

      {editing ? (
        <>
          <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Editar Meta</h1>
          <GoalForm
            initial={goal}
            submitLabel="SALVAR"
            onCancel={() => setEditing(false)}
            onSubmit={(values) => {
              updateLifeGoal(goal.id, values);
              setEditing(false);
              toast.success("Meta atualizada.");
            }}
          />
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-heading font-extrabold uppercase leading-tight">
              {goal.name}
            </h1>
            <button
              onClick={() => setEditing(true)}
              className="size-9 shrink-0 grid place-items-center rounded-lg border border-border text-muted-foreground hover:text-discipline hover:border-discipline/40 transition"
              aria-label="Editar meta"
            >
              <Pencil className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              {goalCategoryLabel[goal.category]}
            </span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-info/20 text-info">
              {goalStatusLabel[goal.status]}
            </span>
            {goal.targetDate && (
              <span className="text-[9px] font-mono text-muted-foreground">
                até {goal.targetDate}
              </span>
            )}
          </div>

          {goal.description && (
            <p className="text-sm text-muted-foreground mb-4 text-pretty">{goal.description}</p>
          )}

          {goal.motivation && (
            <div className="bg-discipline/5 border border-discipline/20 rounded-2xl p-4 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-1">
                Motivação
              </p>
              <p className="text-sm text-pretty">{goal.motivation}</p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Progresso
              </span>
              <span className="font-heading font-black text-xl text-discipline tabular-nums">
                {p.pct}%
              </span>
            </div>
            <div className="h-3 w-full bg-surface rounded-full p-0.5">
              <div
                className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all duration-700"
                style={{ width: `${Math.max(p.pct, 3)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {done} tarefas concluídas para esta meta · {linked.length} tarefas vinculadas
            </p>
          </div>

          {/* Objetivos */}
          <section className="mb-6">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Objetivos
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                value={objName}
                onChange={(e) => setObjName(e.target.value)}
                placeholder="Ex.: Aprender marketing"
                className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-discipline"
              />
              <button
                onClick={() => {
                  if (!objName.trim()) return;
                  addObjective(goal.id, objName.trim());
                  setObjName("");
                }}
                className="px-3 rounded-xl bg-discipline text-black font-bold text-xs"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {goal.objectives.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum objetivo ainda. Quebre a meta em passos concretos.
              </p>
            )}
            <div className="space-y-2">
              {goal.objectives.map((o) => {
                const objTasks = tasks.filter((t) => t.objectiveId === o.id);
                return (
                  <div
                    key={o.id}
                    className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3"
                  >
                    <button
                      onClick={() => toggleObjective(goal.id, o.id)}
                      className={`size-6 shrink-0 rounded-md border grid place-items-center ${
                        o.done
                          ? "bg-discipline border-discipline text-black"
                          : "border-border text-transparent"
                      }`}
                      aria-label="Concluir objetivo"
                    >
                      <Check className="size-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${o.done ? "line-through text-muted-foreground" : ""}`}
                      >
                        {o.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {objTasks.length} tarefas ligadas
                      </p>
                    </div>
                    <button
                      onClick={() => removeObjective(goal.id, o.id)}
                      className="text-muted-foreground hover:text-struggle"
                      aria-label="Remover objetivo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tarefas vinculadas */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Tarefas vinculadas
              </h2>
              <Link
                to="/tasks/new"
                className="text-discipline text-xs font-bold flex items-center gap-1"
              >
                <Plus className="size-3" /> Nova
              </Link>
            </div>
            {linked.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhuma tarefa aponta para esta meta. Vincule tarefas ao criar ou editar uma missão.
              </p>
            )}
            <div className="space-y-2">
              {linked.map((t) => (
                <Link
                  key={t.id}
                  to="/tasks/$id/edit"
                  params={{ id: t.id }}
                  className="block bg-surface border border-border rounded-xl p-3 hover:border-discipline/40 transition"
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.time} · {t.category} · {t.repetition}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <button
            onClick={() => {
              removeLifeGoal(goal.id);
              toast.success("Meta removida.");
              navigate({ to: "/goals" });
            }}
            className="w-full py-3 border border-struggle/30 text-struggle text-xs font-bold uppercase rounded-xl hover:bg-struggle/10 transition"
          >
            Excluir meta
          </button>
        </>
      )}
    </div>
  );
}
