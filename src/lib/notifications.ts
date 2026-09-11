/**
 * Agendamento nativo de notificações (Android via Capacitor LocalNotifications).
 *
 * Princípios:
 * - Nada depende de setTimeout/página aberta: o próprio Android dispara no horário.
 * - Todo agendamento é recalculado a partir das tarefas (regras de repetição reais),
 *   cancelando o que ficou obsoleto — nunca sobra notificação antiga.
 * - Horários usam Date local do aparelho (sem UTC direto).
 */
import {
  dateKey,
  taskAppearsOn,
  taskCompletedOn,
  useStore,
  type AlarmSound,
  type CompletedSession,
  type Task,
} from "@/lib/store";
import { isNativeApp } from "@/lib/native";
import { scheduleNativeAlarm, cancelNativeAlarm } from "@/lib/native-alarm";

export const CHANNELS = {
  tarefas: "forja-tarefas",
  lembretes: "forja-lembretes",
  motivacao: "forja-motivacao",
} as const;

/** Canais extras: um por som de alarme (Android prende o som ao canal, não dá pra trocar depois). */
const ALARM_SOUND_CHANNELS: Record<Exclude<AlarmSound, "padrao">, string> = {
  suave: "forja-tarefas-suave",
  classico: "forja-tarefas-classico",
  forja: "forja-tarefas-forja",
};

function channelForAlarmSound(sound: AlarmSound | undefined): string {
  if (!sound || sound === "padrao") return CHANNELS.tarefas;
  return ALARM_SOUND_CHANNELS[sound];
}

export const TASK_ACTION_TYPE = "FORJA_TAREFA";

/** Quantos dias à frente pré-agendamos (Android limita a quantidade de alarmes). */
const HORIZON_DAYS = 21;
const MAX_NOTIFICATIONS = 90;

/** Horário fixo da mensagem motivacional diária (24h, hora do aparelho). */
const MOTIVATIONAL_TIME = "07:30";

/** Minutos após o lembrete em que ele repete (insistente), se a tarefa seguir pendente. */
const ECHO_DELAYS_MIN = [2, 4];

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

/** ID numérico estável (int 32 positivo) a partir de uma semente qualquer. */
function stableId(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) % 2000000000;
}

/** ID numérico estável por tarefa+data+tipo (inclui os ecos "lembrete-eco1", "lembrete-eco2"...). */
export function notificationId(taskId: string, date: string, kind: string) {
  return stableId(`${taskId}|${date}|${kind}`);
}

/** ID numérico estável da mensagem motivacional de um dia. */
export function motivationalNotificationId(date: string) {
  return stableId(`motivacao|${date}`);
}

