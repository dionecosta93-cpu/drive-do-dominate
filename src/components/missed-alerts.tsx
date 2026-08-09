import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Check, X } from "lucide-react";
import { toast } from "sonner";
import { dateKey, useStore } from "@/lib/store";
import { dailySummary, missedTasks } from "@/lib/missed";

/** Alertas de tarefas não concluídas com ações rápidas. */
export function MissedTasksAlerts() {
  const navigate = useNavigate();
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const dismissed = useStore((s) => s.dismissedMissed);
  const dismissMissed = useStore((s) => s.dismissMissed);
  const completeTaskForDate = useStore((s) => s.completeTaskForDate);
  const moveTask = useStore((s) => s.moveTask);
  const [rescheduling, setRescheduling] = useState<string | null>(null);

  const list = useMemo(() => missedTasks(tasks, sessions, dismissed).slice(0, 5), [tasks, sessions, dismissed]);
  if (list.length === 0) return null;

  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateKey(d);
  };

  return (
    <section className="mb-6 space-y-3 animate-rise" style={{ animationDelay: "75ms" }}>
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-struggle">
        <AlertTriangle className="size-4" /> Tarefas não concluídas
      </h2>
      {list.map((m) => (
        <div key={m.key} className="rounded-2xl border border-struggle/30 bg-struggle/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-heading font-bold truncate">{m.task.name}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {m.date.split("-").reverse().join("/")} — {m.task.time}
              </p>
            </div>
            <button
              onClick={() => dismissMissed(m.task.id, m.date)}
              className="size-8 grid place-items-center rounded-lg border border-border text-muted-foreground shrink-0"
              aria-label="Dispensar"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs text-struggle/90 mt-2 leading-snug">{m.message}</p>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <button
              onClick={() => {
                completeTaskForDate(m.task.id, m.date);
                toast.success("Tarefa recuperada. Disciplina em movimento. 🔥");
              }}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-discipline text-black text-[10px] font-bold uppercase"
            >
              <Check className="size-3.5" /> Concluir
            </button>
            <button
              onClick={() => setRescheduling(rescheduling === m.key ? null : m.key)}
              className="flex items-center justify-center gap-1 py-2 rounded-xl border border-border text-[10px] font-bold uppercase text-muted-foreground"
            >
              <CalendarClock className="size-3.5" /> Reagendar
            </button>
            <button
              onClick={() => dismissMissed(m.task.id, m.date)}
              className="py-2 rounded-xl border border-border text-[10px] font-bold uppercase text-muted-foreground"
            >
              Dispensar
            </button>
          </div>

          {rescheduling === m.key && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  moveTask(m.task.id, dateKey());
                  setRescheduling(null);
                  toast.success("Reagendada para hoje.");
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase"
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  moveTask(m.task.id, tomorrow());
                  setRescheduling(null);
                  toast.success("Reagendada para amanhã.");
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase"
              >
                Amanhã
              </button>
              <input
                type="date"
                onChange={(e) => {
                  if (!e.target.value) return;
                  moveTask(m.task.id, e.target.value);
                  setRescheduling(null);
                  toast.success("Tarefa reagendada.");
                }}
                className="bg-surface border border-border rounded-lg px-2 py-1.5 text-[11px]"
              />
              <button
                onClick={() => navigate({ to: "/tasks/$id/edit", params: { id: m.task.id } })}
                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase text-muted-foreground"
              >
                Editar
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/** Resumo do dia — exibido no fim do dia (ou sempre que houver atividade). */
export function DailySummaryCard() {
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const streak = useStore((s) => s.streak);
  const discipline = useStore((s) => s.discipline);

  const s = useMemo(
    () => dailySummary(tasks, sessions, streak, discipline),
    [tasks, sessions, streak, discipline],
  );

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4 animate-rise" style={{ animationDelay: "320ms" }}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-discipline mb-3">Seu dia na Forja</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["✅ Concluídas", s.done],
            ["❌ Não concluídas", s.missed],
            ["🔥 Sequência", `${s.streak} dias`],
            ["⭐ XP do dia", `+${s.xpToday}`],
          ] as const
        ).map(([l, v]) => (
          <div key={l} className="bg-background border border-border rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{l}</p>
            <p className="font-heading font-black text-lg tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">📈 Disciplina: {s.disciplinePct}%</p>
      <p className="mt-2 text-xs leading-snug text-pretty">{s.message}</p>
    </section>
  );
}
