import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { readingGoalLabel, readingGoalProgress, readingStats, useStore, type ReadingGoalKind } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reading/goals")({
  component: ReadingGoals,
  head: () => ({
    meta: [
      { title: "Metas de leitura — Disciplina Absoluta" },
      { name: "description", content: "Defina metas de livros por ano, páginas e minutos por dia." },
      { property: "og:title", content: "Metas de leitura — Disciplina Absoluta" },
      { property: "og:description", content: "Defina metas de livros por ano, páginas e minutos por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const kinds: ReadingGoalKind[] = ["livros-ano", "paginas-dia", "minutos-dia", "horas-semana"];

function ReadingGoals() {
  const goals = useStore((s) => s.readingGoals);
  const books = useStore((s) => s.books);
  const sessions = useStore((s) => s.readingSessions);
  const addGoal = useStore((s) => s.addReadingGoal);
  const removeGoal = useStore((s) => s.removeReadingGoal);
  const [kind, setKind] = useState<ReadingGoalKind>("livros-ano");
  const [target, setTarget] = useState("");
  const st = readingStats(books, sessions);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/reading" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Leitura
      </Link>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Metas de Leitura</h1>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition ${
                kind === k ? "bg-discipline text-black border-discipline" : "bg-background border-border text-muted-foreground"
              }`}
            >
              {readingGoalLabel[k]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="numeric"
            placeholder="Quantidade"
            className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline"
          />
          <button
            onClick={() => {
              const n = Number(target);
              if (!n) return;
              addGoal({ kind, target: n });
              setTarget("");
              toast.success("Meta criada.");
            }}
            className="px-4 rounded-xl bg-discipline text-black font-bold"
            aria-label="Criar meta"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {goals.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma meta ainda. Defina um alvo e transforme leitura em hábito.</p>
      )}

      <div className="space-y-3">
        {goals.map((g) => {
          const p = readingGoalProgress(g, st);
          return (
            <div key={g.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-heading font-bold">
                  {g.target} {readingGoalLabel[g.kind]}
                </p>
                <button onClick={() => removeGoal(g.id)} className="text-muted-foreground hover:text-struggle" aria-label="Remover meta">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all" style={{ width: `${Math.max(p.pct, 2)}%` }} />
                </div>
                <span className="text-xs font-heading font-black text-discipline tabular-nums">{p.pct}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {p.current} de {g.target}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
