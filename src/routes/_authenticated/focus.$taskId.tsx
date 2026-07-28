import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dateKey, taskCompletedOn, useStore, todaysTasks } from "@/lib/store";
import { randomStartQuote } from "@/lib/quotes";
import { saveTaskOccurrence } from "@/lib/task-occurrences";
import { pickFocusCoachLine } from "@/lib/focus-coach";
import { Pause, Play, Check, X, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/focus/$taskId")({
  component: FocusMode,
});

type Phase = "breathe" | "quote" | "running" | "paused" | "done";

function FocusMode() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { tasks, sessions, completeSession, addReflection } = useStore();
  const task = tasks.find((t) => t.id === taskId);
  const todayKey = dateKey();
  const nextTask = useMemo(() => {
    const list = todaysTasks(tasks, todayKey).slice().sort((a, b) => a.time.localeCompare(b.time));
    return list.find((t) => t.id !== taskId && !taskCompletedOn(t.id, sessions, todayKey));
  }, [tasks, taskId, sessions, todayKey]);

  const [phase, setPhase] = useState<Phase>("breathe");
  const [breatheLeft, setBreatheLeft] = useState(5);
  const quote = useMemo(() => randomStartQuote(), []);
  const [elapsed, setElapsed] = useState(0);
  const [pauses, setPauses] = useState(0);
  const [pauseAsking, setPauseAsking] = useState(false);
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);
  const [session, setSession] = useState<null | ReturnType<typeof completeSession>>(null);
  const [feeling, setFeeling] = useState("");
  const [reflection, setReflection] = useState("");
  const [nudged, setNudged] = useState(false);
  const [coachMuted, setCoachMuted] = useState(false);
  const [lastCoachLine, setLastCoachLine] = useState<string | null>(null);
  const lastCoachMinute = useRef(0);
  const coachLastLine = useRef<string | undefined>(undefined);
  const coachAudioRef = useRef<HTMLAudioElement | null>(null);
  const coachMutedRef = useRef(false);
  useEffect(() => { coachMutedRef.current = coachMuted; }, [coachMuted]);

  const speakCoach = useCallback(async (line: string) => {
    if (coachMutedRef.current) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (coachAudioRef.current) {
        try { coachAudioRef.current.pause(); } catch { /* ignore */ }
      }
      const audio = new Audio(url);
      audio.volume = 0.95;
      coachAudioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      if (coachMutedRef.current) return;
      await audio.play().catch(() => { /* autoplay blocked */ });
    } catch { /* ignore network */ }
  }, []);


  useEffect(() => {
    if (phase !== "breathe") return;
    if (breatheLeft <= 0) { setPhase("quote"); return; }
    const t = setTimeout(() => setBreatheLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, breatheLeft]);

  useEffect(() => {
    if (phase !== "running") return;
    startedAt.current = Date.now();
    const t = setInterval(() => {
      setElapsed(accumulated.current + Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  // 5-min nudge if barely started
  useEffect(() => {
    if (phase === "running" && elapsed >= 300 && !nudged) {
      setNudged(true);
      toast("Você já começou. Continue mais um pouco.", { duration: 5000 });
    }
  }, [elapsed, phase, nudged]);

  // AI coach voice: every minute of focused work, speak an impactful line.
  useEffect(() => {
    if (phase !== "running") return;
    const minute = Math.floor(elapsed / 60);
    if (minute <= 0 || minute === lastCoachMinute.current) return;
    lastCoachMinute.current = minute;
    const line = pickFocusCoachLine(coachLastLine.current);
    coachLastLine.current = line;
    setLastCoachLine(line);
    void speakCoach(line);
  }, [elapsed, phase, speakCoach]);

  // Stop coach audio when leaving running phase or unmounting.
  useEffect(() => {
    if (phase === "running") return;
    if (coachAudioRef.current) {
      try { coachAudioRef.current.pause(); } catch { /* ignore */ }
      coachAudioRef.current = null;
    }
  }, [phase]);

  useEffect(() => () => {
    if (coachAudioRef.current) {
      try { coachAudioRef.current.pause(); } catch { /* ignore */ }
    }
  }, []);



  if (!task) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-muted-foreground mb-4">Tarefa não encontrada.</p>
          <button onClick={() => navigate({ to: "/" })} className="bg-white text-black px-4 py-2 rounded-lg font-bold">Início</button>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };
  const estimatedSec = task.estimatedMinutes * 60;
  const progress = Math.min(100, (elapsed / estimatedSec) * 100);
  const over = elapsed > estimatedSec;

  const pauseNow = () => {
    if (startedAt.current) {
      accumulated.current += Math.floor((Date.now() - startedAt.current) / 1000);
      startedAt.current = null;
    }
    setPauses((p) => p + 1);
    setPhase("paused");
    setPauseAsking(false);
  };

  const complete = () => {
    if (startedAt.current) {
      accumulated.current += Math.floor((Date.now() - startedAt.current) / 1000);
      startedAt.current = null;
    }
    const spent = accumulated.current;
    const s = completeSession({
      taskId: task.id, taskName: task.name, category: task.category,
      difficulty: task.difficulty, estimatedMinutes: task.estimatedMinutes,
      spentSeconds: spent, pauses,
    });
    void saveTaskOccurrence(s);
    setSession(s);
    setPhase("done");
    // Victory sound
    try {
      const AC = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = f;
        o.type = "triangle";
        o.connect(g); g.connect(ac.destination);
        const start = ac.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.25, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        o.start(start); o.stop(start + 0.4);
      });
    } catch { /* ignore */ }
  };

  // BREATHE
  if (phase === "breathe") {
    return (
      <FullScreen>
        <div className="text-center">
          <p className="text-discipline text-[10px] font-bold tracking-[0.4em] uppercase mb-8">Respire fundo</p>
          <div className="relative mx-auto size-56 grid place-items-center mb-10">
            <div className="absolute inset-0 rounded-full border-2 border-discipline/30 animate-breathe" />
            <div className="absolute inset-6 rounded-full border border-discipline/20 animate-breathe" style={{ animationDelay: "0.6s" }} />
            <span className="text-7xl font-heading font-black tabular-nums">{breatheLeft}</span>
          </div>
          <h2 className="text-xl font-heading font-bold uppercase mb-2">{task.name}</h2>
          <p className="text-sm text-muted-foreground">{task.estimatedMinutes} minutos previstos</p>
          {linkedGoal && (
            <div className="mt-6 mx-auto max-w-xs bg-discipline/5 border border-discipline/20 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-1">
                Por que esta tarefa é importante?
              </p>
              <p className="text-xs text-pretty">
                Ela te aproxima da meta "{linkedGoal.name}".{linkedGoal.motivation ? ` ${linkedGoal.motivation}` : ""}
              </p>
            </div>
          )}
        </div>
      </FullScreen>
    );
  }

  // QUOTE
  if (phase === "quote") {
    return (
      <FullScreen>
        <div className="text-center max-w-sm">
          <h4 className="text-2xl md:text-3xl font-heading font-black leading-tight mb-10 text-pretty">"{quote}"</h4>
          <div className="w-16 h-1 bg-discipline mx-auto rounded-full mb-12 animate-pulse-glow" />
          <button
            onClick={() => setPhase("running")}
            className="px-10 py-5 bg-discipline text-black rounded-full font-heading font-black text-base tracking-widest uppercase active:scale-95 transition-transform"
          >
            Começar agora
          </button>
        </div>
      </FullScreen>
    );
  }

  // DONE
  if (phase === "done" && session) {
    const efficiency = session.spentSeconds > 0
      ? Math.round((task.estimatedMinutes * 60 / session.spentSeconds) * 100)
      : 100;
    return (
      <FullScreen>
        <div className="text-center max-w-sm w-full animate-victory">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-heading font-black uppercase mb-3">Parabéns.</h2>
          <p className="text-sm text-muted-foreground mb-8 text-pretty">
            Você cumpriu sua palavra. Cada tarefa concluída fortalece sua disciplina.
          </p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <Stat label="Previsto" value={`${task.estimatedMinutes}m`} />
            <Stat label="Gasto" value={fmt(session.spentSeconds)} />
            <Stat label="Eficiência" value={`${efficiency}%`} color={efficiency >= 100 ? "text-discipline" : "text-warning"} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Stat label="XP ganho" value={`+${session.xp}`} color="text-discipline" />
            <Stat label="Pausas" value={String(session.pauses)} color={session.pauses > 0 ? "text-warning" : "text-discipline"} />
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 mb-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cofre da Vitória</p>
            <input
              placeholder="Como se sentiu?"
              value={feeling} onChange={(e) => setFeeling(e.target.value)}
              className="w-full bg-transparent border-b border-border py-2 mb-2 focus:outline-none focus:border-discipline text-sm"
            />
            <textarea
              placeholder="O que aprendeu?"
              value={reflection} onChange={(e) => setReflection(e.target.value)} rows={2}
              className="w-full bg-transparent border-b border-border py-2 focus:outline-none focus:border-discipline resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            {nextTask && (
              <button
                onClick={() => {
                  if (feeling || reflection) addReflection(session.id, feeling, reflection);
                  navigate({ to: "/focus/$taskId", params: { taskId: nextTask.id } });
                }}
                className="w-full py-4 bg-discipline text-black font-heading font-black text-base rounded-2xl active:scale-[0.98] transition-transform"
              >
                PRÓXIMA MISSÃO →
              </button>
            )}
            <button
              onClick={() => {
                if (feeling || reflection) addReflection(session.id, feeling, reflection);
                navigate({ to: "/" });
              }}
              className="w-full py-4 bg-white text-black font-heading font-black text-base rounded-2xl active:scale-[0.98] transition-transform"
            >
              {nextTask ? "VOLTAR AO PAINEL" : "DIA CONCLUÍDO"}
            </button>
          </div>
        </div>
      </FullScreen>
    );
  }

  // RUNNING / PAUSED
  return (
    <FullScreen>
      <div className="absolute top-6 left-0 right-0 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Modo Foco</p>
        <p className="text-sm font-heading font-bold mt-1 truncate px-8">{task.name}</p>
      </div>

      <div className="text-center">
        <div className={`text-[88px] leading-none font-heading font-black tabular-nums mb-3 ${over ? "text-struggle" : "text-white"}`}>
          {fmt(elapsed)}
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {over ? `+${fmt(elapsed - estimatedSec)} acima` : `de ${fmt(estimatedSec)}`}
        </p>
        <div className="w-64 h-1 bg-surface rounded-full mt-6 mx-auto overflow-hidden">
          <div
            className={`h-full ${over ? "bg-struggle" : "bg-discipline"} transition-all duration-500`}
            style={{ width: `${progress}%`, boxShadow: over ? "0 0 8px #ef4444" : "0 0 8px #22c55e" }}
          />
        </div>
        {pauses > 0 && (
          <p className="mt-4 text-[10px] font-mono text-warning uppercase">Pausas: {pauses}</p>
        )}
        {lastCoachLine && (
          <p className="mt-6 max-w-xs mx-auto text-sm font-heading italic text-discipline/90 text-pretty px-4">
            "{lastCoachLine}"
          </p>
        )}
      </div>


      <div className="absolute bottom-8 inset-x-0 px-6 space-y-3">
        <button
          onClick={complete}
          className="w-full py-5 bg-discipline text-black font-heading font-black text-base rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Check className="size-5" /> CONCLUIR
        </button>
        {phase === "running" ? (
          <button
            onClick={() => setPauseAsking(true)}
            className="w-full py-4 border border-border text-muted-foreground font-bold text-sm rounded-2xl uppercase"
          >
            <Pause className="size-4 inline mr-2" /> Pausar
          </button>
        ) : (
          <button
            onClick={() => setPhase("running")}
            className="w-full py-4 border border-discipline/40 text-discipline font-bold text-sm rounded-2xl uppercase"
          >
            <Play className="size-4 inline mr-2" /> Retomar
          </button>
        )}
      </div>

      {pauseAsking && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-xl grid place-items-center px-6 z-10">
          <div className="w-full max-w-sm text-center">
            <h3 className="text-2xl font-heading font-black mb-3 text-pretty">
              O motivo é realmente importante?
            </h3>
            <p className="text-sm text-muted-foreground mb-8">
              Cada pausa é registrada. Sua disciplina te observa.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setPauseAsking(false)}
                className="w-full py-4 bg-discipline text-black font-bold rounded-xl uppercase"
              >
                Continuar
              </button>
              <button
                onClick={pauseNow}
                className="w-full py-4 border border-struggle/40 text-struggle font-bold rounded-xl uppercase text-sm"
              >
                Pausar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setCoachMuted((m) => {
            const next = !m;
            if (next && coachAudioRef.current) {
              try { coachAudioRef.current.pause(); } catch { /* ignore */ }
            }
            return next;
          });
        }}
        className="absolute top-4 left-4 text-muted-foreground/60 p-2"
        aria-label={coachMuted ? "Ativar voz do coach" : "Silenciar voz do coach"}
      >
        {coachMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      <button
        onClick={() => navigate({ to: "/" })}
        className="absolute top-4 right-4 text-muted-foreground/60 p-2"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </button>

    </FullScreen>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      {children}
    </div>
  );
}

function Stat({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-heading font-black ${color}`}>{value}</p>
    </div>
  );
}
