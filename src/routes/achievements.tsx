import { createFileRoute } from "@tanstack/react-router";
import { useStore, xpToLevel } from "@/lib/store";
import { Lock, Trophy } from "lucide-react";

export const Route = createFileRoute("/achievements")({
  component: Achievements,
  head: () => ({ meta: [{ title: "Conquistas — Kairos" }, { name: "description", content: "Painel de evolução, XP, nível e medalhas desbloqueadas." }] }),
});

const list = [
  { id: "first_task", name: "Primeira Tarefa", desc: "Comece. É sempre o mais difícil." },
  { id: "first_week", name: "Primeira Semana", desc: "7 dias em sequência." },
  { id: "hundred_tasks", name: "Centurião", desc: "100 tarefas concluídas." },
  { id: "hundred_hours", name: "100 Horas de Foco", desc: "O tempo é sua moeda." },
  { id: "thirty_days", name: "30 Dias Consecutivos", desc: "Hábito instalado." },
  { id: "no_pauses", name: "Zero Pausas", desc: "Uma tarefa sem interrupção." },
  { id: "finished_early", name: "Antes do Tempo", desc: "Terminou antes do previsto." },
];

function Achievements() {
  const { achievements, xp, streak, sessions, longestStreak } = useStore();
  const unlocked = new Set(achievements.map((a) => a.id));
  const level = xpToLevel(xp);
  const totalHours = sessions.reduce((a, b) => a + b.spentSeconds / 3600, 0);

  return (
    <div className="px-5 pt-8 animate-rise">
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Painel de Evolução</h1>

      {/* Level card */}
      <div className="bg-gradient-to-br from-discipline/15 to-transparent border border-discipline/25 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-1">Nível atual</p>
            <p className="text-5xl font-heading font-black">{level.level}</p>
          </div>
          <Trophy className="size-8 text-discipline" />
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden mb-2">
          <div className="h-full bg-discipline shadow-[0_0_8px_rgba(34,197,94,0.6)]" style={{ width: `${(level.current / level.needed) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{level.current} / {level.needed} XP para o próximo nível</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Metric label="Disciplina" value={`${Math.min(100, streak * 3)}%`} />
        <Metric label="Constância" value={`${longestStreak}d`} />
        <Metric label="Produtividade" value={`${sessions.length}`} suffix="tarefas" />
        <Metric label="Tempo focado" value={`${totalHours.toFixed(1)}h`} />
      </div>

      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Medalhas</h2>
      <div className="space-y-3">
        {list.map((a) => {
          const has = unlocked.has(a.id);
          return (
            <div key={a.id} className={`flex items-center gap-4 border rounded-2xl p-4 ${has ? "bg-discipline/10 border-discipline/25" : "bg-surface border-border opacity-60"}`}>
              <div className={`size-12 rounded-full grid place-items-center ${has ? "bg-discipline/20" : "bg-muted"}`}>
                {has ? <Trophy className="size-5 text-discipline" /> : <Lock className="size-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-heading font-bold text-sm">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-heading font-black">
        {value} {suffix && <span className="text-[10px] text-muted-foreground font-medium">{suffix}</span>}
      </p>
    </div>
  );
}
