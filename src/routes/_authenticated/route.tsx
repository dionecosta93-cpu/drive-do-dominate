import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/error-reporting";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
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
