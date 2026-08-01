import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookMarked, Plus, BarChart3, Target, Star } from "lucide-react";
import { bookProgress, bookStatusLabel, useStore, type Book, type BookStatus } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reading/")({
  component: ReadingLibrary,
  head: () => ({
    meta: [
      { title: "Leitura — Disciplina Absoluta" },
      { name: "description", content: "Sua biblioteca pessoal: livros para ler, em leitura, concluídos e favoritos." },
      { property: "og:title", content: "Leitura — Disciplina Absoluta" },
      { property: "og:description", content: "Sua biblioteca pessoal: livros para ler, em leitura, concluídos e favoritos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Tab = BookStatus | "favoritos";
const tabs: { key: Tab; label: string }[] = [
  { key: "quero-ler", label: "📚 Quero Ler" },
  { key: "lendo", label: "📖 Lendo" },
  { key: "concluido", label: "✅ Concluídos" },
  { key: "favoritos", label: "⭐ Favoritos" },
];

export function BookCard({ b }: { b: Book }) {
  const pct = bookProgress(b);
  return (
    <Link
      to="/reading/$id"
      params={{ id: b.id }}
      className="flex gap-3 bg-surface border border-border rounded-2xl p-3 hover:border-discipline/40 transition animate-rise"
    >
      <div className="w-14 h-20 shrink-0 rounded-lg overflow-hidden bg-background border border-border grid place-items-center">
        {b.cover ? (
          <img src={b.cover} alt={`Capa de ${b.title}`} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <BookMarked className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-bold text-sm leading-tight truncate">{b.title}</h3>
          {b.favorite && <Star className="size-3.5 text-warning shrink-0" fill="currentColor" />}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{b.author || "Autor não informado"}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <span className="text-[10px] font-heading font-black text-discipline tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-info/20 text-info">
            {bookStatusLabel[b.status]}
          </span>
          {b.rating ? <span className="text-[10px] text-warning">{"★".repeat(b.rating)}</span> : null}
          <span className="text-[9px] font-mono text-muted-foreground">
            {new Date(b.updatedAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ReadingLibrary() {
  const books = useStore((s) => s.books);
  const [tab, setTab] = useState<Tab>("lendo");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return books
      .filter((b) => (tab === "favoritos" ? b.favorite : b.status === tab))
      .filter((b) =>
        !term
          ? true
          : [b.title, b.author, b.category, bookStatusLabel[b.status], String(b.rating ?? ""), ...b.tags]
              .join(" ")
              .toLowerCase()
              .includes(term),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [books, tab, q]);

  return (
    <div className="px-4 pt-6 pb-8 animate-rise">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookMarked className="size-5 text-discipline shrink-0" />
          <h1 className="text-xl font-heading font-extrabold uppercase truncate">Leitura</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/reading/goals" aria-label="Metas de leitura" className="size-9 grid place-items-center rounded-full border border-border bg-surface">
            <Target className="size-4" />
          </Link>
          <Link to="/reading/stats" aria-label="Estatísticas" className="size-9 grid place-items-center rounded-full border border-border bg-surface">
            <BarChart3 className="size-4" />
          </Link>
          <Link to="/reading/new" aria-label="Novo livro" className="size-9 grid place-items-center rounded-full bg-discipline text-black">
            <Plus className="size-4" />
          </Link>
        </div>
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, autor, categoria, tag..."
        className="w-full mb-4 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline"
      />

      <div className="flex gap-1 mb-5 bg-surface border border-border rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[86px] text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition ${
              tab === t.key ? "bg-discipline text-black" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <BookMarked className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum livro aqui ainda. Comece sua biblioteca.</p>
          <Link to="/reading/new" className="inline-flex items-center gap-2 bg-discipline text-black font-bold text-sm px-4 py-2 rounded-lg">
            Adicionar livro
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <BookCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}
