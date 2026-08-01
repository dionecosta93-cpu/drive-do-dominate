import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pencil, Trash2, Play, Square, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { BookForm } from "@/components/book-form";
import { bookProgress, bookStatusLabel, dateKey, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reading/$id")({
  component: BookDetail,
  head: () => ({
    meta: [
      { title: "Livro — Disciplina Absoluta" },
      { name: "description", content: "Progresso de leitura, sessões, aprendizados e citações do livro." },
      { property: "og:title", content: "Livro — Disciplina Absoluta" },
      { property: "og:description", content: "Progresso de leitura, sessões, aprendizados e citações do livro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BookDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const book = useStore((s) => s.books.find((b) => b.id === id));
  const sessions = useStore((s) => s.readingSessions.filter((r) => r.bookId === id));
  const updateBook = useStore((s) => s.updateBook);
  const removeBook = useStore((s) => s.removeBook);
  const toggleFav = useStore((s) => s.toggleBookFavorite);
  const logProgress = useStore((s) => s.logReadingProgress);
  const addSession = useStore((s) => s.addReadingSession);

  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [startedAt]);

  if (!book) {
    return (
      <div className="px-5 pt-8">
        <p className="text-sm text-muted-foreground">Livro não encontrado.</p>
      </div>
    );
  }

  const pct = bookProgress(book);
  const remaining = Math.max(0, (book.totalPages || 0) - book.currentPage);
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

  const stopSession = () => {
    if (startedAt === null) return;
    const endedAt = Date.now();
    const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    addSession({ bookId: book.id, date: dateKey(), startedAt, endedAt, minutes });
    setStartedAt(null);
    setElapsed(0);
    toast.success(`Sessão salva: ${minutes} min de leitura.`);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const field = "w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline";
  const sectionTitle = "text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2";

  if (editing) {
    return (
      <div className="px-5 pt-6 pb-24 animate-rise">
        <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Editar Livro</h1>
        <BookForm
          initial={book}
          submitLabel="SALVAR"
          onCancel={() => setEditing(false)}
          onSubmit={(v) => {
            updateBook(book.id, v);
            setEditing(false);
            toast.success("Livro atualizado.");
          }}
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/reading" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Leitura
      </Link>

      <div className="flex gap-4 mb-5">
        <div className="w-24 h-36 shrink-0 rounded-xl overflow-hidden border border-border bg-surface">
          {book.cover && <img src={book.cover} alt={`Capa de ${book.title}`} className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-heading font-extrabold uppercase leading-tight">{book.title}</h1>
          <p className="text-sm text-muted-foreground">{book.author}</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{book.category}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-info/20 text-info">
              {bookStatusLabel[book.status]}
            </span>
            {book.rating ? <span className="text-xs text-warning">{"★".repeat(book.rating)}</span> : null}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => toggleFav(book.id)} className="size-9 grid place-items-center rounded-lg border border-border" aria-label="Favoritar">
              <Star className={`size-4 ${book.favorite ? "text-warning" : "text-muted-foreground"}`} fill={book.favorite ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setEditing(true)} className="size-9 grid place-items-center rounded-lg border border-border text-muted-foreground" aria-label="Editar livro">
              <Pencil className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {book.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {book.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Progresso */}
      <section className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className={sectionTitle}>Progresso</span>
          <span className="font-heading font-black text-xl text-discipline tabular-nums">{pct}%</span>
        </div>
        <div className="h-3 w-full bg-surface rounded-full p-0.5">
          <div className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Página {book.currentPage} de {book.totalPages || "?"} · {remaining} páginas restantes
        </p>
        <div className="flex gap-2 mt-3">
          <input value={page} onChange={(e) => setPage(e.target.value)} inputMode="numeric" placeholder="Página atual" className={field} />
          <button
            onClick={() => {
              const p = Number(page);
              if (!p) return;
              logProgress(book.id, p);
              setPage("");
              toast.success("Progresso atualizado.");
            }}
            className="px-4 rounded-xl bg-discipline text-black text-xs font-bold uppercase"
          >
            Salvar
          </button>
        </div>
      </section>

      {/* Sessão de leitura */}
      <section className="mb-6 bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={sectionTitle}>Sessão de leitura</p>
            <p className="font-heading font-black text-2xl tabular-nums">{fmt(elapsed)}</p>
          </div>
          {startedAt === null ? (
            <button onClick={() => setStartedAt(Date.now())} className="flex items-center gap-2 bg-discipline text-black font-bold text-xs uppercase px-4 py-3 rounded-xl">
              <Play className="size-4" /> Iniciar leitura
            </button>
          ) : (
            <button onClick={stopSession} className="flex items-center gap-2 bg-struggle text-white font-bold text-xs uppercase px-4 py-3 rounded-xl">
              <Square className="size-4" /> Encerrar
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          <Clock className="size-3 inline mr-1" />
          {sessions.length} sessões · {totalMinutes} min neste livro
        </p>
      </section>

      {/* Aprendizados */}
      <section className="mb-6 space-y-3">
        <p className={sectionTitle}>Aprendizados</p>
        {(
          [
            ["summary", "Resumo"],
            ["learnings", "Lições aprendidas"],
            ["ideas", "Ideias importantes"],
            ["quotes", "Citações favoritas"],
            ["application", "Como aplicar na prática"],
            ["comments", "Comentários pessoais"],
          ] as const
        ).map(([key, title]) => (
          <div key={key}>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{title}</label>
            <textarea
              rows={3}
              defaultValue={book[key] ?? ""}
              onBlur={(e) => updateBook(book.id, { [key]: e.target.value })}
              className={field}
              placeholder="Escreva aqui..."
            />
          </div>
        ))}
      </section>

      {/* Histórico */}
      <section className="mb-6">
        <p className={sectionTitle}>Histórico</p>
        {book.logs.length === 0 && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
        )}
        <div className="space-y-2">
          {[...book.logs].reverse().map((l) => (
            <div key={l.id} className="bg-surface border border-border rounded-xl p-3 flex justify-between text-xs">
              <span>Página {l.page}</span>
              <span className="text-muted-foreground font-mono">{l.date}</span>
            </div>
          ))}
          {[...sessions].reverse().map((s) => (
            <div key={s.id} className="bg-surface border border-border rounded-xl p-3 flex justify-between text-xs">
              <span>{s.minutes} min de leitura</span>
              <span className="text-muted-foreground font-mono">{s.date}</span>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          removeBook(book.id);
          toast.success("Livro removido.");
          navigate({ to: "/reading" });
        }}
        className="w-full py-3 border border-struggle/30 text-struggle text-xs font-bold uppercase rounded-xl hover:bg-struggle/10 transition flex items-center justify-center gap-2"
      >
        <Trash2 className="size-4" /> Excluir livro
      </button>
    </div>
  );
}
