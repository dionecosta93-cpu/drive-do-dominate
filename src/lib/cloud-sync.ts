import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

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
  "discipline",
  "disciplineLog",
  "dailyMinimum",
  "lastPenaltyDate",
  "claimedMissions",
  "challenges",

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

async function pushNow(userId: string) {
  if (hydrating) return;
  try {
    pushing = true;
    const snap = snapshotFromState(useStore.getState());
    await supabase
      .from("user_data")
      .upsert({ user_id: userId, data: snap as never, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("[cloud-sync] push failed", e);
  } finally {
    pushing = false;
  }
}

function scheduleDebouncedPush() {
  if (!currentUserId) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  const uid = currentUserId;
  debounceTimer = setTimeout(() => pushNow(uid), 1500);
}

export async function attachCloudSyncForUser(userId: string) {
  if (currentUserId === userId) return;
  detachCloudSync();
  currentUserId = userId;
  hydrating = true;
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.data && typeof data.data === "object") {
      useStore.setState(data.data as never);
    } else {
      // First sign-in: seed cloud row with current local state.
      await pushNow(userId);
    }
  } catch (e) {
    console.warn("[cloud-sync] hydrate failed", e);
  } finally {
    hydrating = false;
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
