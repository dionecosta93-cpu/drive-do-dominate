import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks/")({
  component: TasksList,
  head: () => ({
    meta: [
      { title: "Tarefas — Disciplina Absoluta" },
      {
        name: "description",
        content: "Gerencie suas tarefas diárias com propósito e consequência.",
      },
    ],
  }),
});

function TasksList() {
  const { tasks, removeTask } = useStore();
  return (
    <div className="px-5 pt-8 animate-rise">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-heading font-extrabold uppercase">Suas Missões</h1>
        <Link
          to="/tasks/new"
          className="flex items-center gap-1 bg-discipline text-black px-3 py-2 rounded-lg text-xs font-bold"
        >
          <Plus className="size-4" /> Nova
        </Link>
      </header>

      {tasks.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma tarefa cadastrada.</p>
      )}

      <div className="space-y-3">
        {tasks.map((t) => (
          <div key={t.id} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                  {t.time} · {t.category} · {t.priority}
                </span>
                <h3 className="font-heading font-bold text-lg leading-tight">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.estimatedMinutes} min · máx {t.maxMinutes} min · Dif. {t.difficulty}/10 ·{" "}
                  {t.repetition}
                </p>
              </div>
              <button
                onClick={() => {
                  removeTask(t.id);
                  toast("Tarefa removida.");
                }}
                className="text-muted-foreground hover:text-struggle p-1"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {(t.reward || t.consequence) && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {t.reward && (
                  <div className="bg-discipline/5 border border-discipline/10 rounded-lg p-2 text-[11px]">
                    <b className="text-discipline text-[9px] uppercase block mb-0.5">Recompensa</b>
                    {t.reward}
                  </div>
                )}
                {t.consequence && (
                  <div className="bg-struggle/5 border border-struggle/10 rounded-lg p-2 text-[11px]">
                    <b className="text-struggle text-[9px] uppercase block mb-0.5">Consequência</b>
                    {t.consequence}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
