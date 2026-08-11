import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, RefreshCw, Check, Wifi } from "lucide-react";
import { getSyncState, subscribeSyncState } from "@/lib/sync-status";
import { flushPendingSync } from "@/lib/cloud-sync";

/**
 * Indicador de conexão e sincronização.
 * 📡 Offline → 🔄 Sincronizando... → ✓ Tudo sincronizado (some sozinho).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const syncState = useSyncExternalStore(
    subscribeSyncState,
    getSyncState,
    () => "sincronizado" as const,
  );

  useEffect(() => {
    const setFrom = (isOffline: boolean) => {
      setOffline(isOffline);
      if (!isOffline) {
        setJustReconnected(true);
        void flushPendingSync();
        window.setTimeout(() => setJustReconnected(false), 4000);
      }
    };
    setOffline(!navigator.onLine);
    const on = () => setFrom(false);
    const off = () => setFrom(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (offline) {
    return (
      <div
        role="status"
        className="sticky top-0 z-[70] flex items-center justify-center gap-2 bg-struggle px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white"
      >
        <WifiOff className="size-3.5" />
        📡 Offline — suas alterações ficam salvas e sincronizam depois.
      </div>
    );
  }

  if (syncState === "sincronizando" || syncState === "pendente") {
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
