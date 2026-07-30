import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, Check, Quote } from "lucide-react";
import { toast } from "sonner";
import {
  devotionals,
  devotionalOfTheDay,
  devotionalThemes,
  type DevotionalTheme,
} from "@/lib/devotional";

export const Route = createFileRoute("/_authenticated/devotional")({
  component: DevotionalPage,
  head: () => ({
    meta: [
      { title: "Devocional de Produtividade — Disciplina Absoluta" },
      {
        name: "description",
        content:
          "Trechos de livros sobre produtividade, mentalidade e negócios com reflexão e ação prática para o seu dia.",
      },
      { property: "og:title", content: "Devocional de Produtividade — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Leitura diária de grandes livros com reflexão e uma ação concreta para executar hoje.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STORAGE_KEY = "da-devotional-read";

function DevotionalPage() {
  const today = useMemo(() => devotionalOfTheDay(), []);
  const [readDate, setReadDate] = useState<string | null>(null);
  const [theme, setTheme] = useState<DevotionalTheme | "Todos">("Todos");

  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setReadDate(localStorage.getItem(STORAGE_KEY));
  }, []);

  const done = readDate === todayKey;

  const list = devotionals.filter((d) => (theme === "Todos" ? true : d.theme === theme) && d.id !== today.id);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Início
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="size-5 text-discipline" />
        <h1 className="text-2xl font-heading font-extrabold uppercase">Devocional</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Um trecho por dia de livros sobre produtividade, mentalidade e negócios — com reflexão e ação.
      </p>

      {/* Leitura do dia */}
      <article className="bg-surface border border-discipline/30 rounded-2xl p-5 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-3">Leitura de hoje</p>
        <Quote className="size-5 text-discipline/60 mb-2" />
        <p className="text-lg font-heading leading-snug text-pretty mb-3">"{today.excerpt}"</p>
        <p className="text-xs text-muted-foreground mb-4">
          {today.book} · {today.author} · {today.theme}
        </p>

        <div className="border-t border-border pt-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reflexão</p>
          <p className="text-sm leading-snug text-pretty">{today.reflection}</p>
        </div>

        <div className="bg-background rounded-xl p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-warning mb-1">Aplique hoje</p>
          <p className="text-sm leading-snug text-pretty">{today.action}</p>
        </div>

        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, todayKey);
            setReadDate(todayKey);
            toast.success("Devocional concluído. Agora execute.");
          }}
          disabled={done}
          className={`w-full py-3 rounded-xl font-heading font-black text-sm uppercase transition active:scale-[0.98] ${
            done ? "bg-discipline/15 text-discipline" : "bg-discipline text-black"
          }`}
        >
          {done ? (
            <span className="inline-flex items-center gap-2">
              <Check className="size-4" /> Lido hoje
            </span>
          ) : (
            "Marcar como lido"
          )}
        </button>
      </article>

      {/* Biblioteca */}
      <h2 className="text-sm font-heading font-bold uppercase tracking-widest mb-3">Biblioteca</h2>
      <div className="flex flex-wrap gap-2 mb-5">
        {(["Todos", ...devotionalThemes] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase border transition ${
              theme === t
                ? "bg-discipline text-black border-discipline"
                : "bg-surface text-muted-foreground border-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((d) => (
          <details key={d.id} className="bg-surface border border-border rounded-2xl p-4 group">
            <summary className="cursor-pointer list-none">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{d.theme}</p>
              <p className="text-sm font-medium leading-snug text-pretty">"{d.excerpt}"</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {d.book} · {d.author}
              </p>
            </summary>
            <div className="mt-3 border-t border-border pt-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reflexão</p>
                <p className="text-sm leading-snug text-pretty">{d.reflection}</p>
              </div>
              <div className="bg-background rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warning mb-1">Aplique</p>
                <p className="text-sm leading-snug text-pretty">{d.action}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
