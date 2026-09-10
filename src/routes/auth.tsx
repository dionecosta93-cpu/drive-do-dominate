import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame, MailCheck } from "lucide-react";
import { track } from "@/lib/track";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

/** Traduz os erros do Supabase Auth para mensagens claras em português. */
function authErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Falha na autenticação";
  const code = (err as { code?: string } | null)?.code ?? "";
  const m = raw.toLowerCase();

  if (code === "invalid_credentials" || m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos. Se acabou de criar a conta, confirme o e-mail primeiro.";
  if (code === "email_not_confirmed" || m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Use o botão de reenviar se não recebeu.";
  if (
    code === "user_already_exists" ||
    m.includes("already registered") ||
    m.includes("already been registered")
  )
    return "Este e-mail já tem conta. Toque em “Entrar”.";
  if (code === "weak_password" || m.includes("weak") || m.includes("pwned"))
    return "Senha fraca ou já vazada. Use uma senha forte e única (mín. 6, misture letras, números e símbolos).";
  if (
    code === "over_email_send_rate_limit" ||
    m.includes("rate limit") ||
    m.includes("for security purposes")
  )
    return "Muitas tentativas seguidas. Aguarde cerca de 1 minuto e tente de novo.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "E-mail inválido. Verifique o endereço digitado.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "O cadastro por e-mail está desativado neste projeto.";
  return raw;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState<string | null>(null);
  const [awaitingReset, setAwaitingReset] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        track("feature_used", { feature: "password_reset_requested" });
        setAwaitingReset(email);
        toast.success("Se houver conta com esse e-mail, o link de redefinição foi enviado.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;

        // Supabase devolve identities vazio quando o e-mail já está cadastrado.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("Este e-mail já tem conta. Faça login.");
          setMode("signin");
          return;
        }

        track("sign_up", { method: "email", confirmed: Boolean(data.session) });
        if (data.session) {
          toast.success("Conta criada!");
          return; // onAuthStateChange cuida da navegação
        }

        // Sem sessão => o projeto exige confirmação de e-mail.
        setAwaitingConfirm(email);
        toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        track("login", { method: "email" });
      }
    } catch (err) {
      if ((err as { code?: string } | null)?.code === "email_not_confirmed") {
        setAwaitingConfirm(email);
      }
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (!awaitingConfirm || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: awaitingConfirm,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("E-mail de confirmação reenviado.");
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  async function google() {
    if (loading) return;
    setLoading(true);
    try {
      // OAuth nativo do Supabase (sem intermediário). Requer o provedor Google
      // configurado no painel do Supabase e a URL de retorno na allowlist.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      track("login", { method: "google" });
      // O Supabase redireciona o navegador; nada mais a fazer aqui.
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (awaitingConfirm) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
        <div className="size-12 rounded-xl bg-discipline/15 grid place-items-center mb-5">
          <MailCheck className="size-6 text-discipline" />
        </div>
        <h1 className="text-2xl font-heading font-black leading-tight mb-2">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground mb-1">Enviamos um link de confirmação para</p>
        <p className="text-sm font-bold mb-6 break-all">{awaitingConfirm}</p>
        <p className="text-xs text-muted-foreground mb-6 text-pretty">
          Abra o link para ativar a conta e depois volte para entrar. Verifique também a caixa de
          spam.
        </p>
        <button
          onClick={resendConfirmation}
          disabled={resending}
          className="w-full py-3.5 border border-discipline/40 text-discipline font-bold rounded-xl mb-3 disabled:opacity-50"
        >
          {resending ? "Reenviando…" : "Reenviar e-mail de confirmação"}
        </button>
        <button
          onClick={() => {
            setAwaitingConfirm(null);
            setMode("signin");
          }}
          className="w-full py-3.5 bg-white text-black font-heading font-bold rounded-xl active:scale-[0.98] transition-transform"
        >
          Já confirmei — entrar
        </button>
      </div>
    );
  }

  if (awaitingReset) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
        <div className="size-12 rounded-xl bg-discipline/15 grid place-items-center mb-5">
          <MailCheck className="size-6 text-discipline" />
        </div>
        <h1 className="text-2xl font-heading font-black leading-tight mb-2">
          Redefinição de senha
        </h1>
        <p className="text-sm text-muted-foreground mb-1">
          Se existir conta, enviamos um link para
        </p>
        <p className="text-sm font-bold mb-6 break-all">{awaitingReset}</p>
        <p className="text-xs text-muted-foreground mb-6 text-pretty">
          Abra o link no e-mail para escolher uma nova senha. Verifique também a caixa de spam.
        </p>
        <button
          onClick={() => {
            setAwaitingReset(null);
            setMode("signin");
          }}
          className="w-full py-3.5 bg-white text-black font-heading font-bold rounded-xl active:scale-[0.98] transition-transform"
        >
          Voltar para entrar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
      <div className="flex items-center gap-2 mb-6">
        <div className="size-9 rounded-lg bg-discipline grid place-items-center">
          <Flame className="size-5 text-black" fill="currentColor" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-discipline">
          Disciplina Absoluta
        </span>
      </div>
      <h1 className="text-3xl font-heading font-black leading-tight mb-2">
        {mode === "signin" ? (
          <>
            Entre e continue <span className="text-discipline">dominando</span>.
          </>
        ) : mode === "signup" ? (
          <>
            Comece sua <span className="text-discipline">jornada</span>.
          </>
        ) : (
          <>
            Recuperar <span className="text-discipline">acesso</span>.
          </>
        )}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        {mode === "forgot"
          ? "Informe seu e-mail e enviaremos um link para criar uma nova senha."
          : "Seus dados sincronizam entre todos os seus dispositivos."}
      </p>

      <button
        onClick={google}
        disabled={loading}
        hidden={mode === "forgot"}
        className="w-full py-3.5 bg-white text-black font-heading font-bold rounded-xl mb-3 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="size-5" viewBox="0 0 48 48">
          <path
            fill="#EA4335"
            d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.6z"
          />
          <path
            fill="#FBBC05"
            d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6.4 0-11.8-3.8-13.7-9.8l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
          />
        </svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 my-4" hidden={mode === "forgot"}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          ou e-mail
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
          />
        )}
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          autoComplete="email"
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        <input
          type="password"
          required={mode !== "forgot"}
          hidden={mode === "forgot"}
          minLength={6}
          placeholder="Senha (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-xs text-muted-foreground hover:text-discipline transition"
          >
            Esqueci minha senha
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-discipline text-black font-heading font-black text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading
            ? "…"
            : mode === "signin"
              ? "ENTRAR"
              : mode === "signup"
                ? "CRIAR CONTA"
                : "ENVIAR LINK"}
        </button>
      </form>

      {mode === "signup" && (
        <p className="mt-3 text-[11px] text-muted-foreground text-pretty">
          Use uma senha forte e única — senhas comuns ou já vazadas são recusadas.
        </p>
      )}

      <button
        onClick={() =>
          setMode(mode === "signin" ? "signup" : mode === "signup" ? "signin" : "signin")
        }
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition"
      >
        {mode === "signin" ? "Não tem conta? " : mode === "signup" ? "Já tem conta? " : ""}
        <span className="text-discipline font-bold">
          {mode === "signin" ? "Criar agora" : mode === "signup" ? "Entrar" : "Voltar para entrar"}
        </span>
      </button>
    </div>
  );
}
