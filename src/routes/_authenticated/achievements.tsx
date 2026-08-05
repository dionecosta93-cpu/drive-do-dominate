import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore, xpToLevel } from "@/lib/store";
import { ACHIEVEMENTS, type Rarity } from "@/lib/achievements";
import { DisciplineBar } from "@/components/discipline-bar";
import { Lock, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({
  component: Achievements,
  head: () => ({
    meta: [
      { title: "Conquistas e Placas — Disciplina Absoluta" },
      { name: "description", content: "Painel de evolução com XP, nível, disciplina e placas digitais desbloqueáveis." },
      { property: "og:title", content: "Conquistas e Placas Digitais" },
      { property: "og:description", content: "Desbloqueie medalhas comuns, raras, épicas e lendárias pela sua disciplina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const rarityStyle: Record<Rarity, { label: string; border: string; bg: string; text: string }> = {
  comum: { label: "Comum", border: "border-border", bg: "bg-surface", text: "text-muted-foreground" },
  raro: { label: "Raro", border: "border-info/40", bg: "bg-info/10", text: "text-info" },
  epico: { label: "Épico", border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-400" },
  lendario: { label: "Lendário", border: "border-warning/50", bg: "bg-warning/10", text: "text-warning" },
};

function Achievements() {
  const { achievements, xp, streak, sessions, longestStreak, syncAchievements } = useStore();
  useEffect(() => { syncAchievements(); }, [syncAchievements]);

  const unlocked = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const level = xpToLevel(xp);
  const totalHours = sessions.reduce((a, b) => a + b.spentSeconds / 3600, 0);
  const order: Rarity[] = ["lendario", "epico", "raro", "comum"];

  return (
    <div className="px-5 pt-8 pb-24 animate-rise">
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Painel de Evolução</h1>

      <div className="bg-gradient-to-br from-discipline/15 to-transparent border border-discipline/25 rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-1">Nível atual</p>
            <p className="text-5xl font-heading font-black">{level.level}</p>
          </div>
          <Trophy className="size-8 text-discipline" />
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-discipline shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all duration-700"
            style={{ width: `${(level.current / level.needed) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{level.current} / {level.needed} XP para o próximo nível</p>
      </div>

      <div className="mb-6">
        <DisciplineBar />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Metric label="Sequência atual" value={`${streak}d`} />
        <Metric label="Melhor sequência" value={`${longestStreak}d`} />
        <Metric label="Produtividade" value={`${sessions.length}`} suffix="tarefas" />
        <Metric label="Tempo focado" value={`${totalHours.toFixed(1)}h`} />
      </div>

      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Placas digitais · {unlocked.size}/{ACHIEVEMENTS.length}
      </h2>
      <div className="space-y-3">
        {order.flatMap((rar) =>
          ACHIEVEMENTS.filter((a) => a.rarity === rar).map((a) => {
            const has = unlocked.has(a.id);
            const st = rarityStyle[a.rarity];
            return (
              <div
                key={a.id}
                className={`flex items-center gap-4 border rounded-2xl p-4 ${
                  has ? `${st.bg} ${st.border}` : "bg-surface border-border opacity-50"
                }`}
              >
                <div className={`size-12 rounded-full grid place-items-center text-xl ${has ? st.bg : "bg-muted"}`}>
                  {has ? a.icon : <Lock className="size-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-bold text-sm truncate">{a.name}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${st.text}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{a.desc}</p>
                </div>
              </div>
            );
          }),
        )}
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
