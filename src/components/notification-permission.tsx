import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { isNativeApp, ensureNotificationPermission } from "@/lib/native";
import { notificationsGranted, syncTaskNotifications } from "@/lib/notifications";
import { useStore } from "@/lib/store";

/**
 * Explicação amigável + pedido de permissão de notificações.
 * Aparece apenas no app Android quando a permissão ainda não foi concedida,
 * e continua acessível depois (não some permanentemente).
 */
export function NotificationPermissionCard() {
  const [show, setShow] = useState(false);
  const [hidden, setHidden] = useState(false);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);

  useEffect(() => {
    if (!isNativeApp()) return;
    void notificationsGranted().then((ok) => setShow(!ok));
  }, []);

  if (!show || hidden) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-discipline/30 bg-discipline/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-discipline">
          <BellRing className="size-4" /> Notificações desativadas
        </p>
        <button
          onClick={() => setHidden(true)}
          aria-label="Fechar"
          className="text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        Permita as notificações para que a Forja possa lembrar você das suas tarefas, mesmo quando o
        aplicativo estiver fechado.
      </p>
      <button
        onClick={async () => {
          const ok = await ensureNotificationPermission();
          if (ok) {
            setShow(false);
            await syncTaskNotifications(tasks, sessions);
            toast.success("Notificações ativadas. Seus lembretes já foram agendados.");
          } else {
            toast.error(
              "Permissão negada. Ative em Configurações do Android > Apps > Forja > Notificações.",
            );
          }
        }}
        className="mt-3 w-full rounded-xl bg-discipline py-2 text-[11px] font-bold uppercase text-black"
      >
        Ativar notificações
      </button>
    </div>
  );
}
