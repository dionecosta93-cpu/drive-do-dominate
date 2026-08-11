/**
 * Agendamento nativo de notificações (Android via Capacitor LocalNotifications).
 *
 * Princípios:
 * - Nada depende de setTimeout/página aberta: o próprio Android dispara no horário.
 * - Todo agendamento é recalculado a partir das tarefas (regras de repetição reais),
 *   cancelando o que ficou obsoleto — nunca sobra notificação antiga.
 * - Horários usam Date local do aparelho (sem UTC direto).
 */
import { dateKey, taskAppearsOn, taskCompletedOn, type CompletedSession, type Task } from "@/lib/store";
import { isNativeApp } from "@/lib/native";

export const CHANNELS = {
  tarefas: "forja-tarefas",
  lembretes: "forja-lembretes",
  motivacao: "forja-motivacao",
} as const;

export const TASK_ACTION_TYPE = "FORJA_TAREFA";

/** Quantos dias à frente pré-agendamos (Android limita a quantidade de alarmes). */
const HORIZON_DAYS = 21;
const MAX_NOTIFICATIONS = 60;

const MOTIVATIONAL = [
  "Você não precisa estar motivado. Precisa cumprir o que decidiu.",
  "Disciplina é fazer mesmo quando não existe vontade.",
  "Um dia ruim não apaga seu progresso. Comece agora.",
  "Comece pequeno, mas comece. O resto é consequência.",
  "Volte para a Forja e cumpra o que decidiu.",
  "O incômodo passa em 5 minutos. O arrependimento dura o dia inteiro.",
];

const MISSED_LINES = [
  "Você deixou uma tarefa para trás. Ainda pode recuperar o ritmo.",
  "Não terminou ainda? Recupere agora — o dia não acabou.",
  "Disciplina não é nunca falhar. É voltar depois da falha.",
];

const pick = (list: string[], seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return list[h % list.length]!;
};

