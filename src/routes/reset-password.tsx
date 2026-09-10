import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { track } from "@/lib/track";

/**
 * Destino do link de "redefinir senha" enviado por e-mail.
 * Rota separada de /auth (sem o guard que redireciona usuário logado) porque,
 * ao abrir o link, o Supabase cria uma sessão temporária de recuperação.
 */
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // O SDK troca o token da URL por uma sessão automaticamente (detectSessionInUrl).
    let done = false;
    const settle = (hasSession: boolean) => {
      if (done) return;
      done = true;
      setReady(hasSession ? "ok" : "invalid");
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) settle(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      // Dá um tempo para o SDK processar o hash da URL antes de decidir.
      if (data.session) settle(true);
      else
        setTimeout(
          () => supabase.auth.getSession().then((r) => settle(Boolean(r.data.session))),
          1200,
        );
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      track("feature_used", { feature: "password_reset_completed" });
      await supabase.auth.signOut();
      toast.success("Senha redefinida. Entre com a nova senha.");
      navigate({ to: "/auth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao redefinir a senha.";
      toast.error(
        /weak|pwned/i.test(msg)
          ? "Senha fraca ou já vazada. Escolha uma senha forte e única."
          : /same.*password|different from the old/i.test(msg)
            ? "A nova senha precisa ser diferente da anterior."
            : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  if (ready === "checking") {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div
          className="size-8 rounded-full border-2 border-border border-t-discipline animate-spin"
          aria-label="Carregando"
        />
      </div>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
        <h1 className="text-2xl font-heading font-black mb-2">Link inválido ou expirado</h1>
        <p className="text-sm text-muted-foreground mb-6 text-pretty">
          Solicite um novo link de redefinição de senha na tela de acesso.
        </p>
        <button
          onClick={() => navigate({ to: "/auth" })}
          className="w-full py-3.5 bg-white text-black font-heading font-bold rounded-xl active:scale-[0.98] transition-transform"
        >
          Voltar para entrar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
      <div className="size-12 rounded-xl bg-discipline/15 grid place-items-center mb-5">
        <KeyRound className="size-6 text-discipline" />
      </div>
      <h1 className="text-2xl font-heading font-black leading-tight mb-2">Nova senha</h1>
      <p className="text-sm text-muted-foreground mb-6">Escolha uma senha forte e única.</p>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="Nova senha (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Confirmar nova senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-discipline text-black font-heading font-black text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? "…" : "REDEFINIR SENHA"}
        </button>
      </form>
    </div>
  );
}
