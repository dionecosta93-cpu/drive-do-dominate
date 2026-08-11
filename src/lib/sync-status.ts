/**
 * Estado global e leve do status de rede/sincronização.
 * Usado pelo indicador visual (📡 Offline / 🔄 Sincronizando / ✓ Sincronizado).
 */
export type SyncState = "offline" | "sincronizando" | "sincronizado" | "pendente";

let state: SyncState = "sincronizado";
let lastSyncAt: number | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const getSyncState = () => state;
export const getLastSyncAt = () => lastSyncAt;

export function setSyncState(next: SyncState) {
  if (next === state) return;
  state = next;
  if (next === "sincronizado") lastSyncAt = Date.now();
  emit();
}

export function subscribeSyncState(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);
