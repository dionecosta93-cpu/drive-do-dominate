import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoonStar } from "lucide-react";
import { dateKey, taskCompletedOn, todaysTasks, useStore } from "@/lib/store";
import { saveTaskOccurrence } from "@/lib/task-occurrences";
import { CompleteTaskDialog } from "@/components/complete-task-dialog";

const minutesOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Revisão do fim do dia: "Você realizou alguma dessas tarefas hoje?" */
export function DayReview() {
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const dismissed = useStore((s) => s.dismissedMissed);
  const dismissMissed = useStore((s) => s.dismissMissed);
  const completeTaskForDate = useStore((s) => s.completeTaskForDate);
  const [dialogTaskId, setDialogTaskId] = useState<string | null>(null);

  const today = dateKey();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const pending = useMemo(
    () =>
      todaysTasks(tasks, today).filter(
        (t) =>
          !taskCompletedOn(t.id, sessions, today) &&
          !dismissed.includes(`${t.id}|${today}`) &&
          minutesOfDay(t.time) + (t.estimatedMinutes || 0) < nowMin,
      ),
    [tasks, sessions, dismissed, today, nowMin],
  );

  if (now.getHours() < 17 || pending.length === 0) return null;
  const dialogTask = pending.find((t) => t.id === dialogTaskId) ?? null;

  const complete = (taskId: string, performedTime: string) => {
    const session = completeTaskForDate(taskId, today, performedTime);
    if (session) void saveTaskOccurrence(session);
    toast.success(`Registrada como realizada às ${performedTime}.`);
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-surface p-4 animate-rise" style={{ animationDelay: "100ms" }}>
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-discipline mb-1">
        <MoonStar className="size-4" /> Revisão do dia
      </h2>
      <p className="text-xs text-muted-foreground mb-3">Você realizou alguma dessas tarefas hoje?</p>

      <div className="space-y-3">
        {pending.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-heading font-bold truncate">{t.name}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">planejada {t.time}</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => complete(t.id, t.time)}
                className="py-2 rounded-lg bg-discipline text-black text-[10px] font-bold uppercase"
              >
                ✓ Fiz no horário
              </button>
              <button
                onClick={() => setDialogTaskId(t.id)}
                className="py-2 rounded-lg border border-border text-[10px] font-bold uppercase text-muted-foreground"
              >
                🕐 Outro horário
              </button>
              <button
                onClick={() => {
                  dismissMissed(t.id, today);
                  toast("Marcada como não realizada.");
                }}
                className="py-2 rounded-lg border border-border text-[10px] font-bold uppercase text-muted-foreground"
              >
                Não fiz
              </button>
            </div>
          </div>
        ))}
      </div>

      {dialogTask && (
        <CompleteTaskDialog
          taskName={dialogTask.name}
          scheduledTime={dialogTask.time}
          date={today}
          onConfirm={(performed) => {
            complete(dialogTask.id, performed);
            setDialogTaskId(null);
          }}
          onNotDone={() => {
            dismissMissed(dialogTask.id, today);
            setDialogTaskId(null);
          }}
          onClose={() => setDialogTaskId(null)}
        />
      )}
    </section>
  );
}