/** Notificações de tarefa (lembrete/eco/cobrança) x demais notificações da Forja. */
function isTaskNotificationExtra(extra: unknown): boolean {
  const kind = (extra as { kind?: string } | undefined)?.kind;
  return kind === "lembrete" || kind === "cobranca";
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

export interface PlannedMotivational {
  id: number;
  title: string;
  body: string;
  at: Date;
  date: string;
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

      // Extra de compras: se a tarefa tem lista vinculada, mostra o que falta comprar.
      let shoppingSuffix = "";
      if (task.shoppingListId) {
        const list = useStore.getState().shoppingLists.find((l) => l.id === task.shoppingListId);
        if (list) {
          const pending = list.items.filter((i) => !i.purchased);
          const estimated = pending.reduce(
            (sum, i) => sum + (i.estimatedPrice ?? 0) * (i.quantity || 1),
            0,
          );
          shoppingSuffix = `\n🛒 ${pending.length} item(ns) pendentes${estimated > 0 ? ` · est. R$ ${estimated.toFixed(2).replace(".", ",")}` : ""}`;
        }
      }

      if (remindAt.getTime() > now.getTime() && task.alarmMode !== "despertador") {
        const title = task.shoppingListId ? "🛒 FORJA — Compras" : "🔥 FORJA";
        const body = `${task.name} às ${task.time}${shoppingSuffix}\n"${antecedencia} ${task.motivation?.trim() || pick(MOTIVATIONAL, task.id + date)}"`;
        const channelId = channelForAlarmSound(task.alarmSound);
        out.push({
          id: notificationId(task.id, date, "lembrete"),
          title,
          body,
          at: remindAt,
          channelId,
          taskId: task.id,
          date,
          kind: "lembrete",
        });

        // Ecos: repete o aviso (insistente, mesmo com o app fechado) enquanto a tarefa
        // não é concluída, sem passar muito do horário de início.
        for (const [idx, mins] of ECHO_DELAYS_MIN.entries()) {
          const echoAt = new Date(remindAt.getTime() + mins * 60000);
          if (echoAt.getTime() > start.getTime() + 15 * 60000) continue;
          out.push({
            id: notificationId(task.id, date, `lembrete-eco${idx + 1}`),
            title,
            body: `🔁 ${body}`,
            at: echoAt,
            channelId,
            taskId: task.id,
            date,
            kind: "lembrete",
          });
        }
      }

      // Cobrança pós-horário: verifica conclusão quando dispara (recalculada a cada sync).
      const cobrancaAt = atLocal(
        date,
        task.endTime || task.time,
        task.endTime ? 15 : (task.estimatedMinutes || 0) + 15,
      );
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

/**
 * Calcula a mensagem motivacional de cada dia do horizonte, sempre no mesmo
 * horário (`MOTIVATIONAL_TIME`). Uma por dia, texto variando por data.
 */
export function planMotivationalNotifications(now = new Date()): PlannedMotivational[] {
  const out: PlannedMotivational[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = dateKey(addDays(now, i));
    const at = atLocal(date, MOTIVATIONAL_TIME);
    if (at.getTime() <= now.getTime()) continue;
    out.push({
      id: motivationalNotificationId(date),
      title: "☀️ Forja",
      body: pick(MOTIVATIONAL, date),
      at,
      date,
    });
  }
  return out;
}

export interface PlannedAlarm {
  id: number;
  title: string;
  body: string;
  at: Date;
  sound: string;
  taskId: string;
  date: string;
}

/**
 * Tarefas em modo "despertador" (tela cheia nativa, toca em loop) ficam fora do
 * pipeline de LocalNotifications — usam o AlarmManager.setAlarmClock direto
 * (ver src/lib/native-alarm.ts). Sem ecos: o loop contínuo já cobre isso.
 */
export function planAlarmClockNotifications(
  tasks: Task[],
  sessions: CompletedSession[],
  now = new Date(),
): PlannedAlarm[] {
  const out: PlannedAlarm[] = [];
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const date = dateKey(addDays(now, i));
    for (const task of tasks) {
      if (task.alarmMode !== "despertador") continue;
      if (task.archived || task.status === "cancelada") continue;
      if (task.alarmMinutesBefore === null || task.alarmMinutesBefore === undefined) continue;
      if (!taskAppearsOn(task, date)) continue;
      if (taskCompletedOn(task.id, sessions, date)) continue;

      const remindAt = atLocal(date, task.time, -task.alarmMinutesBefore);
      if (remindAt.getTime() <= now.getTime()) continue;

      const sound =
        task.alarmSound && task.alarmSound !== "padrao" ? `alarm_${task.alarmSound}` : "";
      out.push({
        id: notificationId(task.id, date, "despertador"),
        title: `⏰ ${task.name}`,
        body: `${task.name} às ${task.time}`,
        at: remindAt,
        sound,
        taskId: task.id,
        date,
      });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_NOTIFICATIONS);
}

// Rastreia o que foi agendado nesta sessão do app pra saber o que cancelar depois
// (AlarmManager não tem uma API pra "listar alarmes pendentes").
let previousAlarmIds = new Set<number>();

export async function syncAlarmClockNotifications(
  tasks: Task[],
  sessions: CompletedSession[],
): Promise<number> {
  if (!isNativeApp()) return 0;
  // Diferente do LocalNotifications, o despertador não passa pelo NotificationManager
  // (é uma Activity de tela cheia via AlarmManager.setAlarmClock) — não depende da
  // permissão de notificação, então não a exige aqui.

  const planned = planAlarmClockNotifications(tasks, sessions);
  const plannedIds = new Set(planned.map((p) => p.id));

  for (const staleId of previousAlarmIds) {
    if (!plannedIds.has(staleId)) await cancelNativeAlarm(staleId);
  }
  for (const alarm of planned) {
    await scheduleNativeAlarm(alarm);
  }
  previousAlarmIds = plannedIds;
  return planned.length;
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
        id: ALARM_SOUND_CHANNELS.suave,
        name: "Forja — Tarefas (som suave)",
        description: "Lembretes das suas missões e compromissos",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "alarm_suave.wav",
      });
      await LocalNotifications.createChannel({
        id: ALARM_SOUND_CHANNELS.classico,
        name: "Forja — Tarefas (som clássico)",
        description: "Lembretes das suas missões e compromissos",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "alarm_classico.wav",
      });
      await LocalNotifications.createChannel({
        id: ALARM_SOUND_CHANNELS.forja,
        name: "Forja — Tarefas (som Forja)",
        description: "Lembretes das suas missões e compromissos",
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: "alarm_forja.mp3",
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
export async function syncTaskNotifications(
  tasks: Task[],
  sessions: CompletedSession[],
): Promise<number> {
  const ln = await plugin();
  if (!ln) return 0;
  try {
    const perm = await ln.checkPermissions();
    if (perm.display !== "granted") return 0;

    const planned = planNotifications(tasks, sessions);
    const plannedIds = new Set(planned.map((p) => p.id));

    const pending = await ln.getPending();
    const ours = pending.notifications.filter((n) => isTaskNotificationExtra(n.extra));
    const stale = ours.filter((n) => !plannedIds.has(n.id));
    if (stale.length) await ln.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

    const pendingIds = new Set(ours.map((n) => n.id));
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

/**
 * Reagenda a mensagem motivacional diária (uma por dia, sempre em MOTIVATIONAL_TIME):
 * cancela dias que saíram do horizonte e garante os que faltam. Mesma lógica de
 * sincronização da tarefa, só que sem depender de tarefas/sessões.
 */
export async function syncMotivationalNotifications(): Promise<number> {
  const ln = await plugin();
  if (!ln) return 0;
  try {
    const perm = await ln.checkPermissions();
    if (perm.display !== "granted") return 0;

    const planned = planMotivationalNotifications();
    const plannedIds = new Set(planned.map((p) => p.id));

    const pending = await ln.getPending();
    const ours = pending.notifications.filter(
      (n) => (n.extra as { kind?: string } | undefined)?.kind === "motivacao",
    );
    const stale = ours.filter((n) => !plannedIds.has(n.id));
    if (stale.length) await ln.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

    const pendingIds = new Set(ours.map((n) => n.id));
    const toSchedule = planned.filter((p) => !pendingIds.has(p.id));
    if (toSchedule.length) {
      await ln.schedule({
        notifications: toSchedule.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          channelId: CHANNELS.motivacao,
          smallIcon: "ic_stat_forja",
          schedule: { at: p.at, allowWhileIdle: true },
          extra: { forja: true, kind: "motivacao", date: p.date },
        })),
      });
    }
    return planned.length;
  } catch (e) {
    console.warn("[notifications] motivational sync failed", e);
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
export async function listenNotificationActions(
  handler: (t: NotificationTap) => void,
): Promise<() => void> {
  const ln = await plugin();
  if (!ln) return () => {};
  const sub = await ln.addListener("localNotificationActionPerformed", (event) => {
    const extra = (event.notification.extra ?? {}) as {
      taskId?: string;
      date?: string;
      kind?: string;
    };
    handler({ ...extra, actionId: event.actionId });
  });
  return () => void sub.remove();
}
