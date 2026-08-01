import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { readingStats, useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reading/stats")({
  component: ReadingStats,
  head: () => ({
    meta: [
      { title: "Estatísticas de leitura — Disciplina Absoluta" },
      { name: "description", content: "Páginas lidas, horas de leitura, streak e categorias mais lidas." },
      { property: "og:title", content: "Estatísticas de leitura — Disciplina Absoluta" },
      { property: "og:description", content: "Páginas lidas, horas de leitura, streak e categorias mais lidas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-heading font-black text-2xl text-discipline tabular-nums mt-1">{value}</p>
    </div>
  );
}

function ReadingStats() {
  const books = useStore((s) => s.books);
  const sessions = useStore((s) => s.readingSessions);
  const st = readingStats(books, sessions);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <Link to="/reading" className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Leitura
      </Link>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Estatísticas</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Hoje" value={`${st.todayMinutes} min`} />
        <Stat label="Semana" value={`${st.weekMinutes} min`} />
        <Stat label="Mês" value={`${st.monthMinutes} min`} />
        <Stat label="Total" value={`${Math.round((st.totalMinutes / 60) * 10) / 10} h`} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Concluídos" value={st.completed} />
        <Stat label="Em andamento" value={st.reading} />
        <Stat label="Quero ler" value={st.wishlist} />
        <Stat label="Páginas lidas" value={st.pagesRead} />
        <Stat label="Média pág./dia" value={st.avgPagesPerDay} />
        <Stat label="Média por sessão" value={`${st.avgSessionMinutes} min`} />
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sequência lendo</p>
        <p className="font-heading font-black text-3xl text-discipline tabular-nums">{st.streak} dias</p>
      </div>

      <section className="mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Categorias mais lidas</h2>
        {st.topCategories.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
        <div className="space-y-2">
          {st.topCategories.slice(0, 5).map(([c, n]) => (
            <div key={c} className="bg-surface border border-border rounded-xl p-3 flex justify-between text-sm">
              <span>{c}</span>
              <span className="text-muted-foreground tabular-nums">{n}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Autor mais lido</h2>
        <p className="text-sm">{st.topAuthors[0]?.[0] ?? "Sem dados ainda."}</p>
      </section>
    </div>
  );
}
