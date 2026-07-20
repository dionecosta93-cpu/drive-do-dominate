import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, type Category, type Priority, type TaskStatus } from "@/lib/store";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar/search")({
  component: SearchView,
});

const cats: (Category | "todas")[] = ["todas", "treino", "trabalho", "estudo", "vida", "negocios", "saude"];
const prios: (Priority | "todas")[] = ["todas", "baixa", "media", "alta"];
const statuses: (TaskStatus | "todas")[] = ["todas", "nao-iniciada", "em-andamento", "concluida", "adiada", "cancelada"];

function SearchView() {
  const navigate = useNavigate();
  const { tasks } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "todas">("todas");
  const [prio, setPrio] = useState<Priority | "todas">("todas");
  const [status, setStatus] = useState<TaskStatus | "todas">("todas");
  const [date, setDate] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (term && !`${t.name} ${t.description ?? ""} ${t.notes ?? ""} ${t.reward} ${t.consequence}`.toLowerCase().includes(term)) return false;
      if (cat !== "todas" && t.category !== cat) return false;
      if (prio !== "todas" && t.priority !== prio) return false;
      if (status !== "todas" && (t.status ?? "nao-iniciada") !== status) return false;
      if (date && t.scheduledDate !== date) return false;
      return true;
    });
  }, [tasks, q, cat, prio, status, date]);

  return (
    <div>
      <div className="relative mb-3">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, palavra-chave, notas..."
          className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-discipline"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-xs capitalize">
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={prio} onChange={(e) => setPrio(e.target.value as typeof prio)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-xs capitalize">
          {prios.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-xs capitalize">
          {statuses.map((s) => <option key={s} value={s}>{s.replace("-", " ")}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-xs" />
      </div>

      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {results.length} resultado{results.length === 1 ? "" : "s"}
      </p>

      <div className="space-y-2">
        {results.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate({ to: "/calendar/day/$date", params: { date: t.scheduledDate } })}
            className="w-full text-left bg-surface border border-border rounded-xl p-3 hover:border-discipline transition"
          >
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono font-bold text-discipline">{t.scheduledDate} · {t.time}</span>
              <span className="text-[9px] font-mono uppercase text-muted-foreground">{t.category}</span>
            </div>
            <div className="font-heading font-bold text-sm">{t.name}</div>
            {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
