import { useState } from "react";
import { Sparkles, Loader2, Search } from "lucide-react";
import type { Book, BookStatus } from "@/lib/store";
import { bookStatusLabel } from "@/lib/store";

export type BookFormValues = Partial<Book> & { title: string };

const statuses: BookStatus[] = ["quero-ler", "lendo", "pausado", "concluido"];

type AiResult = {
  title?: string;
  subtitle?: string;
  author?: string;
  category?: string;
  genre?: string;
  publisher?: string;
  publishedYear?: number;
  language?: string;
  isbn?: string;
  synopsis?: string;
  totalPages?: number;
  totalChapters?: number;
  averageRating?: number;
  estimatedMinutes?: number;
  tags?: string[];
  cover?: string;
};

export function BookForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Book;
  submitLabel: string;
  onSubmit: (v: BookFormValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [genre, setGenre] = useState(initial?.genre ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [publishedYear, setPublishedYear] = useState(String(initial?.publishedYear ?? ""));
  const [language, setLanguage] = useState(initial?.language ?? "");
  const [isbn, setIsbn] = useState(initial?.isbn ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [averageRating, setAverageRating] = useState(String(initial?.averageRating ?? ""));
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(initial?.estimatedMinutes ?? ""));
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [totalPages, setTotalPages] = useState(String(initial?.totalPages ?? ""));
  const [currentPage, setCurrentPage] = useState(String(initial?.currentPage ?? ""));
  const [totalChapters, setTotalChapters] = useState(String(initial?.totalChapters ?? ""));
  const [currentChapter, setCurrentChapter] = useState(String(initial?.currentChapter ?? ""));
  const [dailyPageGoal, setDailyPageGoal] = useState(String(initial?.dailyPageGoal ?? ""));
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(String(initial?.dailyMinutesGoal ?? ""));
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? "quero-ler");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comments, setComments] = useState(initial?.comments ?? "");
  const [learnings, setLearnings] = useState(initial?.learnings ?? "");
  const [quotes, setQuotes] = useState(initial?.quotes ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));

  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AiResult[]>([]);
  const [aiError, setAiError] = useState("");

  const aiSearch = async () => {
    const q = (aiQuery || `${title} ${author}`).trim();
    if (!q) return;
    setAiLoading(true);
    setAiError("");
    setAiResults([]);
    try {
      const res = await fetch("/api/book-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as { results?: AiResult[]; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "erro");
      if (!json.results?.length) setAiError("Nenhuma edição encontrada. Preencha manualmente.");
      setAiResults(json.results ?? []);
    } catch {
      setAiError("Não consegui buscar agora. Preencha manualmente.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyResult = (r: AiResult) => {
    if (r.title) setTitle(r.title);
    if (r.subtitle) setSubtitle(r.subtitle);
    if (r.author) setAuthor(r.author);
    if (r.category) setCategory(r.category);
    if (r.genre) setGenre(r.genre);
    if (r.publisher) setPublisher(r.publisher);
    if (r.publishedYear) setPublishedYear(String(r.publishedYear));
    if (r.language) setLanguage(r.language);
    if (r.isbn) setIsbn(r.isbn);
    if (r.synopsis) setSynopsis(r.synopsis);
    if (r.totalPages) setTotalPages(String(r.totalPages));
    if (r.totalChapters) setTotalChapters(String(r.totalChapters));
    if (r.averageRating) setAverageRating(String(r.averageRating));
    if (r.estimatedMinutes) setEstimatedMinutes(String(r.estimatedMinutes));
    if (r.tags?.length) setTags(r.tags.join(", "));
    if (r.cover) setCover(r.cover);
    setAiResults([]);
  };

  const num = (v: string) => (Number(v) || 0) || undefined;

  const field =
    "w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline";
  const label = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5";
  const sectionTitle = "text-[11px] font-bold uppercase tracking-widest text-discipline mb-3 mt-6";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          author: author.trim(),
          category: category.trim(),
          genre: genre.trim() || undefined,
          publisher: publisher.trim() || undefined,
          publishedYear: num(publishedYear),
          language: language.trim() || undefined,
          isbn: isbn.trim() || undefined,
          synopsis: synopsis.trim() || undefined,
          averageRating: Number(averageRating) || undefined,
          estimatedMinutes: num(estimatedMinutes),
          cover: cover.trim() || undefined,
          totalPages: Number(totalPages) || 0,
          currentPage: Number(currentPage) || 0,
          totalChapters: num(totalChapters),
          currentChapter: num(currentChapter),
          dailyPageGoal: num(dailyPageGoal),
          dailyMinutesGoal: num(dailyMinutesGoal),
          targetDate: targetDate || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status,
          rating: rating || undefined,
          comments,
          learnings,
          quotes,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        });
      }}
    >
      {/* Busca por IA */}
      <div className="bg-surface border border-discipline/30 rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-discipline mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5" /> Cadastro inteligente
        </p>
        <p className="text-[11px] text-muted-foreground mb-3">
          Digite o nome do livro (e o autor, se souber). A IA preenche capa, sinopse, páginas, editora e mais.
        </p>
        <div className="flex gap-2">
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className={field}
            placeholder="Ex.: Hábitos Atômicos — James Clear"
          />
          <button
            type="button"
            onClick={aiSearch}
            disabled={aiLoading}
            className="px-4 rounded-xl bg-discipline text-black text-xs font-bold uppercase disabled:opacity-50"
            aria-label="Buscar com IA"
          >
            {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </button>
        </div>
        {aiError && <p className="text-[11px] text-struggle mt-2">{aiError}</p>}
        {aiResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {aiResults.map((r, i) => (
              <button
                key={`${r.title}-${i}`}
                type="button"
                onClick={() => applyResult(r)}
                className="w-full flex gap-3 text-left bg-background border border-border rounded-xl p-2.5 hover:border-discipline transition"
              >
                {r.cover && (
                  <img src={r.cover} alt={`Capa de ${r.title}`} className="w-10 h-14 object-cover rounded border border-border" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.author}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {[r.publisher, r.publishedYear || null, r.totalPages ? `${r.totalPages} pág.` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className={sectionTitle}>Identificação</p>

      <div>
        <label className={label}>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Hábitos Atômicos" required />
      </div>

      <div>
        <label className={label}>Subtítulo</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Autor</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className={field} placeholder="James Clear" />
        </div>
        <div>
          <label className={label}>Categoria</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={field} placeholder="Produtividade" />
        </div>
        <div>
          <label className={label}>Gênero</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Idioma</label>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} className={field} placeholder="Português" />
        </div>
        <div>
          <label className={label}>Editora</label>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Ano</label>
          <input value={publishedYear} onChange={(e) => setPublishedYear(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>ISBN</label>
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Nota média da obra</label>
          <input value={averageRating} onChange={(e) => setAverageRating(e.target.value)} inputMode="decimal" className={field} placeholder="4.5" />
        </div>
      </div>

      <div>
        <label className={label}>Sinopse</label>
        <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={4} className={field} />
      </div>

      <div>
        <label className={label}>Capa (URL)</label>
        <input value={cover} onChange={(e) => setCover(e.target.value)} className={field} placeholder="https://..." />
        {cover && <img src={cover} alt={`Capa de ${title}`} className="mt-2 h-28 rounded-lg border border-border object-cover" />}
      </div>

      <p className={sectionTitle}>Progresso e metas</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Total de páginas</label>
          <input value={totalPages} onChange={(e) => setTotalPages(e.target.value)} inputMode="numeric" className={field} placeholder="320" />
        </div>
        <div>
          <label className={label}>Página atual</label>
          <input value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} inputMode="numeric" className={field} placeholder="0" />
        </div>
        <div>
          <label className={label}>Total de capítulos</label>
          <input value={totalChapters} onChange={(e) => setTotalChapters(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>Capítulo atual</label>
          <input value={currentChapter} onChange={(e) => setCurrentChapter(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>Meta de páginas/dia</label>
          <input value={dailyPageGoal} onChange={(e) => setDailyPageGoal(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>Meta de minutos/dia</label>
          <input value={dailyMinutesGoal} onChange={(e) => setDailyMinutesGoal(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>Tempo estimado (min)</label>
          <input value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} inputMode="numeric" className={field} />
        </div>
        <div>
          <label className={label}>Meta de conclusão</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Início</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Conclusão</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label className={label}>Status</label>
        <div className="grid grid-cols-4 gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition ${
                status === s ? "bg-discipline text-black border-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {bookStatusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <p className={sectionTitle}>Sua avaliação</p>

      <div>
        <label className={label}>Nota</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? 0 : n)}
              className={`text-2xl leading-none transition ${n <= rating ? "text-warning" : "text-muted-foreground/40"}`}
              aria-label={`${n} estrelas`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Comentários pessoais</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className={field} />
      </div>

      <div>
        <label className={label}>Principais aprendizados</label>
        <textarea value={learnings} onChange={(e) => setLearnings(e.target.value)} rows={3} className={field} />
      </div>

      <div>
        <label className={label}>Frases marcantes</label>
        <textarea value={quotes} onChange={(e) => setQuotes(e.target.value)} rows={3} className={field} />
      </div>

      <div>
        <label className={label}>Tags (separadas por vírgula)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} placeholder="foco, hábitos" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border text-xs font-bold uppercase text-muted-foreground">
          Cancelar
        </button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-discipline text-black text-xs font-bold uppercase">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
