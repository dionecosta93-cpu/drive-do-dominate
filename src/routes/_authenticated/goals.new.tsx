import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { GoalForm } from "@/components/goal-form";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals/new")({
  component: NewGoal,
  head: () => ({
    meta: [
      { title: "Nova meta de vida — Disciplina Absoluta" },
      {
        name: "description",
        content: "Crie uma meta de longo prazo com prazo, motivação e progresso.",
      },
      { property: "og:title", content: "Nova meta de vida — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Crie uma meta de longo prazo com prazo, motivação e progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewGoal() {
  const navigate = useNavigate();
  const addLifeGoal = useStore((s) => s.addLifeGoal);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button
        onClick={() => history.back()}
        className="flex items-center gap-1 text-muted-foreground text-xs mb-4"
      >
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Nova Meta</h1>
      <GoalForm
        submitLabel="CRIAR META"
        onCancel={() => history.back()}
        onSubmit={(values) => {
          const goal = addLifeGoal(values);
          toast.success("Meta registrada.");
          navigate({ to: "/goals/$id", params: { id: goal.id } });
        }}
      />
    </div>
  );
}
