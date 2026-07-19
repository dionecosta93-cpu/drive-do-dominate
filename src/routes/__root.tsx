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
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { attachCloudSyncForUser, detachCloudSync } from "@/lib/cloud-sync";
import { useStore } from "@/lib/store";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "@/components/bottom-nav";


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
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
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
      { name: "description", content: "Elimine a procrastinação e construa disciplina absoluta. Rotina, foco, metas, hábitos e recompensas — tudo sincronizado na nuvem." },
      { name: "author", content: "Disciplina Absoluta" },
      { property: "og:title", content: "Disciplina Absoluta — Domine seu dia" },
      { property: "og:description", content: "Elimine a procrastinação e construa disciplina absoluta. Rotina, foco, metas, hábitos e recompensas — tudo sincronizado na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Disciplina Absoluta — Domine seu dia" },
      { name: "twitter:description", content: "Elimine a procrastinação e construa disciplina absoluta." },

    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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

  useEffect(() => {
    // Hydrate current session immediately (in case page loaded already signed in).
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void attachCloudSyncForUser(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        detachCloudSync();
        useStore.getState().reset();
        router.invalidate();
        return;
      }
      if (session?.user) void attachCloudSyncForUser(session.user.id);
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-[440px] min-h-screen flex flex-col">
          <main className="flex-1 pb-24">
            <Outlet />
          </main>
          {!hideNav && <BottomNav />}
        </div>
      </div>
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}

