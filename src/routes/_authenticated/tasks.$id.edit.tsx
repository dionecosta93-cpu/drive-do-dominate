import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { TaskForm } from "@/components/task-form";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks/$id/edit")({
  component: EditTask,
  head: () => ({ meta: [{ title: "Editar tarefa — Disciplina Absoluta" }] }),
});

function EditTask() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useStore((s) => s.updateTask);

  if (!task) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">Tarefa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button
        onClick={() => history.back()}
        className="flex items-center gap-1 text-muted-foreground text-xs mb-4"
      >
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Editar Missão</h1>

      <TaskForm
        initial={task}
        submitLabel="SALVAR"
        onCancel={() => history.back()}
        onSubmit={(values) => {
          updateTask(task.id, values);
          toast.success("Alterações salvas.");
          history.back();
        }}
      />
    </div>
  );
}
