import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { Book, BookStatus } from "@/lib/store";
import { bookStatusLabel } from "@/lib/store";

export type BookFormValues = Partial<Book> & { title: string };

const statuses: BookStatus[] = ["quero-ler", "lendo", "concluido"];

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
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [totalPages, setTotalPages] = useState(String(initial?.totalPages ?? ""));
  const [currentPage, setCurrentPage] = useState(String(initial?.currentPage ?? ""));
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? "quero-ler");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comments, setComments] = useState(initial?.comments ?? "");
  const [learnings, setLearnings] = useState(initial?.learnings ?? "");
  const [quotes, setQuotes] = useState(initial?.quotes ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [searching, setSearching] = useState(false);

  const searchCover = async () => {
    if (!title.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(`${title} ${author}`.trim());
      const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
      const json = (await res.json()) as {
        docs?: { cover_i?: number; author_name?: string[]; number_of_pages_median?: number }[];
      };
      const doc = json.docs?.[0];
      if (doc?.cover_i) setCover(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
      if (!author && doc?.author_name?.[0]) setAuthor(doc.author_name[0]);
      if (!totalPages && doc?.number_of_pages_median) setTotalPages(String(doc.number_of_pages_median));
    } catch {
      /* silencioso */
    } finally {
      setSearching(false);
    }
  };

  const field = "w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline";
  const label = "block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          author: author.trim(),
          category: category.trim(),
          cover: cover.trim() || undefined,
          totalPages: Number(totalPages) || 0,
          currentPage: Number(currentPage) || 0,
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
      <div>
        <label className={label}>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Hábitos Atômicos" required />
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
      </div>

      <div>
        <label className={label}>Capa (URL)</label>
        <div className="flex gap-2">
          <input value={cover} onChange={(e) => setCover(e.target.value)} className={field} placeholder="https://..." />
          <button
            type="button"
            onClick={searchCover}
            className="px-3 rounded-xl bg-surface border border-border text-muted-foreground hover:text-discipline"
            aria-label="Buscar capa automaticamente"
          >
            {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </button>
        </div>
        {cover && (
          <img src={cover} alt={`Capa de ${title}`} className="mt-2 h-28 rounded-lg border border-border object-cover" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Total de páginas</label>
          <input value={totalPages} onChange={(e) => setTotalPages(e.target.value)} inputMode="numeric" className={field} placeholder="320" />
        </div>
        <div>
          <label className={label}>Página atual</label>
          <input value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} inputMode="numeric" className={field} placeholder="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-3 gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition ${
                status === s ? "bg-discipline text-black border-discipline" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {bookStatusLabel[s]}
            </button>
          ))}
        </div>
      </div>

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
