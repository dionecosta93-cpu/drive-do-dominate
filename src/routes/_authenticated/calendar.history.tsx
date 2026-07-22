import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/calendar/history")({
  component: HistoryView,
});

function HistoryView() {
  const { sessions, tasks } = useStore();
  const rows = useMemo(() => {
    return sessions
      .slice()
      .sort((a, b) => b.completedAt - a.completedAt)
      .map((s) => {
        const t = tasks.find((x) => x.id === s.taskId);
        return { s, t };
      });
  }, [sessions, tasks]);

  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
        {rows.length} conclusões registradas
      </p>
      {rows.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Sem histórico ainda.
        </div>
      )}
      <div className="space-y-2">
        {rows.map(({ s, t }) => {
          const d = new Date(s.completedAt);
          const minReal = Math.round(s.spentSeconds / 60);
          return (
            <div key={s.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-discipline">
                  {d.toLocaleDateString("pt-BR")} · {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">+{s.xp} XP</span>
              </div>
              <div className="font-heading font-bold text-sm">{s.taskName}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                planejado {s.estimatedMinutes}min · real {minReal}min · pausas {s.pauses}
                {s.scheduledDate ? ` · data ${s.scheduledDate}` : ""}
                {s.scheduledTime ? ` · previsto ${s.scheduledTime}` : ""}
                {s.completedTime ? ` · concluído ${s.completedTime}` : ""}
                {typeof s.timingDeltaMinutes === "number" ? ` · ${s.timingDeltaMinutes > 0 ? "atraso" : s.timingDeltaMinutes < 0 ? "adiantado" : "no horário"} ${Math.abs(s.timingDeltaMinutes)}min` : ""}
                {t?.editCount ? ` · ${t.editCount} edições` : ""}
              </div>
              {s.reflection && (
                <p className="mt-2 text-xs italic text-muted-foreground border-l-2 border-discipline/40 pl-2">"{s.reflection}"</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
