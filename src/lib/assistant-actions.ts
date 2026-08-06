import { dateKey, useStore, type Category, type Priority, type Repetition, type Task, type TransactionKind } from "@/lib/store";

export interface AssistantAction {
  type: string;
  label: string;
  payload: string;
}

const parse = (a: AssistantAction): Record<string, unknown> => {
  try {
    const p = JSON.parse(a.payload || "{}");
    return typeof p === "object" && p ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const str = (o: Record<string, unknown>, k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
const num = (o: Record<string, unknown>, k: string) => (typeof o[k] === "number" ? (o[k] as number) : undefined);

/** Applies an assistant action to the local store. Returns a human message. */
export function applyAssistantAction(action: AssistantAction): string {
  const s = useStore.getState();
  const p = parse(action);

  switch (action.type) {
    case "criar_tarefa": {
      const name = str(p, "name");
      if (!name) return "Ação inválida: tarefa sem nome.";
      const est = num(p, "estimatedMinutes") ?? 30;
      const task = s.addTask({
        name,
        description: str(p, "description"),
        category: (str(p, "category") as Category) ?? "vida",
        priority: (str(p, "priority") as Priority) ?? "media",
        time: str(p, "time") ?? "08:00",
        endTime: str(p, "endTime"),
        estimatedMinutes: est,
        maxMinutes: num(p, "maxMinutes") ?? est + 15,
        difficulty: Math.min(10, Math.max(1, num(p, "difficulty") ?? 5)),
        repetition: (str(p, "repetition") as Repetition) ?? "nenhuma",
        weekdays: Array.isArray(p["weekdays"]) ? (p["weekdays"] as number[]) : undefined,
        scheduledDate: str(p, "scheduledDate") ?? dateKey(),
        alarmMinutesBefore: num(p, "alarmMinutesBefore") ?? null,
        motivation: str(p, "motivation"),
        notes: str(p, "notes"),
        reward: "",
        consequence: "",
      });
      return `Tarefa criada: ${task.name}`;
    }
    case "atualizar_tarefa": {
      const id = str(p, "id");
      const patch = (p["patch"] ?? {}) as Partial<Task>;
      if (!id || !s.tasks.some((t) => t.id === id)) return "Tarefa não encontrada.";
      s.updateTask(id, patch);
      return "Tarefa atualizada.";
    }
    case "excluir_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      s.removeTask(id);
      return "Tarefa excluída.";
    }
    case "mover_tarefa": {
      const id = str(p, "id");
      const date = str(p, "date");
      if (!id || !date) return "Dados insuficientes para mover.";
      s.moveTask(id, date, str(p, "time"));
      return `Tarefa movida para ${date}.`;
    }
    case "concluir_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      s.completeTaskForDate(id, str(p, "date") ?? dateKey());
      return "Tarefa concluída.";
    }
    case "registrar_transacao": {
      const amount = num(p, "amount");
      if (!amount) return "Valor inválido.";
      const tx = s.addTransaction({
        kind: ((str(p, "kind") as TransactionKind) ?? "despesa"),
        amount,
        category: str(p, "category") ?? "outros",
        description: str(p, "description"),
        date: str(p, "date") ?? dateKey(),
      });
      return `${tx.kind === "receita" ? "Receita" : "Despesa"} registrada.`;
    }
    case "excluir_transacao": {
      const id = str(p, "id");
      if (!id) return "Lançamento não encontrado.";
      s.removeTransaction(id);
      return "Lançamento excluído.";
    }
    case "criar_meta": {
      const name = str(p, "name");
      if (!name) return "Meta sem nome.";
      s.addLifeGoal({
        name,
        description: str(p, "description"),
        category: "pessoal" as never,
        priority: "media",
        targetDate: str(p, "deadline"),
      });
      return `Meta criada: ${name}`;
    }
    default:
      return "Ação desconhecida.";
  }
}

/** Compact snapshot of app state sent to the assistant as context. */
export function buildAssistantContext(): string {
  const s = useStore.getState();
  const today = dateKey();
  const monthPrefix = today.slice(0, 7);
  const monthTx = s.transactions.filter((t) => t.date.startsWith(monthPrefix));
  const income = monthTx.filter((t) => t.kind === "receita").reduce((a, b) => a + b.amount, 0);
  const expense = monthTx.filter((t) => t.kind === "despesa").reduce((a, b) => a + b.amount, 0);

  return JSON.stringify({
    hoje: today,
    usuario: s.userName || null,
    disciplina: s.discipline,
    xp: s.xp,
    streak: s.streak,
    tarefas: s.tasks.slice(0, 60).map((t) => ({
      id: t.id,
      nome: t.name,
      hora: t.time,
      data: t.scheduledDate,
      repeticao: t.repetition,
      categoria: t.category,
      prioridade: t.priority,
      dificuldade: t.difficulty,
    })),
    concluidas_recentes: s.sessions.slice(-15).map((x) => ({ tarefa: x.taskName, data: x.scheduledDate ?? null })),
    metas: s.lifeGoals.map((g) => ({ id: g.id, nome: g.name, prazo: g.targetDate ?? null, status: g.status })),
    financas_mes: {
      receitas: income,
      despesas: expense,
      saldo: income - expense,
      lancamentos: monthTx.slice(0, 60).map((t) => ({
        id: t.id,
        tipo: t.kind,
        valor: t.amount,
        categoria: t.category,
        descricao: t.description ?? null,
        data: t.date,
      })),
    },
  });
}
