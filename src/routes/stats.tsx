import { createFileRoute } from "@tanstack/react-router";
import { useStore, xpToLevel } from "@/lib/store";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid } from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/stats")({
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
