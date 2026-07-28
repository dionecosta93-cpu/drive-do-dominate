import {
  dateKey,
  goalImpact,
  goalCategoryLabel,
  taskAppearsOn,
  taskCompletedOn,
  type CompletedSession,
  type LifeGoal,
  type Task,
} from "@/lib/store";

export interface Suggestion {
  kind: "prioridade" | "meta-esquecida" | "alto-impacto" | "equilibrio";
  title: string;
  detail: string;
  taskId?: string;
  goalId?: string;
}

const priorityWeight = { alta: 3, media: 2, baixa: 1 } as const;

const daysSince = (ts: number) => Math.floor((Date.now() - ts) / 86400000);

/** Analisa tarefas, metas e histórico e gera sugestões práticas. */
export function assistantSuggestions(
  tasks: Task[],
  sessions: CompletedSession[],
  goals: LifeGoal[],
): Suggestion[] {
  const today = dateKey();
  const out: Suggestion[] = [];
  const pending = tasks
    .filter((t) => taskAppearsOn(t, today) && !taskCompletedOn(t.id, sessions, today));

  const goalById = new Map(goals.map((g) => [g.id, g]));
  const impact = goalImpact(goals, tasks, sessions);

  // 1. O que priorizar hoje
  const scored = pending
    .map((t) => {
      const goal = t.goalId ? goalById.get(t.goalId) : undefined;
      const goalBoost = goal ? (goal.status === "em-andamento" ? priorityWeight[goal.priority] * 2 : 1) : 0;
      const rollover = (t.rolloverCount ?? 0) * 2;
      return { task: t, score: priorityWeight[t.priority] * 2 + t.difficulty / 2 + goalBoost + rollover, goal };
    })
    .sort((a, b) => b.score - a.score);

  if (scored[0]) {
    const { task, goal } = scored[0];
    out.push({
      kind: "prioridade",
      title: `Comece por: ${task.name}`,
      detail: goal
        ? `Maior impacto agora. Empurra a meta "${goal.name}"${task.rolloverCount ? ` e já foi adiada ${task.rolloverCount}x.` : "."}`
        : `Maior peso do dia (${task.priority}, dif. ${task.difficulty}/10)${task.rolloverCount ? `, adiada ${task.rolloverCount}x` : ""}.`,
      taskId: task.id,
      goalId: goal?.id,
    });
  }

  // 2. Metas esquecidas
  for (const row of impact.rows) {
    if (row.goal.status !== "em-andamento") continue;
    const idle = row.lastActivity ? daysSince(row.lastActivity) : null;
    if (row.weekCount === 0 && (idle === null || idle >= 7)) {
      out.push({
        kind: "meta-esquecida",
        title: `Meta negligenciada: ${row.goal.name}`,
        detail:
          row.linkedTasks === 0
            ? "Nenhuma tarefa vinculada. Crie uma ação concreta e recorrente para ela."
            : `Sem nenhuma execução nos últimos 7 dias${idle !== null ? ` (última há ${idle} dias)` : ""}.`,
        goalId: row.goal.id,
      });
    }
  }

  // 3. Tarefas de maior impacto no futuro
  const highImpact = scored
    .filter((s) => s.goal && s.goal.status === "em-andamento")
    .slice(0, 3);
  for (const s of highImpact.slice(1)) {
    out.push({
      kind: "alto-impacto",
      title: `${s.task.name} → ${s.goal!.name}`,
      detail: `Essa tarefa constrói diretamente uma meta de prioridade ${s.goal!.priority}.`,
      taskId: s.task.id,
      goalId: s.goal!.id,
    });
  }

  // 4. Equilíbrio de vida
  const last14 = sessions.filter((s) => (s.scheduledDate ?? dateKey(new Date(s.completedAt))) >= dateKey(new Date(Date.now() - 13 * 86400000)));
  const byCat = new Map<string, number>();
  for (const s of last14) byCat.set(s.category, (byCat.get(s.category) ?? 0) + 1);
  const pillars: { key: string; label: string }[] = [
    { key: "trabalho", label: "trabalho" },
    { key: "estudo", label: "estudos" },
    { key: "saude", label: "saúde" },
    { key: "familia", label: "família" },
    { key: "treino", label: "treino" },
    { key: "vida", label: "descanso e vida pessoal" },
  ];
  const missing = pillars.filter((p) => (byCat.get(p.key) ?? 0) === 0);
  if (missing.length > 0) {
    out.push({
      kind: "equilibrio",
      title: "Equilíbrio em risco",
      detail: `Nos últimos 14 dias você não executou nada em: ${missing.map((m) => m.label).join(", ")}. Agende ao menos uma ação em cada pilar.`,
    });
  } else {
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / Math.max(last14.length, 1) > 0.6) {
      out.push({
        kind: "equilibrio",
        title: "Concentração excessiva",
        detail: `${Math.round((top[1] / last14.length) * 100)}% da sua execução recente é "${top[0]}". Redistribua para não sacrificar os outros pilares.`,
      });
    }
  }

  if (impact.mostAttention && impact.mostAttention.weekCount > 0) {
    out.push({
      kind: "alto-impacto",
      title: `Meta em foco: ${impact.mostAttention.goal.name}`,
      detail: `${impact.mostAttention.weekCount} execuções nos últimos 7 dias · ${goalCategoryLabel[impact.mostAttention.goal.category]} · ${impact.mostAttention.pct}% concluída.`,
      goalId: impact.mostAttention.goal.id,
    });
  }

  return out.slice(0, 8);
}
