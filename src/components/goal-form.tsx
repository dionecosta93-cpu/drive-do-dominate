import { useState } from "react";
import { toast } from "sonner";
import type { LifeGoal, LifeGoalCategory, LifeGoalStatus, Priority } from "@/lib/store";
import { goalCategoryLabel, goalStatusLabel } from "@/lib/store";

const categories: LifeGoalCategory[] = [
  "negocios",
  "financeiro",
  "familia",
  "relacionamento",
  "saude",
  "atleta",
  "espiritual",
  "estudo",
  "carreira",
  "outro",
];
const priorities: Priority[] = ["baixa", "media", "alta"];
const statuses: LifeGoalStatus[] = ["em-andamento", "concluida", "pausada"];

export type GoalFormValues = {
  name: string;
  description?: string;
  category: LifeGoalCategory;
  priority: Priority;
  targetDate?: string;
  motivation?: string;
  status: LifeGoalStatus;
  manualProgress?: number;
};

export function GoalForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<LifeGoal>;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<LifeGoalCategory>(initial?.category ?? "negocios");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "alta");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [motivation, setMotivation] = useState(initial?.motivation ?? "");
  const [status, setStatus] = useState<LifeGoalStatus>(initial?.status ?? "em-andamento");
  const [useManual, setUseManual] = useState(typeof initial?.manualProgress === "number");
  const [manualProgress, setManualProgress] = useState(initial?.manualProgress ?? 0);

  return (
    <div className="space-y-5">
      <Field label="Nome da meta">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Tornar-me empresário"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline"
        />
      </Field>

      <Field label="Descrição">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="O que exatamente significa alcançar essa meta?"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline resize-none"
        />
      </Field>

      <Field label="Categoria">
        <div className="grid grid-cols-3 gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                category === c ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {goalCategoryLabel[c]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prioridade">
          <div className="grid grid-cols-3 gap-1">
            {priorities.map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`py-3 rounded-xl text-[11px] font-bold uppercase border transition ${
                  priority === p
                    ? p === "alta"
                      ? "bg-struggle/20 border-struggle text-struggle"
                      : p === "media"
                        ? "bg-warning/20 border-warning text-warning"
                        : "bg-discipline/20 border-discipline text-discipline"
                    : "bg-surface border-border text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Data prevista">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-3 focus:outline-none focus:border-discipline"
          />
        </Field>
      </div>

      <Field label="Motivação — por que isso importa?">
        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={2}
          placeholder="Ex.: Dar segurança e liberdade à minha família."
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-discipline resize-none"
        />
      </Field>

      <Field label="Status">
        <div className="grid grid-cols-3 gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                status === s ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {goalStatusLabel[s]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Progresso">
        <button
          onClick={() => setUseManual((v) => !v)}
          className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
            useManual ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
          }`}
        >
          {useManual ? `Manual: ${manualProgress}%` : "Automático (objetivos + tarefas concluídas)"}
        </button>
        {useManual && (
          <input
            type="range"
            min={0}
            max={100}
            value={manualProgress}
            onChange={(e) => setManualProgress(Number(e.target.value))}
            className="w-full accent-discipline mt-3"
          />
        )}
      </Field>

      <div className="flex gap-2 mt-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-5 bg-surface border border-border text-muted-foreground font-heading font-black text-lg rounded-2xl active:scale-[0.98] transition-transform"
          >
            CANCELAR
          </button>
        )}
        <button
          onClick={() => {
            if (!name.trim()) {
              toast.error("Dê um nome à meta.");
              return;
            }
            onSubmit({
              name: name.trim(),
              description: description.trim() || undefined,
              category,
              priority,
              targetDate: targetDate || undefined,
              motivation: motivation.trim() || undefined,
              status,
              manualProgress: useManual ? manualProgress : undefined,
            });
          }}
          className="flex-1 py-5 bg-white text-black font-heading font-black text-lg rounded-2xl active:scale-[0.98] transition-transform"
        >
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
