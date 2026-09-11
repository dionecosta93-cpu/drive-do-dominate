import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachCloudSyncForUser, detachCloudSync } from "@/lib/cloud-sync";
import { dateKey, taskCompletedOn, todaysTasks, useStore } from "@/lib/store";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { BottomNav } from "@/components/bottom-nav";
import { AssistantFab } from "@/components/assistant-fab";
import { OfflineBanner } from "@/components/offline-banner";
import { initNativeShell, isNativeApp, notify } from "@/lib/native";
import {
  syncTaskNotifications,
  syncMotivationalNotifications,
  syncAlarmClockNotifications,
  listenNotificationActions,
} from "@/lib/notifications";
import { NotificationPermissionCard } from "@/components/notification-permission";
import { setupServiceWorker } from "@/lib/pwa";
import { track, setAnalyticsUser } from "@/lib/track";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Volte ao caminho e continue firme na sua disciplina.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo travou aqui.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não pare. Tente de novo — a disciplina não espera.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050505" },
      { title: "Disciplina Absoluta — Domine seu dia" },
      {
        name: "description",
        content:
          "Elimine a procrastinação e construa disciplina absoluta. Rotina, foco, metas, hábitos e recompensas — tudo sincronizado na nuvem.",
      },
      { name: "author", content: "Disciplina Absoluta" },
      { property: "og:title", content: "Disciplina Absoluta — Domine seu dia" },
      {
        property: "og:description",
        content:
          "Elimine a procrastinação e construa disciplina absoluta. Rotina, foco, metas, hábitos e recompensas — tudo sincronizado na nuvem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Disciplina Absoluta — Domine seu dia" },
      {
        name: "twitter:description",
        content: "Elimine a procrastinação e construa disciplina absoluta.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideNav = pathname.startsWith("/focus") || pathname.startsWith("/auth");
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const firedAlarms = useRef(new Set<string>());

  useEffect(() => {
    track("app_open");
    // Hydrate current session immediately (in case page loaded already signed in).
    // getSession() lê a sessão local sem depender de rede (funciona offline).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAnalyticsUser(data.session.user.id);
        void attachCloudSyncForUser(data.session.user.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        setAnalyticsUser(null);
        detachCloudSync();
        useStore.getState().reset();
        router.invalidate();
        return;
      }
      if (session?.user) {
        setAnalyticsUser(session.user.id);
        void attachCloudSyncForUser(session.user.id);
      }
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    const ring = () => {
      try {
        const AC =
          (
            window as unknown as {
              AudioContext: typeof AudioContext;
              webkitAudioContext?: typeof AudioContext;
            }
          ).AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ac = new AC();
        [880, 660, 880].forEach((freq, i) => {
          const oscillator = ac.createOscillator();
          const gain = ac.createGain();
          oscillator.frequency.value = freq;
          oscillator.type = "sine";
          oscillator.connect(gain);
          gain.connect(ac.destination);
          const start = ac.currentTime + i * 0.18;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
          oscillator.start(start);
          oscillator.stop(start + 0.17);
        });
      } catch {
        /* ignore unavailable audio */
      }
    };

    const checkAlarms = () => {
      const today = dateKey();
      const now = Date.now();
      for (const task of todaysTasks(tasks, today)) {
        if (!task.alarmMinutesBefore || taskCompletedOn(task.id, sessions, today)) continue;
        const alarmAt =
          new Date(`${today}T${task.time}:00`).getTime() - task.alarmMinutesBefore * 60_000;
        const key = `${today}:${task.id}:${task.alarmMinutesBefore}`;
        if (now < alarmAt || now > alarmAt + 60_000 || firedAlarms.current.has(key)) continue;
        firedAlarms.current.add(key);
        ring();
        const message = `${task.name} começa às ${task.time}`;
        import("sonner").then(({ toast }) => toast(`Despertador: ${message}`, { duration: 10000 }));
        void notify("Forja", message);
      }
    };

    checkAlarms();
    const interval = window.setInterval(checkAlarms, 30_000);
    return () => window.clearInterval(interval);
  }, [tasks, sessions]);

  useEffect(() => {
    void initNativeShell();
    setupServiceWorker();
  }, []);

  // Agendamento NATIVO (Android): recalcula tudo a cada mudança de tarefa/conclusão.
  useEffect(() => {
    if (!isNativeApp()) return;
    const t = window.setTimeout(() => {
      void syncTaskNotifications(tasks, sessions);
      void syncAlarmClockNotifications(tasks, sessions);
    }, 800);
    return () => window.clearTimeout(t);
  }, [tasks, sessions]);

  // Mensagem motivacional diária (horário fixo): agenda no início e reagenda ao reabrir.
  useEffect(() => {
    if (!isNativeApp()) return;
    void syncMotivationalNotifications();
  }, []);

  // Reagenda ao abrir/voltar do segundo plano (cobre reinicialização do aparelho).
  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void import("@capacitor/app").then(({ App }) =>
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          void syncTaskNotifications(useStore.getState().tasks, useStore.getState().sessions);
          void syncMotivationalNotifications();
          void syncAlarmClockNotifications(useStore.getState().tasks, useStore.getState().sessions);
        }
      }).then((h) => {
        remove = () => void h.remove();
      }),
    );
    return () => remove?.();
  }, []);

  // Toque na notificação: abre a tarefa ou executa a ação escolhida.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanup: (() => void) | undefined;
    void listenNotificationActions(({ taskId, date, actionId }) => {
      if (!taskId) return;
      const st = useStore.getState();
      const day = date ?? dateKey();
      if (actionId === "concluir") {
        st.completeTaskForDate(taskId, day);
        void import("sonner").then(({ toast }) => toast.success("Tarefa concluída. 🔥"));
        return;
      }
      if (actionId === "dispensar") {
        st.dismissMissed(taskId, day);
        return;
      }
      // "reagendar" e toque simples abrem os detalhes da tarefa.
      void router.navigate({ to: "/tasks/$id/edit", params: { id: taskId } });
    }).then((c) => {
      cleanup = c;
    });
    return () => cleanup?.();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <OfflineBanner />
        <NotificationPermissionCard />
        <div className="mx-auto max-w-[440px] min-h-screen flex flex-col">
          <main className="flex-1 pb-24">
            <Outlet />
          </main>
          {!hideNav && <BottomNav />}
          {!hideNav && <AssistantFab />}
        </div>
      </div>
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
