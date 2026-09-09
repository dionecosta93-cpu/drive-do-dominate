import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vault")({
  component: Vault,
  head: () => ({
    meta: [
      { title: "Cofre da Vitória — Disciplina Absoluta" },
      {
        name: "description",
        content: "Reveja suas vitórias e o que aprendeu com cada tarefa cumprida.",
      },
    ],
  }),
});

function Vault() {
  const { sessions } = useStore();
  const withReflection = sessions.filter((s) => s.reflection || s.feeling).reverse();

  return (
    <div className="px-5 pt-8 animate-rise">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold uppercase mb-1">Cofre da Vitória</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Suas vitórias registradas. Volte aqui quando duvidar de si mesmo.
        </p>
      </div>

      {withReflection.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <Trophy className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Conclua tarefas e escreva o que aprendeu para começar a montar seu cofre.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {withReflection.map((s) => (
            <div key={s.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-discipline">
                    {new Date(s.completedAt).toLocaleDateString("pt-BR")} · +{s.xp} XP
                  </p>
                  <h3 className="font-heading font-bold text-base">{s.taskName}</h3>
                </div>
              </div>
              {s.feeling && (
                <p className="text-xs mt-2">
                  <b className="text-muted-foreground">Senti:</b> {s.feeling}
                </p>
              )}
              {s.reflection && (
                <p className="text-xs mt-1">
                  <b className="text-muted-foreground">Aprendi:</b> {s.reflection}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
