import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { isOnline, setSyncState } from "@/lib/sync-status";

// Fields we sync to the cloud (mirrors zustand persisted state).
const SYNC_KEYS = [
  "userName",
  "tasks",
  "completedToday",
  "sessions",
  "xp",
  "streak",
  "lastActiveDay",
  "longestStreak",
  "achievements",
  "weeklyGoal",
  "dailyMissionCompleted",
  "onboarded",
  "lifeGoals",
  "books",
  "readingSessions",
  "readingGoals",
  "readingNotes",
  "discipline",
  "disciplineLog",
  "dailyMinimum",
  "lastPenaltyDate",
  "claimedMissions",
  "challenges",
  "transactions",
  "assistantMessages",
  "dismissedMissed",

] as const;


type SyncSnapshot = Partial<Record<(typeof SYNC_KEYS)[number], unknown>>;

const snapshotFromState = (s: ReturnType<typeof useStore.getState>): SyncSnapshot => {
  const out: SyncSnapshot = {};
  for (const k of SYNC_KEYS) (out as Record<string, unknown>)[k] = (s as unknown as Record<string, unknown>)[k];
  return out;
};

let currentUserId: string | null = null;
let unsub: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let hydrating = false;
/** Alterações feitas offline aguardando envio. */
let pendingLocalChanges = false;
let onlineListenerAttached = false;

async function pushNow(userId: string) {
  if (hydrating) return;
  if (!isOnline()) {
    pendingLocalChanges = true;
    setSyncState("offline");
    return;
  }
  try {
    pushing = true;
    setSyncState("sincronizando");
    const snap = snapshotFromState(useStore.getState());
    const { error } = await supabase
      .from("user_data")
      .upsert({ user_id: userId, data: snap as never, updated_at: new Date().toISOString() });
    if (error) throw error;
    pendingLocalChanges = false;
    setSyncState("sincronizado");
  } catch (e) {
    console.warn("[cloud-sync] push failed", e);
    pendingLocalChanges = true;
    setSyncState(isOnline() ? "pendente" : "offline");
  } finally {
    pushing = false;
  }
}

function scheduleDebouncedPush() {
  if (!currentUserId) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  const uid = currentUserId;
  pendingLocalChanges = true;
  if (!isOnline()) {
    setSyncState("offline");
    return;
  }
  debounceTimer = setTimeout(() => pushNow(uid), 1500);
}

/** Envia imediatamente o que ficou pendente (usado quando a internet volta). */
export async function flushPendingSync() {
  if (!currentUserId) return;
  if (!isOnline()) {
    setSyncState("offline");
    return;
  }
  if (!pendingLocalChanges) {
    setSyncState("sincronizado");
    return;
  }
  await pushNow(currentUserId);
}

function attachConnectivityListeners() {
  if (onlineListenerAttached || typeof window === "undefined") return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    setSyncState(pendingLocalChanges ? "sincronizando" : "sincronizado");
    void flushPendingSync();
  });
  window.addEventListener("offline", () => setSyncState("offline"));
}

export async function attachCloudSyncForUser(userId: string) {
  attachConnectivityListeners();
  if (currentUserId === userId) return;
  detachCloudSync();
  currentUserId = userId;
  hydrating = true;
  if (!isOnline()) {
    // Offline: mantemos os dados locais já persistidos e sincronizamos depois.
    hydrating = false;
    setSyncState("offline");
  } else {
    try {
      setSyncState("sincronizando");
      const { data, error } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data?.data && typeof data.data === "object") {
        useStore.setState(data.data as never);
        setSyncState("sincronizado");
      } else {
        // First sign-in: seed cloud row with current local state.
        hydrating = false;
        await pushNow(userId);
      }
    } catch (e) {
      console.warn("[cloud-sync] hydrate failed", e);
      setSyncState(isOnline() ? "pendente" : "offline");
    } finally {
      hydrating = false;
    }
  }

  unsub = useStore.subscribe(() => {
    if (pushing || hydrating) return;
    scheduleDebouncedPush();
  });
}

export function detachCloudSync() {
  if (unsub) unsub();
  unsub = null;
  currentUserId = null;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
}
