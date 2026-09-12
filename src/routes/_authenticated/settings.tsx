import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Moon, Sun, Sparkles, Check } from "lucide-react";
import { useStore, type AppTheme } from "@/lib/store";
import { RequireFeature } from "@/components/require-feature";
import { track } from "@/lib/track";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <RequireFeature feature="custom_themes">
      <SettingsScreen />
    </RequireFeature>
  ),
  head: () => ({
    meta: [{ title: "Configurações — Disciplina Absoluta" }],
  }),
});

const THEMES: { id: AppTheme; label: string; description: string; icon: typeof Moon }[] = [
  { id: "escuro", label: "Escuro", description: "O visual padrão da Forja.", icon: Moon },
  { id: "claro", label: "Claro", description: "Fundo branco, texto escuro.", icon: Sun },
  {
    id: "divertido",
    label: "Divertido",
    description: "Roxo vibrante com detalhes coloridos.",
    icon: Sparkles,
  },
];

function SettingsScreen() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <div className="px-5 pt-8 pb-28 animate-rise">
      <button
        onClick={() => history.back()}
        className="flex items-center gap-1 text-muted-foreground text-xs mb-4"
      >
        <ChevronLeft className="size-4" /> Voltar
      </button>

      <h1 className="text-2xl font-heading font-extrabold uppercase mb-1">Aparência</h1>
      <p className="text-sm text-muted-foreground mb-6">Escolha o tema visual do app.</p>

      <div className="space-y-3">
        {THEMES.map(({ id, label, description, icon: Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => {
                setTheme(id);
                track("feature_used", { feature: "theme_changed", theme: id });
              }}
              className={`w-full flex items-center gap-3 text-left rounded-2xl border p-4 transition ${
                active
                  ? "border-discipline bg-discipline/10"
                  : "border-border bg-surface hover:border-discipline/40"
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold">{label}</p>
                <p className="text-xs text-muted-foreground text-pretty">{description}</p>
              </div>
              {active && <Check className="size-5 text-discipline shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
