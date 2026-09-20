import { useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw, Check, Wifi } from "lucide-react";
import { getSyncState, subscribeSyncState } from "@/lib/sync-status";
import { flushPendingSync } from "@/lib/cloud-sync";

/**
 * Indicador de conexão e sincronização.
 * 🔄 Sincronizando... → ✓ Tudo sincronizado (some sozinho). Sem aviso de "offline":
 * o app funciona normal sem internet, então a barra vermelha só atrapalhava.
 */
export function OfflineBanner() {
  const [justReconnected, setJustReconnected] = useState(false);
  const syncState = useSyncExternalStore(
    subscribeSyncState,
    getSyncState,
    () => "sincronizado" as const,
  );

  useEffect(() => {
    let timer: number | undefined;
    const onOnline = () => {
      setJustReconnected(true);
      void flushPendingSync();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setJustReconnected(false), 4000);
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(timer);
    };
  }, []);

  // Sem internet a sincronização fica pendente por natureza — não mostra spinner à toa.
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (!offline && (syncState === "sincronizando" || syncState === "pendente")) {
    return (
      <div
        role="status"
        className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        <RefreshCw className="size-3 animate-spin" /> 🔄 Sincronizando...
      </div>
    );
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-discipline/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-discipline"
      >
        <Wifi className="size-3" /> 🟢 Conectado <Check className="size-3" /> Tudo sincronizado
      </div>
    );
  }

  return null;
}