/** ID numérico estável (int 32 positivo) por tarefa+data+tipo. */
export function notificationId(taskId: string, date: string, kind: "lembrete" | "cobranca") {
  const seed = `${taskId}|${date}|${kind}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) % 2000000000;
}

const atLocal = (date: string, time: string, offsetMinutes = 0) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
  dt.setMinutes(dt.getMinutes() + offsetMinutes);
  return dt;
};

const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

export interface PlannedNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
  channelId: string;
  taskId: string;
  date: string;
  kind: "lembrete" | "cobranca";
}

/**
 * Calcula todas as notificações que devem existir agora.
 * Exportado para permitir verificação/teste sem depender do Android.
 */
export function planNotifications(
  tasks: Task[],
  sessions: CompletedSession[],
  now = new Date(),
): PlannedNotification[] {
  const out: PlannedNotification[] = [];

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = dateKey(addDays(now, i));
    for (const task of tasks) {
      if (task.archived || task.status === "cancelada") continue;
      if (task.alarmMinutesBefore === null || task.alarmMinutesBefore === undefined) continue;
      if (!taskAppearsOn(task, date)) continue;
      if (taskCompletedOn(task.id, sessions, date)) continue;

      const start = atLocal(date, task.time);
      const remindAt = atLocal(date, task.time, -task.alarmMinutesBefore);
      const antecedencia =
        task.alarmMinutesBefore === 0
          ? "Começa agora."
          : task.alarmMinutesBefore >= 1440
            ? "É amanhã."
            : task.alarmMinutesBefore >= 60
              ? `Daqui a ${Math.round(task.alarmMinutesBefore / 60)}h começa.`
              : `Daqui a ${task.alarmMinutesBefore} minutos começa.`;

      if (remindAt.getTime() > now.getTime()) {
        out.push({
          id: notificationId(task.id, date, "lembrete"),
          title: "🔥 FORJA",
          body: `${task.name} às ${task.time}\n"${antecedencia} ${task.motivation?.trim() || pick(MOTIVATIONAL, task.id + date)}"`,
          at: remindAt,
          channelId: CHANNELS.tarefas,
          taskId: task.id,
          date,
          kind: "lembrete",
        });
      }

      // Cobrança pós-horário: verifica conclusão quando dispara (recalculada a cada sync).
      const cobrancaAt = atLocal(date, task.endTime || task.time, task.endTime ? 15 : (task.estimatedMinutes || 0) + 15);
      if (cobrancaAt.getTime() > now.getTime() && cobrancaAt.getTime() > start.getTime()) {
        out.push({
          id: notificationId(task.id, date, "cobranca"),
          title: "⚠️ Tarefa não concluída",
          body: `${task.name} — ${task.time}\n"${pick(MISSED_LINES, task.id + date)}"`,
          at: cobrancaAt,
          channelId: CHANNELS.lembretes,
          taskId: task.id,
          date,
          kind: "cobranca",
        });
      }
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_NOTIFICATIONS);
}

let ready = false;

async function plugin() {
  if (!isNativeApp()) return null;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (!ready) {
      await LocalNotifications.createChannel({
        id: CHANNELS.tarefas,
        name: "Forja — Tarefas",
        description: "Lembretes das suas missões e compromissos",
        importance: 5,
        visibility: 1,
        vibration: true,
      });
      await LocalNotifications.createChannel({
        id: CHANNELS.lembretes,
        name: "Forja — Lembretes",
        description: "Cobranças de tarefas não concluídas",
        importance: 4,
        visibility: 1,
        vibration: true,
      });
      await LocalNotifications.createChannel({
        id: CHANNELS.motivacao,
        name: "Forja — Motivação",
        description: "Mensagens de disciplina e motivação",
        importance: 3,
        visibility: 1,
      });
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: TASK_ACTION_TYPE,
            actions: [
              { id: "concluir", title: "Concluir" },
              { id: "reagendar", title: "Reagendar" },
              { id: "dispensar", title: "Dispensar", destructive: true },
            ],
          },
        ],
      });
      ready = true;
    }
    return LocalNotifications;
  } catch {
    return null;
  }
}

/** Permissão concedida? (sem pedir) */
export async function notificationsGranted(): Promise<boolean> {
  const ln = await plugin();
  if (!ln) {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    return Notification.permission === "granted";
  }
  const perm = await ln.checkPermissions();
  return perm.display === "granted";
}

/**
 * Reagenda TODAS as notificações de tarefas: cancela as antigas da Forja
 * e cria as que valem agora. Chamada em toda mudança de tarefa/conclusão,
 * na abertura do app e ao voltar do segundo plano.
 */
export async function syncTaskNotifications(tasks: Task[], sessions: CompletedSession[]): Promise<number> {
  const ln = await plugin();
  if (!ln) return 0;
  try {
    const perm = await ln.checkPermissions();
    if (perm.display !== "granted") return 0;

    const planned = planNotifications(tasks, sessions);
    const plannedIds = new Set(planned.map((p) => p.id));

    const pending = await ln.getPending();
    const stale = pending.notifications.filter((n) => !plannedIds.has(n.id));
    if (stale.length) await ln.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

    const pendingIds = new Set(pending.notifications.map((n) => n.id));
    const toSchedule = planned.filter((p) => !pendingIds.has(p.id));
    if (toSchedule.length) {
      await ln.schedule({
        notifications: toSchedule.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          channelId: p.channelId,
          actionTypeId: TASK_ACTION_TYPE,
          smallIcon: "ic_stat_forja",
          schedule: { at: p.at, allowWhileIdle: true },
          extra: { forja: true, taskId: p.taskId, date: p.date, kind: p.kind },
        })),
      });
    }
    return planned.length;
  } catch (e) {
    console.warn("[notifications] sync failed", e);
    return 0;
  }
}

/** Cancela tudo que a Forja agendou (ex.: logout). */
export async function cancelAllTaskNotifications() {
  const ln = await plugin();
  if (!ln) return;
  try {
    const pending = await ln.getPending();
    if (pending.notifications.length) {
      await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* ignora */
  }
}

export interface NotificationTap {
  taskId?: string;
  date?: string;
  kind?: string;
  actionId: string;
}

/** Escuta toques/ações nas notificações. Retorna função de limpeza. */
export async function listenNotificationActions(handler: (t: NotificationTap) => void): Promise<() => void> {
  const ln = await plugin();
  if (!ln) return () => {};
  const sub = await ln.addListener("localNotificationActionPerformed", (event) => {
    const extra = (event.notification.extra ?? {}) as { taskId?: string; date?: string; kind?: string };
    handler({ ...extra, actionId: event.actionId });
  });
  return () => void sub.remove();
}
