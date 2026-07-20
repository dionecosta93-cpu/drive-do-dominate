import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, dayStats } from "@/lib/store";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar/")({
  component: MonthView,
});

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

function MonthView() {
  const navigate = useNavigate();
  const { tasks, sessions } = useStore();
  const today = new Date();
  const todayStr = dateKey(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: { date: string; day: number; inMonth: boolean }[] = [];
    // pad prev month
    for (let i = 0; i < startDow; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), -(startDow - 1 - i));
      arr.push({ date: dateKey(d), day: d.getDate(), inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), i);
      arr.push({ date: dateKey(d), day: i, inMonth: true });
    }
    while (arr.length % 7 !== 0 || arr.length < 42) {
      const last = arr[arr.length - 1];
      const [y, m, dd] = last.date.split("-").map(Number);
      const nd = new Date(y, m - 1, dd + 1);
      arr.push({ date: dateKey(nd), day: nd.getDate(), inMonth: nd.getMonth() === cursor.getMonth() });
      if (arr.length >= 42) break;
    }
    return arr;
  }, [cursor]);

  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  const shiftYear = (n: number) => setCursor(new Date(cursor.getFullYear() + n, cursor.getMonth(), 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftYear(-1)} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">« {cursor.getFullYear() - 1}</button>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="size-8 grid place-items-center rounded-full bg-surface border border-border"><ChevronLeft className="size-4" /></button>
          <div className="text-center min-w-[140px]">
            <div className="text-lg font-heading font-black uppercase leading-none">{monthNames[cursor.getMonth()]}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{cursor.getFullYear()}</div>
          </div>
          <button onClick={() => shift(1)} className="size-8 grid place-items-center rounded-full bg-surface border border-border"><ChevronRight className="size-4" /></button>
        </div>
        <button onClick={() => shiftYear(1)} className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{cursor.getFullYear() + 1} »</button>
      </div>

      <div className="grid grid-cols-7 mb-1 text-center">
        {dayNames.map((d, i) => (
          <div key={i} className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const stats = dayStats(tasks, sessions, c.date);
          const isToday = c.date === todayStr;
          const colorClass =
            stats.total === 0 ? "border-border"
              : stats.pct === 100 ? "border-discipline/60 bg-discipline/10"
                : stats.pct > 0 ? "border-warning/50 bg-warning/5"
                  : "border-struggle/50 bg-struggle/5";
          return (
            <button
              key={c.date}
              onClick={() => navigate({ to: "/calendar/day/$date", params: { date: c.date } })}
              className={`aspect-square rounded-lg border ${colorClass} ${c.inMonth ? "" : "opacity-30"} ${
                isToday ? "ring-2 ring-discipline" : ""
              } p-1 flex flex-col items-stretch justify-between text-left transition active:scale-95`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-xs font-bold ${isToday ? "text-discipline" : ""}`}>{c.day}</span>
                {stats.total > 0 && (
                  <span className="text-[8px] font-mono font-bold text-muted-foreground">
                    {stats.done}/{stats.total}
                  </span>
                )}
              </div>
              {stats.total > 0 && (
                <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stats.pct === 100 ? "bg-discipline" : stats.pct > 0 ? "bg-warning" : "bg-struggle"
                    }`}
                    style={{ width: `${Math.max(stats.pct, stats.total > 0 ? 6 : 0)}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigate({ to: "/calendar/day/$date", params: { date: todayStr } })}
        className="mt-6 w-full py-4 bg-white text-black font-heading font-black rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Plus className="size-5" /> NOVA ATIVIDADE HOJE
      </button>

      <div className="mt-4 flex items-center justify-around text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-discipline" /> 100%</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> Parcial</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-struggle" /> Pendente</span>
      </div>
    </div>
  );
}
