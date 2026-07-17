import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, xpToLevel, todaysTasks } from "@/lib/store";
import { startQuotes, dailyMissions, pickDaily } from "@/lib/quotes";
import { generateInsight } from "@/lib/insights";
import { Flame, Play, Plus, Sparkles, Target, Trophy, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const onboarded = useStore((s) => s.onboarded);
  return onboarded ? <Dashboard /> : <Onboarding />;
}

function Onboarding() {
  const { setUserName, setOnboarded } = useStore();
  const [nameInput, setNameInput] = useState("");
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
      <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-discipline">Kairos</div>
      <h1 className="text-4xl font-heading font-black leading-tight mb-4">
        Chegou a hora de <span className="text-discipline">parar de adiar</span>.
      </h1>
      <p className="text-muted-foreground text-sm mb-8 text-pretty">
        Como você quer ser chamado? A disciplina começa pelo compromisso com seu próprio nome.
      </p>
      <input
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        placeholder="Seu nome"
        className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-lg font-medium mb-4 focus:outline-none focus:border-discipline"
      />
      <button
        disabled={!nameInput.trim()}
        onClick={() => {
          setUserName(nameInput.trim());
          setOnboarded(true);
          toast.success("Bem-vindo. Sua jornada começa agora.");
        }}
        className="w-full py-5 bg-white text-black font-heading font-black text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-30"
      >
        COMEÇAR
      </button>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const {
    userName, tasks, sessions, xp, streak, completedToday, tickDay,
    dailyMissionCompleted, markDailyMission,
  } = useStore();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    tickDay();
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, [tickDay]);

  const quote = useMemo(() => pickDaily(startQuotes), []);
  const insight = useMemo(() => generateInsight(sessions, tasks), [sessions, tasks]);
  const mission = useMemo(() => pickDaily(dailyMissions), []);

  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTasks = useMemo(
    () => todaysTasks(tasks, todayKey).slice().sort((a, b) => a.time.localeCompare(b.time)),
    [tasks, todayKey],
  );
  const done = todayTasks.filter((t) => completedToday.includes(t.id)).length;
  const total = Math.max(todayTasks.length, 1);
  const progress = Math.round((done / total) * 100);

  const level = xpToLevel(xp);
  const missionDone = dailyMissionCompleted === todayKey;

  const nextTask = todayTasks.find((t) => !completedToday.includes(t.id));


  return (
    <div className="px-5 pt-8">
      {/* Header */}
      <header className="flex justify-between items-start mb-8 animate-rise">
        <div>
          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-1">
            {dateStr} · {timeStr}
          </p>
          <h1 className="text-2xl font-heading font-extrabold tracking-tight uppercase">
            {greeting}, {userName || "atleta"}.
          </h1>
        </div>
        <Link
          to="/achievements"
          className="flex items-center gap-2 bg-discipline/10 border border-discipline/25 px-3 py-1.5 rounded-full"
        >
          <span className="text-discipline font-bold text-xs">NÍVEL {level.level}</span>
          <div className="w-8 h-1.5 bg-discipline/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-discipline shadow-[0_0_8px_rgba(34,197,94,0.6)]"
              style={{ width: `${(level.current / level.needed) * 100}%` }}
            />
          </div>
        </Link>
      </header>

      {/* Progress + Quote */}
      <section className="mb-8 animate-rise" style={{ animationDelay: "60ms" }}>
        <div className="flex justify-between items-end mb-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Progresso do Dia</span>
          <span className="font-heading font-black text-xl text-discipline tabular-nums">{progress}%</span>
        </div>
        <div className="h-4 w-full bg-surface rounded-full p-1">
          <div
            className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all duration-1000 relative overflow-hidden"
            style={{ width: `${Math.max(progress, 4)}%`, boxShadow: "0 0 14px rgba(34,197,94,0.35)" }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)] animate-[shimmer_2.5s_infinite]" />
          </div>
        </div>
        <p className="mt-4 text-center italic text-muted-foreground text-sm leading-relaxed px-4 text-pretty">
          "{quote}"
        </p>
      </section>

      {/* Primary CTA */}
      <button
        onClick={() => {
          if (nextTask) navigate({ to: "/focus/$taskId", params: { taskId: nextTask.id } });
          else navigate({ to: "/tasks/new" });
        }}
        className="w-full py-6 bg-white text-black font-heading font-black text-xl rounded-2xl mb-8 active:scale-[0.98] transition-transform shadow-xl shadow-white/5 animate-rise flex items-center justify-center gap-3"
        style={{ animationDelay: "120ms" }}
      >
        <Play className="size-6" fill="currentColor" />
        {nextTask ? "COMEÇAR O DIA" : "CADASTRAR PRIMEIRA TAREFA"}
      </button>

      {/* Streak */}
      {streak > 0 && (
        <div className="mb-8 bg-gradient-to-br from-warning/10 to-struggle/5 border border-warning/20 rounded-2xl p-4 flex items-center gap-4 animate-rise" style={{ animationDelay: "180ms" }}>
          <div className="size-12 rounded-full bg-warning/20 grid place-items-center">
            <Flame className="size-6 text-warning" fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-warning mb-0.5">Sequência ativa</p>
            <p className="text-lg font-heading font-black">{streak} {streak === 1 ? "dia cumprindo" : "dias cumprindo"}</p>
          </div>
          {done === 0 && (
            <span className="text-[10px] text-struggle font-bold text-right max-w-[110px] leading-tight">
              Falta apenas uma tarefa para manter sua sequência.
            </span>
          )}
        </div>
      )}

      {/* Task list */}
      <section className="mb-8 animate-rise" style={{ animationDelay: "220ms" }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Missões de Hoje</h2>
          <Link to="/tasks/new" className="flex items-center gap-1 text-discipline text-xs font-bold">
            <Plus className="size-3" /> Nova
          </Link>
        </div>

        {todayTasks.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center">
            <Target className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhuma tarefa. Sem tarefa, sem vitória.</p>
            <Link to="/tasks/new" className="inline-flex items-center gap-2 bg-discipline text-black font-bold text-sm px-4 py-2 rounded-lg">
              Cadastrar tarefa
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {todayTasks.map((t) => {
            const isDone = completedToday.includes(t.id);
            return (
              <div
                key={t.id}
                className={`bg-surface border rounded-2xl p-4 ${isDone ? "border-discipline/30 opacity-60" : "border-border"}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono font-bold tracking-widest text-discipline">{t.time}</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{t.category}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        t.priority === "alta" ? "bg-struggle/20 text-struggle" :
                        t.priority === "media" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                      }`}>{t.priority}</span>
                      {!!t.rolloverCount && !isDone && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-struggle/15 text-struggle border border-struggle/30">
                          ↻ adiada {t.rolloverCount}x
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-heading font-bold leading-tight truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.estimatedMinutes} min · Dif. {t.difficulty}/10
                    </p>
                  </div>
                  {isDone ? (
                    <span className="text-[10px] font-bold text-discipline uppercase">Feito</span>
                  ) : (
                    <button
                      onClick={() => navigate({ to: "/focus/$taskId", params: { taskId: t.id } })}
                      className="bg-discipline text-black rounded-lg p-2 active:scale-95 transition-transform"
                    >
                      <Play className="size-4" fill="currentColor" />
                    </button>
                  )}
                </div>
                {(t.reward || t.consequence) && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {t.reward && (
                      <div className="bg-discipline/5 border border-discipline/10 rounded-lg p-2">
                        <p className="text-[9px] font-bold uppercase text-discipline/70 mb-0.5">Recompensa</p>
                        <p className="text-[11px] leading-tight line-clamp-2">{t.reward}</p>
                      </div>
                    )}
                    {t.consequence && (
                      <div className="bg-struggle/5 border border-struggle/10 rounded-lg p-2">
                        <p className="text-[9px] font-bold uppercase text-struggle/70 mb-0.5">Consequência</p>
                        <p className="text-[11px] leading-tight line-clamp-2">{t.consequence}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Insight */}
      {insight && (
        <div className="bg-info/10 border border-info/20 rounded-2xl p-4 mb-6 flex gap-3 animate-rise" style={{ animationDelay: "260ms" }}>
          <div className="shrink-0 size-10 bg-info/20 rounded-full grid place-items-center">
            <Sparkles className="size-4 text-info" />
          </div>
          <div>
            <p className="text-info text-[10px] font-bold uppercase tracking-wider mb-1">Analista IA</p>
            <p className="text-xs text-info/90 leading-snug text-pretty">{insight}</p>
          </div>
        </div>
      )}

      {/* Daily Mission */}
      <div className="bg-surface border border-border rounded-2xl p-4 mb-6 animate-rise" style={{ animationDelay: "300ms" }}>
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-discipline">Missão do Dia</p>
          {missionDone && <span className="text-[10px] font-bold text-discipline">✓ CONCLUÍDA</span>}
        </div>
        <p className="text-sm font-medium mb-3 text-pretty">{mission}</p>
        {!missionDone && (
          <button
            onClick={() => { markDailyMission(); toast.success("Missão cumprida. +50 XP mental."); }}
            className="w-full py-2 border border-discipline/30 text-discipline text-xs font-bold uppercase rounded-lg hover:bg-discipline/10 transition"
          >
            Marcar como feita
          </button>
        )}
      </div>

      {/* Stats peek */}
      <div className="grid grid-cols-2 gap-3 mb-4 animate-rise" style={{ animationDelay: "340ms" }}>
        <Link to="/stats" className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-2xl font-heading font-black mb-1">{streak}</div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Dias em sequência</p>
        </Link>
        <Link to="/stats" className="bg-surface p-4 rounded-2xl border border-border">
          <div className="text-2xl font-heading font-black text-discipline mb-1">{sessions.length}</div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Tarefas concluídas</p>
        </Link>
      </div>

      <Link to="/achievements" className="flex items-center justify-between bg-surface border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="size-5 text-warning" />
          <span className="text-sm font-bold">Conquistas & Evolução</span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
