/**
 * Camada fina entre o app web e o empacotamento Android (Capacitor).
 * No navegador tudo continua usando as APIs web — nada muda.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

const cap = (): CapacitorGlobal | undefined =>
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

export const isNativeApp = (): boolean => Boolean(cap()?.isNativePlatform?.());

/** Pede permissão de notificação (Android 13+ exige pedido explícito). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;
      const asked = await LocalNotifications.requestPermissions();
      return asked.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Dispara uma notificação imediata (nativa no Android, Web Notification no navegador). */
export async function notify(title: string, body: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 300) },
          },
        ],
      });
    } catch {
      /* ignora falha de notificação */
    }
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignora */
  }
}

/** Ajustes visuais nativos: some com a splash e alinha a status bar ao tema escuro. */
export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#050505" });
    await SplashScreen.hide();
  } catch {
    /* plugins ausentes no navegador */
  }
}
