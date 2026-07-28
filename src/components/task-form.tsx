import { useState } from "react";
import { toast } from "sonner";
import type { Category, Priority, Repetition, Task } from "@/lib/store";
import { useStore } from "@/lib/store";

const categories: Category[] = ["treino", "trabalho", "estudo", "vida", "negocios", "saude", "familia", "espiritual"];
const priorities: Priority[] = ["baixa", "media", "alta"];
const reps: Repetition[] = [
  "nenhuma",
  "diaria",
  "dias-uteis",
  "fim-de-semana",
  "dias-especificos",
  "semanal",
  "quinzenal",
  "mensal",
  "anual",
  "personalizada",
];
const repLabel: Record<Repetition, string> = {
  "nenhuma": "não repetir",
  "diaria": "todos os dias",
  "dias-uteis": "dias úteis",
  "fim-de-semana": "fim de semana",
  "dias-especificos": "dias da semana",
  "semanal": "semanal",
  "quinzenal": "quinzenal",
  "mensal": "mensal",
  "anual": "anual",
  "personalizada": "personalizada",
};
const weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
const colors = ["#22c55e", "#ef4444", "#eab308", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const icons = ["🎯", "💪", "📚", "💼", "🧘", "🏃", "🍎", "✨", "🔥", "⚡", "🌱", "🧠"];
const alarmOptions = [5, 10, 15, 30, 60];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type TaskFormValues = Omit<Task, "id" | "createdAt" | "scheduledDate" | "editCount"> & {
  scheduledDate?: string;
};

export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Task>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "trabalho");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "media");
  const [time, setTime] = useState(initial?.time ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [scheduledDate, setScheduledDate] = useState(initial?.scheduledDate ?? todayStr());
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [estimated, setEstimated] = useState(initial?.estimatedMinutes ?? 30);
  const [max, setMax] = useState(initial?.maxMinutes ?? 60);
  const [repetition, setRepetition] = useState<Repetition>(initial?.repetition ?? "nenhuma");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [customDates, setCustomDates] = useState<string[]>(initial?.customDates ?? []);
  const [customInput, setCustomInput] = useState("");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 5);
  const [reward, setReward] = useState(initial?.reward ?? "");
  const [consequence, setConsequence] = useState(initial?.consequence ?? "");
  const [motivation, setMotivation] = useState(initial?.motivation ?? "");
  const [alarmMinutesBefore, setAlarmMinutesBefore] = useState<number | null>(initial?.alarmMinutesBefore ?? null);
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const [icon, setIcon] = useState<string | undefined>(initial?.icon);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [goalId, setGoalId] = useState<string | undefined>(initial?.goalId);
  const [objectiveId, setObjectiveId] = useState<string | undefined>(initial?.objectiveId);
  const lifeGoals = useStore((s) => s.lifeGoals);
  const selectedGoal = lifeGoals.find((g) => g.id === goalId);

  const toggleWeekday = (d: number) => {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Dê um nome à missão.");
      return;
    }
    if (repetition === "dias-especificos" && weekdays.length === 0) {
      toast.error("Escolha ao menos um dia da semana.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error("Data final anterior à inicial.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      time,
      endTime: endTime || undefined,
      scheduledDate,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      estimatedMinutes: estimated,
      maxMinutes: max,
      repetition,
      weekdays: repetition === "dias-especificos" ? weekdays : undefined,
      customDates: repetition === "personalizada" ? customDates : undefined,
      difficulty,
      reward: reward.trim(),
      consequence: consequence.trim(),
      motivation: motivation.trim() || undefined,
      alarmMinutesBefore,
      color,
      icon,
      notes: notes.trim() || undefined,
    });
  };

  const dateDisabled = repetition !== "nenhuma";

  return (
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
          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} disabled={dateDisabled}
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

      <Field label="Despertador (opcional)">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setAlarmMinutesBefore(null)}
            className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
              alarmMinutesBefore === null ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
            }`}
          >
            sem
          </button>
          {alarmOptions.map((minutes) => (
            <button
              key={minutes}
              onClick={() => {
                setAlarmMinutesBefore(minutes);
                if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
              }}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                alarmMinutesBefore === minutes ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </Field>

      <Field label="Repetição">
        <div className="grid grid-cols-3 gap-1">
          {reps.map((r) => (
            <button key={r} onClick={() => setRepetition(r)}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                repetition === r ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
              }`}>{repLabel[r]}</button>
          ))}
        </div>
        {repetition === "dias-especificos" && (
          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekdayLabels.map((lbl, i) => (
              <button key={i} onClick={() => toggleWeekday(i)}
                className={`py-2 rounded-lg text-[11px] font-bold border transition ${
                  weekdays.includes(i) ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
                }`}>{lbl}</button>
            ))}
          </div>
        )}
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

      <Field label="Data personalizada — período ativo (opcional)">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Início</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </div>
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">Fim</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">A tarefa só aparece nesse intervalo. Após o fim, some das Missões de Hoje (fica no histórico).</p>
      </Field>

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

      <Field label="Frase motivacional (opcional)">
        <input value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Ex.: Disciplina supera motivação."
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
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

      <div className="flex gap-2 mt-4">
        {onCancel && (
          <button onClick={onCancel}
            className="flex-1 py-5 bg-surface border border-border text-muted-foreground font-heading font-black text-lg rounded-2xl active:scale-[0.98] transition-transform">
            CANCELAR
          </button>
        )}
        <button onClick={submit}
          className="flex-1 py-5 bg-white text-black font-heading font-black text-lg rounded-2xl active:scale-[0.98] transition-transform">
          {submitLabel}
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
