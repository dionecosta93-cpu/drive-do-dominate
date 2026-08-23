import { createFileRoute } from "@tanstack/react-router";
import { useStore, xpToLevel } from "@/lib/store";
import { buildPerformance } from "@/lib/performance";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, Cell } from "recharts";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/stats")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estatísticas — Kairos" }, { name: "description", content: "Veja sua evolução, tempo produtivo e disciplina em números." }] }),
});

function Stats() {
  const { sessions, streak, longestStreak, xp } = useStore();


  const totalMinutes = sessions.reduce((a, b) => a + b.spentSeconds / 60, 0);
  const totalEstimated = sessions.reduce((a, b) => a + b.estimatedMinutes, 0);
  const efficiency = totalMinutes > 0 ? Math.round((totalEstimated / totalMinutes) * 100) : 0;
  const level = xpToLevel(xp);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
      map[key] = 0;
    }
    for (const s of sessions) {
      const d = new Date(s.completedAt);
      const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
      if (diff < 7) {
        const key = d.toLocaleDateString("pt-BR", { weekday: "short" });
        if (key in map) map[key] += Math.round(s.spentSeconds / 60);
      }
    }
    return Object.entries(map).map(([day, minutes]) => ({ day, minutes }));
  }, [sessions]);

  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) map[s.category] = (map[s.category] ?? 0) + Math.round(s.spentSeconds / 60);
    return Object.entries(map).map(([category, minutes]) => ({ category, minutes }));
  }, [sessions]);

  const cumulativeXp = useMemo(() => {
    let acc = 0;
    return sessions.slice(-14).map((s, i) => {
      acc += s.xp;
      return { i: i + 1, xp: acc };
    });
  }, [sessions]);

  const tasks = useStore((s) => s.tasks);
  const dismissedMissed = useStore((s) => s.dismissedMissed);
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const perf = useMemo(
    () => buildPerformance(tasks, sessions, dismissedMissed, range),
    [tasks, sessions, dismissedMissed, range],
  );
  const barColor = (pct: number) => (pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444");
  const fmtDay = (d?: string) => (d ? d.split("-").reverse().slice(0, 2).join("/") : "—");

  return (
    <div className="px-5 pt-8 pb-4 animate-rise">
      <h1 className="text-2xl font-heading font-extrabold uppercase mb-6">Estatísticas</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card label="Horas produtivas" value={`${(totalMinutes / 60).toFixed(1)}h`} color="text-discipline" />
        <Card label="Eficiência média" value={`${efficiency}%`} color={efficiency >= 100 ? "text-discipline" : "text-warning"} />
        <Card label="Sequência atual" value={`${streak} dias`} />
        <Card label="Maior sequência" value={`${longestStreak} dias`} color="text-warning" />
        <Card label="Nível" value={String(level.level)} color="text-discipline" />
        <Card label="XP total" value={String(xp)} />
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest">📊 Desempenho</p>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                  range === r ? "bg-discipline text-black border-discipline" : "border-border text-muted-foreground"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={perf.days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="label" stroke="#71717a" fontSize={9} interval={range === 7 ? 0 : "preserveStartEnd"} />
            <YAxis stroke="#71717a" fontSize={10} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 8 }}
              formatter={(v: number, _n, p) => [
                `${v}% · ${p.payload.done}/${p.payload.total} concluídas`,
                fmtDay(p.payload.date),
              ]}
              labelFormatter={() => ""}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {perf.days.map((d) => (
                <Cell key={d.date} fill={d.total === 0 ? "#262626" : barColor(d.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Stat label="📊 Média de desempenho" value={`${perf.average}%`} color="text-discipline" />
          <Stat label="📅 Dias analisados" value={String(perf.analyzedDays)} />
          <Stat label="🔥 Melhor dia" value={perf.best ? `${fmtDay(perf.best.date)} · ${perf.best.pct}%` : "—"} color="text-discipline" />
          <Stat label="📉 Pior dia" value={perf.worst ? `${fmtDay(perf.worst.date)} · ${perf.worst.pct}%` : "—"} color="text-struggle" />
          <Stat label="✅ Concluídas" value={String(perf.totalDone)} color="text-discipline" />
          <Stat label="⚠️ Dispensadas" value={String(perf.totalDismissed)} color="text-struggle" />
          <Stat label="⏳ Pendentes" value={String(perf.totalPending)} color="text-warning" />
        </div>
      </div>

      {perf.weeks.length > 0 && (
        <Section title="Evolução do desempenho">
          <div className="space-y-2">
            {perf.weeks.map((w) => (
              <div key={w.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[10px] font-mono uppercase text-muted-foreground">{w.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${w.pct}%`, background: barColor(w.pct) }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-heading font-bold">{w.pct}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold">
            {perf.trend === "up" ? "📈 Melhorando" : perf.trend === "down" ? "📉 Caindo" : "➡️ Estável"}
          </p>
        </Section>
      )}


      <Section title="Últimos 7 dias · minutos">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 8 }} />
            <Bar dataKey="minutes" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {byCat.length > 0 && (
        <Section title="Por categoria · minutos">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCat} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
              <XAxis type="number" stroke="#71717a" fontSize={10} />
              <YAxis dataKey="category" type="category" stroke="#71717a" fontSize={10} width={70} />
              <Tooltip contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 8 }} />
              <Bar dataKey="minutes" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {cumulativeXp.length > 1 && (
        <Section title="Evolução de XP (últimas 14 tarefas)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cumulativeXp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
              <XAxis dataKey="i" stroke="#71717a" fontSize={10} />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip contentStyle={{ background: "#121212", border: "1px solid #262626", borderRadius: 8 }} />
              <Line type="monotone" dataKey="xp" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      )}

      {sessions.length === 0 && (
        <p className="text-center text-muted-foreground text-sm mt-10">
          Complete sua primeira tarefa para começar a ver dados.
        </p>
      )}
    </div>
  );
}

function Card({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-heading font-black ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}
