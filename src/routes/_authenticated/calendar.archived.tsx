import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar/archived")({
  component: ArchivedView,
});

function ArchivedView() {
  const { tasks, restoreTask, removeTask } = useStore();
  const list = tasks.filter((t) => t.archived);

  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
        {list.length} arquivada{list.length === 1 ? "" : "s"}
      </p>
      {list.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma missão arquivada.
        </div>
      )}
      <div className="space-y-2">
        {list.map((t) => (
          <div key={t.id} className="bg-surface border border-border rounded-xl p-3 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{t.scheduledDate} · {t.time} · {t.category}</div>
              <div className="font-heading font-bold text-sm">{t.name}</div>
            </div>
            <button
              onClick={() => { restoreTask(t.id); toast.success("Restaurada."); }}
              className="size-8 grid place-items-center rounded-lg border border-border text-discipline"
              aria-label="Restaurar"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={() => { if (confirm("Excluir definitivamente?")) { removeTask(t.id); toast("Removida."); } }}
              className="size-8 grid place-items-center rounded-lg border border-border text-struggle"
              aria-label="Excluir"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
