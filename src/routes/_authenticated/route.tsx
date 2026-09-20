import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/error-reporting";
import { canTrustStoredSession } from "@/lib/offline-session";

const AUTH_CHECK_TIMEOUT_MS = 2500;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() lê a sessão persistida localmente na maioria das vezes (com token
    // expirado ele tenta renovar pela rede; ver canTrustStoredSession) —
    // getUser() sempre valida contra o servidor e falhava aqui quando offline,
    // te chutando de volta pro /auth mesmo com sessão válida salva no aparelho.
    // Mas getSession() pode tentar renovar o token pela rede se ele estiver
    // perto de expirar, e esse beforeLoad roda em TODA navegação dentro de
    // /_authenticated — sem internet (ou com rede lenta), isso travava a troca
    // de tela por vários segundos, presa na tela anterior. Não vale a pena
    // esperar mais que isso: se não resolver a tempo, segue em frente em vez
    // de travar a navegação (sem deslogar à toa — a sessão local continua lá,
    // só não deu tempo de confirmar/renovar agora).
    const timedOut = Symbol("auth-check-timeout");
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<typeof timedOut>((resolve) =>
        setTimeout(() => resolve(timedOut), AUTH_CHECK_TIMEOUT_MS),
      ),
    ]);
    if (result === timedOut) return {};
    const { data, error } = result;
    if (data.session) return { user: data.session.user };
    // Sem internet + access token expirado, getSession() falha ao renovar e devolve
    // sessão nula — mas a sessão salva continua válida; não expulsa pro login.
    if (canTrustStoredSession(error)) return {};
    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
  pendingComponent: AuthPending,
  errorComponent: AuthedRouteError,
});

function AuthPending() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div
        className="size-8 rounded-full border-2 border-border border-t-discipline animate-spin"
        aria-label="Carregando"
      />
    </div>
  );
}

/**
 * Contém falhas de uma tela específica sem derrubar o app inteiro:
 * a navegação inferior continua utilizável e o usuário pode tentar de novo.
 */
function AuthedRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportError(error, { boundary: "authenticated_route_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-heading font-black uppercase">Esta tela travou.</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground text-pretty">
        O resto do app continua funcionando. Recarregue esta seção e siga firme.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-heading font-black text-black active:scale-[0.98] transition-transform"
        >
          <RotateCcw className="size-4" /> Recarregar
        </button>
        <button
          onClick={() => router.navigate({ to: "/" })}
          className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground"
        >
          Início
        </button>
      </div>
    </div>
  );
}
