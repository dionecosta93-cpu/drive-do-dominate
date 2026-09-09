import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Play } from "lucide-react";
import { assistantSuggestions } from "@/lib/goal-assistant";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals/assistant")({
  component: Assistant,
  head: () => ({
    meta: [
      { title: "Assistente Inteligente — Disciplina Absoluta" },
      {
        name: "description",
        content: "Sugestões de prioridade, metas esquecidas e equilíbrio de vida.",
      },
      { property: "og:title", content: "Assistente Inteligente — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Sugestões de prioridade, metas esquecidas e equilíbrio de vida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const kindLabel = {
  prioridade: "Prioridade de hoje",
  "meta-esquecida": "Meta esquecida",
  "alto-impacto": "Alto impacto",
  equilibrio: "Equilíbrio",
} as const;

function Assistant() {
  const navigate = useNavigate();
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.lifeGoals);
  const suggestions = assistantSuggestions(tasks, sessions, goals);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/goals" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Metas
      </Link>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-1">Assistente</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Análise das suas tarefas, metas e histórico de execução.
      </p>

      {suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sem dados suficientes ainda. Cadastre metas e conclua tarefas para receber orientação.
        </p>
      )}

      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`border rounded-2xl p-4 flex gap-3 ${
              s.kind === "meta-esquecida"
                ? "bg-struggle/5 border-struggle/20"
                : "bg-info/5 border-info/20"
            }`}
          >
            <div className="shrink-0 size-9 rounded-full bg-info/15 grid place-items-center">
              <Sparkles className="size-4 text-info" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                {kindLabel[s.kind]}
              </p>
              <p className="text-sm font-medium leading-snug">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-1 text-pretty">
                {s.detail}
              </p>
              <div className="flex gap-2 mt-2">
                {s.taskId && (
                  <button
                    onClick={() =>
                      navigate({ to: "/focus/$taskId", params: { taskId: s.taskId! } })
                    }
                    className="inline-flex items-center gap-1 bg-discipline text-black text-[10px] font-bold uppercase px-2 py-1 rounded"
                  >
                    <Play className="size-3" fill="currentColor" /> Iniciar
                  </button>
                )}
                {s.goalId && (
                  <Link
                    to="/goals/$id"
                    params={{ id: s.goalId }}
                    className="inline-flex items-center border border-border text-[10px] font-bold uppercase px-2 py-1 rounded text-muted-foreground"
                  >
                    Ver meta
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
