import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { taskCompletedOn, useStore, todaysTasks, type Task, type TaskStatus } from "@/lib/store";
import { ChevronLeft, ChevronRight, Plus, MoreVertical, Play, Check, RotateCcw, Copy, Move, Archive, Trash2, Edit, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar/day/$date")({
  component: DayView,
  head: ({ params }) => ({ meta: [{ title: `Dia ${params.date} — Agenda` }] }),
});

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shift = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dateKey(dt);
};

const statusColor: Record<TaskStatus, string> = {
  "nao-iniciada": "bg-muted text-muted-foreground",
  "em-andamento": "bg-info/20 text-info",
  "concluida": "bg-discipline/20 text-discipline",
  "adiada": "bg-warning/20 text-warning",
  "cancelada": "bg-struggle/20 text-struggle",
};

function DayView() {
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const store = useStore();
  const { tasks, sessions } = store;

  const list = useMemo(
    () => todaysTasks(tasks, date).slice().sort((a, b) => a.time.localeCompare(b.time)),
    [tasks, date],
  );

  const dayObj = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [date]);

  const isToday = date === dateKey(new Date());
  const doneCount = list.filter((t) => taskCompletedOn(t.id, sessions, date)).length;

  const [menuId, setMenuId] = useState<string | null>(null);
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState(date);
  const [dupTaskId, setDupTaskId] = useState<string | null>(null);

  const closeMenu = () => setMenuId(null);

  const dupTo = (id: string, dates: string[], label: string) => {
    store.duplicateTaskToDates(id, dates);
    setDupTaskId(null);
    toast.success(`Duplicada para ${label}.`);
  };

  const dupPresets = (id: string) => {
    const base = new Date(date + "T00:00:00");
    const weekDates = Array.from({ length: 6 }, (_, i) => shift(date, i + 1));
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const monthDates: string[] = [];
    for (let d = base.getDate() + 1; d <= monthEnd; d++) {
      monthDates.push(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
    const threeMonths = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i + 1, base.getDate());
      return dateKey(d);
    });
    const yearDates = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i + 1, base.getDate());
      return dateKey(d);
    });
    return {
      tomorrow: [shift(date, 1)],
      week: weekDates,
      restOfMonth: monthDates,
      threeMonths,
      year: yearDates,
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ to: "/calendar/day/$date", params: { date: shift(date, -1) } })}
          className="size-8 grid place-items-center rounded-full bg-surface border border-border">
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {dayObj.toLocaleDateString("pt-BR", { weekday: "long" })}
          </div>
          <div className={`text-xl font-heading font-black uppercase ${isToday ? "text-discipline" : ""}`}>
            {dayObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
          {list.length > 0 && (
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{doneCount}/{list.length} concluídas</div>
          )}
        </div>
        <button onClick={() => navigate({ to: "/calendar/day/$date", params: { date: shift(date, 1) } })}
          className="size-8 grid place-items-center rounded-full bg-surface border border-border">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {list.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground mb-6">Nenhuma missão neste dia.</p>
          <button
            onClick={() => navigate({ to: "/tasks/new", search: { date } })}
            className="inline-flex items-center gap-2 bg-white text-black font-heading font-black text-base rounded-2xl px-6 py-4 active:scale-[0.98] transition-transform"
          >
            <Plus className="size-5" /> NOVA ATIVIDADE
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => {
            const isDone = taskCompletedOn(t.id, sessions, date);
            return (
              <div
                key={t.id}
                className="bg-surface border border-border rounded-2xl p-3 relative"
                style={t.color ? { borderLeftColor: t.color, borderLeftWidth: 4 } : undefined}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-[11px] font-mono font-bold text-discipline">{t.time}{t.endTime ? `–${t.endTime}` : ""}</span>
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">{t.category}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 rounded ${
                        t.priority === "alta" ? "bg-struggle/20 text-struggle" :
                        t.priority === "media" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                      }`}>{t.priority}</span>
                      {(isDone || t.status) && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 rounded ${statusColor[t.status]}`}>
                          {(isDone ? "concluida" : t.status)!.replace("-", " ")}
                        </span>
                      )}
                      {!!t.rolloverCount && !isDone && (
                        <span className="text-[9px] font-bold uppercase px-1.5 rounded bg-struggle/15 text-struggle">↻ {t.rolloverCount}x</span>
                      )}
                    </div>
                    <h3 className={`text-base font-heading font-bold leading-tight ${isDone ? "line-through opacity-60" : ""}`}>{t.name}</h3>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t.estimatedMinutes}min prev.{t.actualMinutes ? ` · ${t.actualMinutes}min real` : ""} · Dif. {t.difficulty}/10{t.alarmMinutesBefore ? ` · alarme ${t.alarmMinutesBefore}min antes` : ""}
                    </p>
                    {t.notes && <p className="text-[11px] italic text-muted-foreground mt-1">"{t.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isToday && !isDone && (
                      <button
                        onClick={() => navigate({ to: "/focus/$taskId", params: { taskId: t.id } })}
                        className="bg-discipline text-black rounded-lg p-2 active:scale-95"
                        aria-label="Iniciar"
                      >
                        <Play className="size-4" fill="currentColor" />
                      </button>
                    )}
                    <button
                      onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                      className="size-8 grid place-items-center rounded-lg border border-border"
                      aria-label="Ações"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                </div>

                {menuId === t.id && (
                  <ActionMenu
                    task={t}
                    date={date}
                    isDone={isDone}
                    onClose={closeMenu}
                    onEdit={() => { closeMenu(); navigate({ to: "/tasks/$id/edit", params: { id: t.id } }); }}
                    onComplete={() => { store.completeTaskForDate(t.id, date); closeMenu(); toast.success("Concluída somente neste dia."); }}
                    onReopen={() => { store.reopenTaskForDate(t.id, date); closeMenu(); toast("Reaberta somente neste dia."); }}
                    onPostpone={() => { store.setTaskStatus(t.id, "adiada"); closeMenu(); toast("Adiada."); }}
                    onCancel={() => { store.setTaskStatus(t.id, "cancelada"); closeMenu(); toast("Cancelada."); }}
                    onMove={() => { setMoveTaskId(t.id); setMoveDate(date); closeMenu(); }}
                    onDuplicateSimple={() => { store.duplicateTask(t.id, date); closeMenu(); toast.success("Duplicada."); }}
                    onDuplicateAdvanced={() => { setDupTaskId(t.id); closeMenu(); }}
                    onArchive={() => { store.archiveTask(t.id); closeMenu(); toast("Arquivada."); }}
                    onDelete={() => { if (confirm("Excluir esta missão?")) { store.removeTask(t.id); closeMenu(); toast("Removida."); } }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-30">
        <button
          onClick={() => navigate({ to: "/tasks/new", search: { date } })}
          aria-label="Nova atividade"
          className="size-14 rounded-full bg-white text-black shadow-2xl shadow-black/40 grid place-items-center active:scale-95 transition-transform"
        >
          <Plus className="size-6" strokeWidth={3} />
        </button>
      </div>

      {moveTaskId && (
        <Sheet onClose={() => setMoveTaskId(null)} title="Mover para outra data">
          <input
            type="date"
            value={moveDate}
            onChange={(e) => setMoveDate(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-discipline"
          />
          <button
            onClick={() => {
              store.moveTask(moveTaskId, moveDate);
              toast.success("Movida.");
              setMoveTaskId(null);
              navigate({ to: "/calendar/day/$date", params: { date: moveDate } });
            }}
            className="w-full py-3 bg-discipline text-black font-heading font-black rounded-xl"
          >
            MOVER
          </button>
        </Sheet>
      )}

      {dupTaskId && (
        <Sheet onClose={() => setDupTaskId(null)} title="Duplicar para...">
          {(() => {
            const p = dupPresets(dupTaskId);
            const opts: [string, string[], string][] = [
              ["Amanhã", p.tomorrow, "amanhã"],
              ["Restante da semana", p.week, "restante da semana"],
              ["Restante do mês", p.restOfMonth, "restante do mês"],
              ["Próximos 3 meses (mesmo dia)", p.threeMonths, "próximos 3 meses"],
              ["Próximos 12 meses (mesmo dia)", p.year, "próximos 12 meses"],
            ];
            return (
              <div className="space-y-2">
                {opts.map(([label, dates, short]) => (
                  <button
                    key={label}
                    onClick={() => dupTo(dupTaskId!, dates, short)}
                    className="w-full text-left px-4 py-3 bg-background border border-border rounded-xl hover:border-discipline transition flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{dates.length}x</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </Sheet>
      )}

      <div className="mt-6 text-center">
        <Link to="/calendar" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">← Voltar ao mês</Link>
      </div>
    </div>
  );
}

function ActionMenu(props: {
  task: Task;
  date: string;
  isDone: boolean;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onPostpone: () => void;
  onCancel: () => void;
  onMove: () => void;
  onDuplicateSimple: () => void;
  onDuplicateAdvanced: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const btn = "w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-background rounded-lg";
  return (
    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-1">
      {props.isDone ? (
        <button onClick={props.onReopen} className={btn}><RotateCcw className="size-3.5" /> Reabrir</button>
      ) : (
        <button onClick={props.onComplete} className={`${btn} text-discipline`}><Check className="size-3.5" /> Concluir</button>
      )}
      <button onClick={props.onMove} className={btn}><Move className="size-3.5" /> Mover</button>
      <button onClick={props.onDuplicateSimple} className={btn}><Copy className="size-3.5" /> Duplicar aqui</button>
      <button onClick={props.onDuplicateAdvanced} className={btn}><Copy className="size-3.5" /> Duplicar para...</button>
      <button onClick={props.onPostpone} className={`${btn} text-warning`}><RotateCcw className="size-3.5" /> Adiar</button>
      <button onClick={props.onCancel} className={`${btn} text-struggle`}><X className="size-3.5" /> Cancelar</button>
      <button onClick={props.onEdit} className={btn}><Edit className="size-3.5" /> Editar</button>
      <button onClick={props.onArchive} className={btn}><Archive className="size-3.5" /> Arquivar</button>
      <button onClick={props.onDelete} className={`${btn} text-struggle col-span-2`}><Trash2 className="size-3.5" /> Excluir</button>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[440px] bg-surface border-t border-border rounded-t-3xl p-5 animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-black uppercase text-sm">{title}</h3>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-full bg-background border border-border">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
