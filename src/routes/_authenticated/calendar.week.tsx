import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, todaysTasks, dayStats } from "@/lib/store";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar/week")({
  component: WeekView,
});

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function WeekView() {
  const navigate = useNavigate();
  const { tasks, sessions, moveTask } = useStore();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const todayStr = dateKey(new Date());

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d;
    });
  }, [anchor]);

  const shift = (n: number) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + n * 7);
    setAnchor(d);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} className="size-8 grid place-items-center rounded-full bg-surface border border-border"><ChevronLeft className="size-4" /></button>
        <div className="text-center">
          <div className="text-sm font-heading font-black uppercase">
            {days[0].getDate()}/{days[0].getMonth() + 1} — {days[6].getDate()}/{days[6].getMonth() + 1}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">Semana</div>
        </div>
        <button onClick={() => shift(1)} className="size-8 grid place-items-center rounded-full bg-surface border border-border"><ChevronRight className="size-4" /></button>
      </div>

      <div className="space-y-3">
        {days.map((d) => {
          const key = dateKey(d);
          const list = todaysTasks(tasks, key).slice().sort((a, b) => a.time.localeCompare(b.time));
          const stats = dayStats(tasks, sessions, key);
          const isToday = key === todayStr;
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/task-id");
                if (id) moveTask(id, key);
              }}
              className={`bg-surface border rounded-2xl p-3 ${isToday ? "border-discipline/50" : "border-border"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Link to="/calendar/day/$date" params={{ date: key }} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-discipline" : "text-muted-foreground"}`}>
                    {dayNames[d.getDay()]}
                  </span>
                  <span className="text-lg font-heading font-black">{d.getDate()}</span>
                  {stats.total > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">{stats.done}/{stats.total}</span>
                  )}
                </Link>
                <button
                  onClick={() => navigate({ to: "/tasks/new", search: { date: key } })}
                  className="text-discipline text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="size-3" /> Add
                </button>
              </div>
              {list.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sem missões.</p>
              ) : (
                <div className="space-y-1">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                      onClick={() => navigate({ to: "/calendar/day/$date", params: { date: key } })}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background border border-border text-xs cursor-grab active:cursor-grabbing"
                    >
                      <span className="font-mono font-bold text-discipline text-[10px]">{t.time}</span>
                      <span className="truncate flex-1">{t.name}</span>
                      {t.status === "concluida" && <span className="text-[9px] font-bold text-discipline">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
