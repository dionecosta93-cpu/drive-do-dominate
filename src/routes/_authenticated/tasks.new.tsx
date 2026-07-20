import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useStore, type Category, type Priority, type Repetition } from "@/lib/store";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const searchSchema = z.object({
  date: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/tasks/new")({
  component: NewTask,
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Nova tarefa — Disciplina Absoluta" }, { name: "description", content: "Cadastre uma missão com todos os detalhes." }] }),
});

const categories: Category[] = ["treino", "trabalho", "estudo", "vida", "negocios", "saude"];
const priorities: Priority[] = ["baixa", "media", "alta"];
const reps: Repetition[] = ["nenhuma", "diaria", "dias-uteis", "semanal", "quinzenal", "mensal", "anual", "personalizada"];
const colors = ["#22c55e", "#ef4444", "#eab308", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const icons = ["🎯", "💪", "📚", "💼", "🧘", "🏃", "🍎", "✨", "🔥", "⚡", "🌱", "🧠"];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function NewTask() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const addTask = useStore((s) => s.addTask);
  const duplicateTaskToDates = useStore((s) => s.duplicateTaskToDates);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("trabalho");
  const [priority, setPriority] = useState<Priority>("media");
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState(search.date || todayStr());
  const [estimated, setEstimated] = useState(30);
  const [max, setMax] = useState(60);
  const [repetition, setRepetition] = useState<Repetition>("nenhuma");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [difficulty, setDifficulty] = useState(5);
  const [reward, setReward] = useState("");
  const [consequence, setConsequence] = useState("");
  const [color, setColor] = useState<string | undefined>();
  const [icon, setIcon] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [dupPreset, setDupPreset] = useState<"nenhum" | "amanha" | "semana" | "mes">("nenhum");

  const submit = () => {
    if (!name.trim()) { toast.error("Dê um nome à missão."); return; }
    const task = addTask({
      name: name.trim(),
      description: description.trim() || undefined,
      category, priority, time,
      endTime: endTime || undefined,
      scheduledDate,
      estimatedMinutes: estimated,
      maxMinutes: max,
      repetition,
      customDates: repetition === "personalizada" ? customDates : undefined,
      difficulty,
      reward: reward.trim(),
      consequence: consequence.trim(),
      color, icon,
      notes: notes.trim() || undefined,
    });
    if (dupPreset !== "nenhum") {
      const base = new Date(scheduledDate + "T00:00:00");
      const dates: string[] = [];
      if (dupPreset === "amanha") {
        const d = new Date(base); d.setDate(d.getDate() + 1);
        dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      } else if (dupPreset === "semana") {
        for (let i = 1; i <= 6; i++) {
          const d = new Date(base); d.setDate(d.getDate() + i);
          dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        }
      } else if (dupPreset === "mes") {
        const end = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
        for (let d = base.getDate() + 1; d <= end; d++) {
          dates.push(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        }
      }
      if (dates.length) duplicateTaskToDates(task.id, dates);
    }
    toast.success("Missão registrada.");
    navigate({ to: "/calendar/day/$date", params: { date: scheduledDate } });
  };

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Nova Missão</h1>

      <div className="space-y-5">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Treino de força"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
        </Field>

        <Field label="Descrição (opcional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="Detalhes, contexto, meta específica..."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline resize-none" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 capitalize focus:outline-none focus:border-discipline">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Prioridade">
            <div className="grid grid-cols-3 gap-1">
              {priorities.map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`py-3 rounded-xl text-[11px] font-bold uppercase border transition ${
                    priority === p
                      ? p === "alta" ? "bg-struggle/20 border-struggle text-struggle"
                      : p === "media" ? "bg-warning/20 border-warning text-warning"
                      : "bg-discipline/20 border-discipline text-discipline"
                      : "bg-surface border-border text-muted-foreground"
                  }`}>{p}</button>
              ))}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} disabled={repetition !== "nenhuma"}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline disabled:opacity-50" />
          </Field>
          <Field label="Início">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Término (opcional)">
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
          <Field label="Estimado (min)">
            <input type="number" min={1} value={estimated} onChange={(e) => setEstimated(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
        </div>

        <Field label="Máximo (min)">
          <input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))}
            className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
        </Field>

        <Field label="Repetição">
          <div className="grid grid-cols-4 gap-1">
            {reps.map((r) => (
              <button key={r} onClick={() => setRepetition(r)}
                className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                  repetition === r ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
                }`}>{r}</button>
            ))}
          </div>
          {repetition === "personalizada" && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input type="date" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs" />
                <button
                  onClick={() => { if (customInput && !customDates.includes(customInput)) setCustomDates([...customDates, customInput].sort()); setCustomInput(""); }}
                  className="px-3 py-2 bg-discipline text-black rounded-lg text-xs font-bold">Add</button>
              </div>
              {customDates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customDates.map((d) => (
                    <button key={d} onClick={() => setCustomDates(customDates.filter((x) => x !== d))}
                      className="text-[10px] font-mono bg-surface border border-border rounded px-2 py-1 hover:border-struggle">
                      {d} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>

        {repetition === "nenhuma" && (
          <Field label="Duplicar agora">
            <div className="grid grid-cols-4 gap-1">
              {(["nenhum", "amanha", "semana", "mes"] as const).map((p) => (
                <button key={p} onClick={() => setDupPreset(p)}
                  className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                    dupPreset === p ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
                  }`}>{p === "nenhum" ? "não" : p === "amanha" ? "amanhã" : p === "semana" ? "semana" : "mês"}</button>
              ))}
            </div>
          </Field>
        )}

        <Field label={`Dificuldade: ${difficulty}/10`}>
          <input type="range" min={1} max={10} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-discipline" />
        </Field>

        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setColor(undefined)}
              className={`size-8 rounded-full border-2 ${!color ? "border-discipline" : "border-border"} bg-transparent text-[10px]`}>—</button>
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`size-8 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </Field>

        <Field label="Ícone">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setIcon(undefined)}
              className={`size-9 rounded-lg border ${!icon ? "border-discipline" : "border-border"} bg-surface text-xs`}>—</button>
            {icons.map((i) => (
              <button key={i} onClick={() => setIcon(i)}
                className={`size-9 rounded-lg border text-lg ${icon === i ? "border-discipline bg-discipline/10" : "border-border bg-surface"}`}>{i}</button>
            ))}
          </div>
        </Field>

        <Field label="Recompensa (se cumprir)">
          <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Ex.: 1 episódio da série"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
        </Field>

        <Field label="Consequência (se falhar)">
          <input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="Ex.: Sem redes sociais hoje"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
        </Field>

        <Field label="Observações">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Notas livres..."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline resize-none" />
        </Field>

        <button onClick={submit}
          className="w-full py-5 bg-white text-black font-heading font-black text-lg rounded-2xl active:scale-[0.98] transition-transform mt-4">
          REGISTRAR MISSÃO
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">{label}</span>
      {children}
    </label>
  );
}
