/**
 * Ponte pro plugin nativo AlarmPlugin (android/.../AlarmPlugin.java) — despertador de
 * tela cheia, toca em loop até "Desligar", mesmo com o aparelho bloqueado.
 * Sem plugin nativo (web/dev), as chamadas viram no-op silencioso.
 */
import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/native";

interface AlarmItem {
  id: number;
  atMillis: string;
  title: string;
  body: string;
  sound: string;
  taskId: string;
  date: string;
}

interface AlarmPluginApi {
  schedule(options: AlarmItem): Promise<void>;
  cancel(options: { id: number }): Promise<void>;
  persistPlanned(options: { items: AlarmItem[] }): Promise<void>;
}

const AlarmPlugin = registerPlugin<AlarmPluginApi>("AlarmPlugin");

export async function scheduleNativeAlarm(opts: {
  id: number;
  at: Date;
  title: string;
  body: string;
  sound: string;
  taskId: string;
  date: string;
}): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await AlarmPlugin.schedule({
      id: opts.id,
      atMillis: String(opts.at.getTime()),
      title: opts.title,
      body: opts.body,
      sound: opts.sound,
      taskId: opts.taskId,
      date: opts.date,
    });
  } catch {
    /* ignora falha do plugin nativo */
  }
}

export async function cancelNativeAlarm(id: number): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await AlarmPlugin.cancel({ id });
  } catch {
    /* ignora */
  }
}

/**
 * Salva a lista completa de despertadores planejados pro BootReceiver conseguir
 * re-agendar tudo sozinho se o aparelho reiniciar (AlarmManager esquece tudo nesse
 * caso, e o BootReceiver não tem como ler o localStorage/JS).
 */
export async function persistPlannedAlarms(
  items: Array<{
    id: number;
    at: Date;
    title: string;
    body: string;
    sound: string;
    taskId: string;
    date: string;
  }>,
): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await AlarmPlugin.persistPlanned({
      items: items.map((i) => ({
        id: i.id,
        atMillis: String(i.at.getTime()),
        title: i.title,
        body: i.body,
        sound: i.sound,
        taskId: i.taskId,
        date: i.date,
      })),
    });
  } catch {
    /* ignora */
  }
}
