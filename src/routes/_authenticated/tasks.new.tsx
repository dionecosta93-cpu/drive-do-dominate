import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useStore } from "@/lib/store";
import { TaskForm } from "@/components/task-form";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const searchSchema = z.object({ date: z.string().optional() });

export const Route = createFileRoute("/_authenticated/tasks/new")({
  component: NewTask,
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Nova tarefa — Disciplina Absoluta" }, { name: "description", content: "Cadastre uma missão com todos os detalhes." }] }),
});

function NewTask() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const addTask = useStore((s) => s.addTask);
  const duplicateTaskToDates = useStore((s) => s.duplicateTaskToDates);
  const [dupPreset, setDupPreset] = useState<"nenhum" | "amanha" | "semana" | "mes">("nenhum");

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Nova Missão</h1>

      <div className="mb-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Duplicar agora</span>
        <div className="grid grid-cols-4 gap-1">
          {(["nenhum", "amanha", "semana", "mes"] as const).map((p) => (
            <button key={p} onClick={() => setDupPreset(p)}
              className={`py-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                dupPreset === p ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
              }`}>{p === "nenhum" ? "não" : p === "amanha" ? "amanhã" : p === "semana" ? "semana" : "mês"}</button>
          ))}
        </div>
      </div>

      <TaskForm
        initial={{ scheduledDate: search.date }}
        submitLabel="REGISTRAR MISSÃO"
        onSubmit={(values) => {
          const task = addTask(values);
          const scheduledDate = values.scheduledDate ?? task.scheduledDate;
          if (dupPreset !== "nenhum" && values.repetition === "nenhuma") {
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
        }}
      />
    </div>
  );
}
