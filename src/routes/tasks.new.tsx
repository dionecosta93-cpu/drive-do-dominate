import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Category, type Priority, type Repetition } from "@/lib/store";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/tasks/new")({
  component: NewTask,
  head: () => ({ meta: [{ title: "Nova tarefa — Kairos" }, { name: "description", content: "Defina uma missão com recompensa e consequência." }] }),
});

const categories: Category[] = ["treino", "trabalho", "estudo", "vida", "negocios", "saude"];
const priorities: Priority[] = ["baixa", "media", "alta"];
const reps: Repetition[] = ["nenhuma", "diaria", "semanal", "dias-uteis"];

function NewTask() {
  const navigate = useNavigate();
  const addTask = useStore((s) => s.addTask);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("trabalho");
  const [priority, setPriority] = useState<Priority>("media");
  const [time, setTime] = useState("09:00");
  const [estimated, setEstimated] = useState(30);
  const [max, setMax] = useState(60);
  const [repetition, setRepetition] = useState<Repetition>("nenhuma");
  const [difficulty, setDifficulty] = useState(5);
  const [reward, setReward] = useState("");
  const [consequence, setConsequence] = useState("");

  const submit = () => {
    if (!name.trim()) { toast.error("Dê um nome à missão."); return; }
    addTask({
      name: name.trim(), category, priority, time,
      estimatedMinutes: estimated, maxMinutes: max, repetition,
      difficulty, reward: reward.trim(), consequence: consequence.trim(),
    });
    toast.success("Missão registrada. Agora execute.");
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pt-6 pb-10 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Nova Missão</h1>

      <div className="space-y-5">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Treino de força"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
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

        <div className="grid grid-cols-3 gap-3">
          <Field label="Horário">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
          <Field label="Estimado (min)">
            <input type="number" min={1} value={estimated} onChange={(e) => setEstimated(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
          <Field label="Máximo (min)">
            <input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline" />
          </Field>
        </div>

        <Field label="Repetição">
          <div className="grid grid-cols-4 gap-1">
            {reps.map((r) => (
              <button key={r} onClick={() => setRepetition(r)}
                className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                  repetition === r ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
                }`}>{r}</button>
            ))}
          </div>
        </Field>

        <Field label={`Dificuldade: ${difficulty}/10`}>
          <input type="range" min={1} max={10} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full accent-discipline" />
        </Field>

        <Field label="Recompensa (se cumprir)">
          <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Ex.: 1 episódio da série"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
        </Field>

        <Field label="Consequência (se falhar)">
          <input value={consequence} onChange={(e) => setConsequence(e.target.value)} placeholder="Ex.: Sem redes sociais hoje"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline" />
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
