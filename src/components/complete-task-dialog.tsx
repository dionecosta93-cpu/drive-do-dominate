import { useState } from "react";
import { Clock, X } from "lucide-react";

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Props {
  taskName: string;
  /** 🕐 Horário planejado */
  scheduledTime: string;
  /** Data da ocorrência (YYYY-MM-DD) */
  date: string;
  onConfirm: (performedTime: string) => void;
  onNotDone?: () => void;
  onClose: () => void;
}

/** Pergunta quando a tarefa foi realmente realizada (separado do horário de registro). */
export function CompleteTaskDialog({ taskName, scheduledTime, date, onConfirm, onNotDone, onClose }: Props) {
  const registered = nowTime();
  const [mode, setMode] = useState<"scheduled" | "now" | "custom">("scheduled");
  const [custom, setCustom] = useState(scheduledTime);

  const performed = mode === "scheduled" ? scheduledTime : mode === "now" ? registered : custom;

  const Option = ({ id, label, hint }: { id: typeof mode; label: string; hint: string }) => (
    <button
      onClick={() => setMode(id)}
      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left ${
        mode === id ? "border-discipline bg-discipline/10" : "border-border bg-background"
      }`}
    >
      <span className={`size-4 rounded-full border-2 shrink-0 ${mode === id ? "border-discipline bg-discipline" : "border-border"}`} />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-8 animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="font-heading font-black text-lg leading-tight truncate">{taskName}</p>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {date.split("-").reverse().join("/")} · planejada {scheduledTime}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="size-8 grid place-items-center rounded-lg border border-border">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground my-3">Você realizou essa tarefa:</p>

        <div className="space-y-2">
          <Option id="scheduled" label={`No horário programado — ${scheduledTime}`} hint="Sem atraso e sem penalização" />
          <Option id="now" label={`Agora — ${registered}`} hint="Realizada depois do horário planejado" />
          <Option id="custom" label="Escolher outro horário" hint="Informe a hora real da execução" />
        </div>

        {mode === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <input
              type="time"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-2 text-sm"
            />
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          📱 Registro no app: {registered} — o registro tardio não afeta seu desempenho.
        </p>

        <button
          onClick={() => performed && onConfirm(performed)}
          className="mt-4 w-full py-3.5 rounded-xl bg-discipline text-black font-heading font-black uppercase active:scale-[0.98] transition-transform"
        >
          Confirmar conclusão
        </button>
        {onNotDone && (
          <button
            onClick={onNotDone}
            className="mt-2 w-full py-3 rounded-xl border border-border text-muted-foreground text-xs font-bold uppercase"
          >
            Não fiz
          </button>
        )}
      </div>
    </div>
  );
}
