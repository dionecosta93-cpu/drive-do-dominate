import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu e-mail se necessário.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 animate-rise">
      <div className="flex items-center gap-2 mb-6">
        <div className="size-9 rounded-lg bg-discipline grid place-items-center">
          <Flame className="size-5 text-black" fill="currentColor" />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-discipline">Disciplina Absoluta</span>
      </div>
      <h1 className="text-3xl font-heading font-black leading-tight mb-2">
        {mode === "signin" ? (
          <>Entre e continue <span className="text-discipline">dominando</span>.</>
        ) : (
          <>Comece sua <span className="text-discipline">jornada</span>.</>
        )}
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Seus dados sincronizam entre todos os seus dispositivos.
      </p>

      <button
        onClick={google}
        disabled={loading}
        className="w-full py-3.5 bg-white text-black font-heading font-bold rounded-xl mb-3 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="size-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.5 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.2 7.1-17.6z"/><path fill="#FBBC05" d="M10.3 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.8 2.3-7.4 2.3-6.4 0-11.8-3.8-13.7-9.8l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
        Continuar com Google
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ou e-mail</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
          />
        )}
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Senha (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-discipline"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-discipline text-black font-heading font-black text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {mode === "signin" ? "ENTRAR" : "CRIAR CONTA"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition"
      >
        {mode === "signin" ? "Não tem conta? " : "Já tem conta? "}
        <span className="text-discipline font-bold">
          {mode === "signin" ? "Criar agora" : "Entrar"}
        </span>
      </button>
    </div>
  );
}
