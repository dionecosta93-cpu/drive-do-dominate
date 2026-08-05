import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { buildReport, buildSuggestions } from "@/lib/analytics";
import { toast } from "sonner";
import { ChevronLeft, Sparkles, TrendingUp, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Relatórios da IA — Disciplina Absoluta" },
      { name: "description", content: "Análises de produtividade, padrões de horário, abandono por categoria e evolução." },
      { property: "og:title", content: "Relatórios da IA" },
      { property: "og:description", content: "Descubra seus padrões de produtividade e onde você perde tempo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReportsPage() {
  const { tasks, sessions, updateTask } = useStore();
  const report = useMemo(() => buildReport(tasks, sessions), [tasks, sessions]);
  const suggestions = useMemo(() => buildSuggestions(tasks, sessions), [tasks, sessions]);
  const maxWeekly = Math.max(...report.weekly.map((w) => w.value), 1);
  const maxMonthly = Math.max(...report.monthly.map((w) => w.value), 1);

  return (
    <div className="px-5 pt-6 pb-24 animate-rise">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <ChevronLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-1">Relatórios da IA</h1>
      <p className="text-xs text-muted-foreground mb-6">O que seus dados dizem sobre a sua disciplina.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card label="Tempo total focado" value={`${Math.floor(report.totalMinutes / 60)}h ${report.totalMinutes % 60}m`} />
        <Card label="Tempo economizado" value={`${report.savedMinutes} min`} accent />
        <Card label="Melhor horário" value={report.bestHour ? `${String(report.bestHour.hour).padStart(2, "0")}:00` : "—"} />
        <Card label="Melhor dia" value={report.bestWeekday?.name ?? "—"} />
      </div>

      {report.topTask && (
        <p className="text-xs text-muted-foreground mb-6">
          Tarefa mais concluída: <b className="text-foreground">{report.topTask.name}</b> ({report.topTask.count}x)
        </p>
      )}

      {report.worstCategory && (
        <div className="flex gap-3 bg-struggle/10 border border-struggle/25 rounded-2xl p-4 mb-6">
          <AlertTriangle className="size-5 text-struggle shrink-0" />
          <p className="text-xs text-struggle/90 leading-snug">
            Maior taxa de abandono: <b className="uppercase">{report.worstCategory.category}</b> — {report.worstCategory.rate}% das
            ocorrências planejadas nos últimos 30 dias não foram concluídas.
          </p>
        </div>
      )}

      <Section icon={<TrendingUp className="size-4" />} title="Últimos 7 dias">
        <Bars data={report.weekly} max={maxWeekly} />
      </Section>

      <Section icon={<TrendingUp className="size-4" />} title="Evolução mensal">
        <Bars data={report.monthly} max={maxMonthly} />
      </Section>

      <Section icon={<Clock className="size-4" />} title="Tempo por categoria">
        <div className="space-y-2">
          {report.minutesByCategory.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
          {report.minutesByCategory.map(([cat, min]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-20 shrink-0">{cat}</span>
              <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-info"
                  style={{ width: `${Math.max((min / (report.minutesByCategory[0]?.[1] || 1)) * 100, 3)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono tabular-nums w-14 text-right">{min} min</span>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Sparkles className="size-4" />} title="Sugestões inteligentes">
        <div className="space-y-3">
          {suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum ajuste sugerido. Sua agenda está coerente.</p>
          )}
          {suggestions.map((s) => (
            <div key={s.id} className="bg-info/5 border border-info/20 rounded-2xl p-4">
              <p className="text-sm font-bold leading-tight mb-1">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-snug mb-3">{s.detail}</p>
              {s.taskId && s.patch && (
                <button
                  onClick={() => {
                    updateTask(s.taskId!, s.patch!);
                    toast.success("Agenda reorganizada.");
                  }}
                  className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-info text-black"
                >
                  Aplicar sugestão
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className={`text-xl font-heading font-black mb-1 ${accent ? "text-discipline" : ""}`}>{value}</div>
      <p className="text-[10px] text-muted-foreground uppercase font-bold leading-tight">{label}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Bars({ data, max }: { data: { label: string; value: number }[]; max: number }) {
  return (
    <div className="flex items-end gap-2 h-32 bg-surface border border-border rounded-2xl p-4">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{d.value}</span>
          <div
            className="w-full bg-discipline/80 rounded-t transition-all duration-700"
            style={{ height: `${Math.max((d.value / max) * 100, 3)}%` }}
          />
          <span className="text-[9px] uppercase text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
