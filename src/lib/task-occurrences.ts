import { supabase } from "@/integrations/supabase/client";
import type { CompletedSession } from "@/lib/store";

export async function saveTaskOccurrence(session: CompletedSession) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId || !session.scheduledDate) return;

  const { error } = await supabase.from("task_occurrences").upsert(
    {
      user_id: userId,
      task_local_id: session.taskId,
      task_name: session.taskName,
      occurrence_date: session.scheduledDate,
      scheduled_time: session.scheduledTime ?? null,
      completed_time: session.completedTime ?? null,
      timing_delta_minutes: session.timingDeltaMinutes ?? null,
      status: session.status ?? "concluida",
      spent_seconds: session.spentSeconds,
      pauses: session.pauses,
      xp: session.xp,
    },
    { onConflict: "user_id,task_local_id,occurrence_date" },
  );

  if (error) console.warn("[task-occurrences] save failed", error);
}