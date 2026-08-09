import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pencil, Trash2, Play, Square, Star, Clock, Archive, RotateCcw, Plus } from "lucide-react";
import { toast } from "sonner";
import { BookForm } from "@/components/book-form";
import { bookStats, bookStatusLabel, dateKey, useStore, type BookStatus } from "@/lib/store";

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

const statuses: BookStatus[] = ["quero-ler", "lendo", "pausado", "concluido"];

function BookDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const book = useStore((s) => s.books.find((b) => b.id === id));
  const sessions = useStore((s) => s.readingSessions.filter((r) => r.bookId === id));
  const notes = useStore((s) => s.readingNotes.filter((n) => n.bookId === id));
  const updateBook = useStore((s) => s.updateBook);
  const removeBook = useStore((s) => s.removeBook);
  const toggleFav = useStore((s) => s.toggleBookFavorite);
  const updateProgress = useStore((s) => s.updateReadingProgress);
  const setStatus = useStore((s) => s.setBookStatus);
  const archiveBook = useStore((s) => s.archiveBook);
  const restartBook = useStore((s) => s.restartBook);
  const addSession = useStore((s) => s.addReadingSession);
  const addNote = useStore((s) => s.addReadingNote);
  const updateNote = useStore((s) => s.updateReadingNote);
  const removeNote = useStore((s) => s.removeReadingNote);
  const updateLog = useStore((s) => s.updateReadingLog);
  const removeLog = useStore((s) => s.removeReadingLog);
  const updateSession = useStore((s) => s.updateReadingSession);
  const removeSession = useStore((s) => s.removeReadingSession);

  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState("");
  const [chapter, setChapter] = useState("");
  const [pagesToday, setPagesToday] = useState("");
  const [minutes, setMinutes] = useState("");
  const [noteText, setNoteText] = useState("");
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

  const st = bookStats(book, sessions, notes);

  const stopSession = () => {
    if (startedAt === null) return;
    const endedAt = Date.now();
    const mins = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    addSession({ bookId: book.id, date: dateKey(), startedAt, endedAt, minutes: mins });
    setStartedAt(null);
    setElapsed(0);
    toast.success(`Sessão salva: ${mins} min de leitura.`);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
          {book.subtitle && <p className="text-xs text-muted-foreground italic">{book.subtitle}</p>}
          <p className="text-sm text-muted-foreground">{book.author}</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
            {[book.category, book.genre, book.publisher, book.publishedYear].filter(Boolean).join(" · ")}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-info/20 text-info">
              {bookStatusLabel[book.status]}
            </span>
            {book.archived && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Arquivado</span>
            )}
            {book.rating ? <span className="text-xs text-warning">{"★".repeat(book.rating)}</span> : null}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => toggleFav(book.id)} className="size-9 grid place-items-center rounded-lg border border-border" aria-label="Favoritar">
              <Star className={`size-4 ${book.favorite ? "text-warning" : "text-muted-foreground"}`} fill={book.favorite ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setEditing(true)} className="size-9 grid place-items-center rounded-lg border border-border text-muted-foreground" aria-label="Editar livro">
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => {
                archiveBook(book.id, book.archived);
                toast.success(book.archived ? "Livro restaurado." : "Livro arquivado.");
              }}
              className="size-9 grid place-items-center rounded-lg border border-border text-muted-foreground"
              aria-label="Arquivar livro"
            >
              <Archive className="size-4" />
            </button>
            <button
              onClick={() => {
                restartBook(book.id);
                toast.success("Leitura reiniciada.");
              }}
              className="size-9 grid place-items-center rounded-lg border border-border text-muted-foreground"
              aria-label="Reiniciar leitura"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setEditing(true)}
        className="w-full mb-5 py-3 rounded-xl bg-surface border border-discipline/40 text-discipline text-xs font-bold uppercase flex items-center justify-center gap-2"
      >
        <Pencil className="size-4" /> Editar livro
      </button>

      {book.synopsis && (
        <section className="mb-5">
          <p className={sectionTitle}>Sinopse</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{book.synopsis}</p>
        </section>
      )}

      {book.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-5">
          {book.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Status rápido */}
      <section className="mb-6">
        <p className={sectionTitle}>Status</p>
        <div className="grid grid-cols-4 gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(book.id, s);
                toast.success(`Status: ${bookStatusLabel[s]}`);
              }}
              className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition ${
                book.status === s ? "bg-discipline text-black border-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {bookStatusLabel[s]}
            </button>
          ))}
        </div>
      </section>

      {/* Progresso */}
      <section className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <span className={sectionTitle}>Progresso</span>
          <span className="font-heading font-black text-xl text-discipline tabular-nums">{st.pct}%</span>
        </div>
        <div className="h-3 w-full bg-surface rounded-full p-0.5">
          <div className="h-full bg-gradient-to-r from-struggle via-warning to-discipline rounded-full transition-all duration-700" style={{ width: `${Math.max(st.pct, 3)}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Página {book.currentPage} de {book.totalPages || "?"} · {st.remainingPages} restantes
          {st.remainingChapters !== null ? ` · ${st.remainingChapters} capítulos restantes` : ""}
        </p>

        <div className="mt-3 bg-surface border border-border rounded-2xl p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-discipline">Atualizar progresso</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={page} onChange={(e) => setPage(e.target.value)} inputMode="numeric" placeholder="Página atual" className={field} />
            <input value={chapter} onChange={(e) => setChapter(e.target.value)} inputMode="numeric" placeholder="Capítulo" className={field} />
            <input value={pagesToday} onChange={(e) => setPagesToday(e.target.value)} inputMode="numeric" placeholder="Páginas lidas hoje" className={field} />
            <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" placeholder="Minutos lidos" className={field} />
          </div>
          <button
            onClick={() => {
              const p = Number(page) || undefined;
              const c = Number(chapter) || undefined;
              const pt = Number(pagesToday) || undefined;
              const m = Number(minutes) || undefined;
              if (!p && !c && !pt && !m) return;
              updateProgress(book.id, { page: p, chapter: c, pagesReadToday: pt, minutes: m });
              setPage("");
              setChapter("");
              setPagesToday("");
              setMinutes("");
              toast.success("Progresso registrado.");
            }}
            className="w-full py-3 rounded-xl bg-discipline text-black text-xs font-bold uppercase"
          >
            Salvar progresso
          </button>
        </div>
      </section>

      {/* Estatísticas do livro */}
      <section className="mb-6">
        <p className={sectionTitle}>Estatísticas deste livro</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["Tempo total", `${Math.round((st.totalMinutes / 60) * 10) / 10} h`],
              ["Sessões", st.sessions],
              ["Dias lendo", st.readingDays],
              ["Média pág./dia", st.avgPagesPerDay],
              ["Páginas/hora", st.pagesPerHour],
              ["Maior sequência", `${st.longestStreak} dias`],
              ["Previsão de fim", st.estimatedFinish ?? "—"],
              ["Meta pág./dia", st.pagesPerDayNeeded ?? book.dailyPageGoal ?? "—"],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="bg-surface border border-border rounded-xl p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{l}</p>
              <p className="font-heading font-black text-lg text-discipline tabular-nums">{v}</p>
            </div>
          ))}
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
          {st.sessions} sessões · {st.totalMinutes} min neste livro
        </p>
      </section>

      {/* Diário de leitura */}
      <section className="mb-6">
        <p className={sectionTitle}>Diário de leitura</p>
        <div className="flex gap-2 mb-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={2}
            placeholder="O que você aprendeu hoje?"
            className={field}
          />
          <button
            onClick={() => {
              if (!noteText.trim()) return;
              addNote({ bookId: book.id, text: noteText.trim(), date: dateKey() });
              setNoteText("");
              toast.success("Anotação salva.");
            }}
            className="px-4 rounded-xl bg-discipline text-black shrink-0"
            aria-label="Adicionar anotação"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {notes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma anotação ainda.</p>}
        <div className="space-y-2">
          {[...notes].sort((a, b) => b.at - a.at).map((n) => (
            <div key={n.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono text-muted-foreground">{n.date}</span>
                <button onClick={() => removeNote(n.id)} className="text-muted-foreground hover:text-struggle" aria-label="Excluir anotação">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <textarea
                rows={2}
                defaultValue={n.text}
                onBlur={(e) => updateNote(n.id, e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
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

      {/* Histórico editável */}
      <section className="mb-6">
        <p className={sectionTitle}>Histórico (editável)</p>
        <p className="text-[10px] text-muted-foreground mb-2">
          Corrigiu a página errada? Edite abaixo — as estatísticas são recalculadas automaticamente.
        </p>
        {book.logs.length === 0 && sessions.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
        )}
        <div className="space-y-2">
          {[...book.logs].reverse().map((l) => (
            <div key={l.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <input
                  type="date"
                  defaultValue={l.date}
                  onBlur={(e) => e.target.value && updateLog(book.id, l.id, { date: e.target.value })}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                />
                <input
                  inputMode="numeric"
                  defaultValue={l.page}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) {
                      updateLog(book.id, l.id, { page: v });
                      toast.success("Registro corrigido.");
                    }
                  }}
                  placeholder="Página"
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                />
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    defaultValue={l.chapter ?? ""}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0) updateLog(book.id, l.id, { chapter: v });
                    }}
                    placeholder="Cap."
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                  />
                  <button
                    onClick={() => {
                      removeLog(book.id, l.id);
                      toast.success("Registro removido.");
                    }}
                    className="text-muted-foreground hover:text-struggle shrink-0"
                    aria-label="Excluir registro"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {[...sessions].reverse().map((sv) => (
            <div key={sv.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <input
                  type="date"
                  defaultValue={sv.date}
                  onBlur={(e) => e.target.value && updateSession(sv.id, { date: e.target.value })}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                />
                <input
                  inputMode="numeric"
                  defaultValue={sv.minutes}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) {
                      updateSession(sv.id, { minutes: v });
                      toast.success("Sessão corrigida.");
                    }
                  }}
                  placeholder="Minutos"
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                />
                <div className="flex items-center gap-2">
                  <input
                    inputMode="numeric"
                    defaultValue={sv.pagesRead ?? ""}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v >= 0) updateSession(sv.id, { pagesRead: v });
                    }}
                    placeholder="Págs."
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px]"
                  />
                  <button
                    onClick={() => {
                      removeSession(sv.id);
                      toast.success("Sessão removida.");
                    }}
                    className="text-muted-foreground hover:text-struggle shrink-0"
                    aria-label="Excluir sessão"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
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
