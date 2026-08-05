import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { buildMissions, type Mission } from "@/lib/missions";
import { toast } from "sonner";
import { ChevronLeft, Plus, Swords, Trash2, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/missions")({
  component: MissionsPage,
  head: () => ({
    meta: [
      { title: "Missões e Desafios — Disciplina Absoluta" },
      { name: "description", content: "Missões diárias, semanais e mensais com recompensas de XP e disciplina." },
      { property: "og:title", content: "Missões e Desafios" },
      { property: "og:description", content: "Cumpra missões e crie desafios pessoais para manter a disciplina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MissionsPage() {
  const { tasks, sessions, claimedMissions, claimMission, addDiscipline, challenges, addChallenge, toggleChallenge, removeChallenge } =
    useStore();
  const missions = useMemo(() => buildMissions(tasks, sessions), [tasks, sessions]);
  const [newChallenge, setNewChallenge] = useState("");

  const groups: { kind: Mission["kind"]; label: string }[] = [
    { kind: "diaria", label: "Diárias" },
    { kind: "semanal", label: "Semanais" },
    { kind: "mensal", label: "Mensais" },
  ];

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-1">Missões</h1>
      <p className="text-xs text-muted-foreground mb-6">Complete objetivos e resgate XP e pontos de disciplina.</p>

      {groups.map((g) => (
        <section key={g.kind} className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{g.label}</h2>
          <div className="space-y-3">
            {missions
              .filter((m) => m.kind === g.kind)
              .map((m) => {
                const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                const complete = m.progress >= m.target;
                const claimed = claimedMissions.includes(m.id);
                return (
                  <div key={m.id} className="bg-surface border border-border rounded-2xl p-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="text-sm font-bold leading-tight">{m.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {Math.min(m.progress, m.target)}/{m.target}
                      </span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-discipline transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        +{m.xp} XP · +{m.discipline} disciplina
                      </span>
                      {claimed ? (
                        <span className="text-[10px] font-bold text-discipline uppercase">Resgatada</span>
                      ) : (
                        <button
                          disabled={!complete}
                          onClick={() => {
                            claimMission(m.id);
                            useStore.setState((st) => ({ xp: st.xp + m.xp }));
                            addDiscipline(m.discipline, `Missão: ${m.name}`);
                            toast.success(`Missão cumprida. +${m.xp} XP`);
                          }}
                          className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-discipline text-black disabled:opacity-25"
                        >
                          Resgatar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      <section>
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          <Swords className="size-4" /> Desafios pessoais
        </h2>
        <div className="flex gap-2 mb-3">
          <input
            value={newChallenge}
            onChange={(e) => setNewChallenge(e.target.value)}
            placeholder="Ex.: 7 dias sem procrastinar"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-discipline"
          />
          <button
            onClick={() => {
              if (!newChallenge.trim()) return;
              addChallenge({ name: newChallenge.trim(), kind: "pessoal" });
              setNewChallenge("");
            }}
            className="px-4 rounded-xl bg-discipline text-black"
            aria-label="Adicionar desafio"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="space-y-2">
          {challenges.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum desafio criado ainda.</p>
          )}
          {challenges.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
              <button
                onClick={() => toggleChallenge(c.id)}
                className={`size-6 rounded-md grid place-items-center border ${
                  c.done ? "bg-discipline border-discipline text-black" : "border-border text-transparent"
                }`}
                aria-label="Concluir desafio"
              >
                <Check className="size-4" />
              </button>
              <span className={`flex-1 text-sm ${c.done ? "line-through text-muted-foreground" : ""}`}>{c.name}</span>
              <button onClick={() => removeChallenge(c.id)} className="text-muted-foreground hover:text-struggle">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
