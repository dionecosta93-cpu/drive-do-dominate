import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { useStore, dateKey, type Transaction } from "@/lib/store";
import { brl, FINANCE_CATEGORIES, financeCategoryColor, financeCategoryLabel } from "@/lib/finance";
import { RequireFeature } from "@/components/require-feature";

export const Route = createFileRoute("/_authenticated/finance")({
  component: () => (
    <RequireFeature feature="finance">
      <FinanceScreen />
    </RequireFeature>
  ),
  head: () => ({
    meta: [
      { title: "Finanças — Disciplina Absoluta" },
      {
        name: "description",
        content: "Controle gastos, receitas, gráficos e relatórios financeiros por período.",
      },
      { property: "og:title", content: "Finanças — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Receitas, despesas, categorias e gráficos por período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type PeriodKind = "hoje" | "semana" | "mes" | "custom";

const PAYMENT_METHODS = [
  "pix",
  "débito",
  "crédito",
  "dinheiro",
  "boleto",
  "transferência",
  "outro",
];

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function periodRange(kind: PeriodKind, from: string, to: string) {
  const now = new Date();
  const today = dateKey(now);
  if (kind === "hoje") return { start: today, end: today, label: "Hoje" };
  if (kind === "semana") {
    const start = dateKey(addDays(now, -((now.getDay() + 6) % 7))); // segunda-feira
    return { start, end: today, label: "Esta semana" };
  }
  if (kind === "mes") {
    return {
      start: `${today.slice(0, 7)}-01`,
      end: today,
      label: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  }
  return { start: from, end: to, label: "Período personalizado" };
}

const emptyForm = {
  id: "",
  kind: "despesa" as "despesa" | "receita",
  amount: "",
  category: "outros",
  description: "",
  paymentMethod: "",
  notes: "",
  date: dateKey(),
};

function FinanceScreen() {
  const transactions = useStore((s) => s.transactions);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const removeTransaction = useStore((s) => s.removeTransaction);

  const [kind, setKind] = useState<PeriodKind>("mes");
  const [from, setFrom] = useState(`${dateKey().slice(0, 7)}-01`);
  const [to, setTo] = useState(dateKey());
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const range = periodRange(kind, from, to);

  const list = useMemo(
    () =>
      transactions
        .filter((t) => t.date >= range.start && t.date <= range.end)
        .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1)),
    [transactions, range.start, range.end],
  );

  const income = list.filter((t) => t.kind === "receita").reduce((a, b) => a + b.amount, 0);
  const expense = list.filter((t) => t.kind === "despesa").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of list)
      if (t.kind === "despesa") map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({ category, total }));
  }, [list]);

  /** Série temporal: diária em períodos curtos, mensal em períodos longos. */
  const series = useMemo(() => {
    const spanDays = Math.round(
      (new Date(`${range.end}T12:00:00`).getTime() -
        new Date(`${range.start}T12:00:00`).getTime()) /
        86400000,
    );
    const byMonth = spanDays > 92;
    const map = new Map<string, { key: string; receitas: number; despesas: number }>();
    for (const t of list) {
      const key = byMonth ? t.date.slice(0, 7) : t.date.slice(5);
      const row = map.get(key) ?? { key, receitas: 0, despesas: 0 };
      if (t.kind === "receita") row.receitas += t.amount;
      else row.despesas += t.amount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [list, range.start, range.end]);

  /** Comparação entre os últimos 6 meses (independente do filtro). */
  const monthlyCompare = useMemo(() => {
    const map = new Map<string, { key: string; receitas: number; despesas: number }>();
    for (const t of transactions) {
      const key = t.date.slice(0, 7);
      const row = map.get(key) ?? { key, receitas: 0, despesas: 0 };
      if (t.kind === "receita") row.receitas += t.amount;
      else row.despesas += t.amount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [transactions]);

  const openEdit = (t: Transaction) => {
    setForm({
      id: t.id,
      kind: t.kind,
      amount: String(t.amount),
      category: t.category,
      description: t.description ?? "",
      paymentMethod: t.paymentMethod ?? "",
      notes: t.notes ?? "",
      date: t.date,
    });
    setShowForm(true);
  };

  const submit = () => {
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor válido.");
    const payload = {
      kind: form.kind,
      amount,
      category: form.category,
      description: form.description.trim() || undefined,
      paymentMethod: form.paymentMethod || undefined,
      notes: form.notes.trim() || undefined,
      date: form.date,
    };
    if (form.id) {
      updateTransaction(form.id, payload);
      toast.success("Lançamento atualizado.");
    } else {
      addTransaction(payload);
      toast.success("Lançamento registrado.");
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const field =
    "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-discipline";
  const chip = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${
      active
        ? "bg-discipline/20 border-discipline text-discipline"
        : "bg-surface border-border text-muted-foreground"
    }`;

  return (
    <div className="px-5 pt-8 pb-28 animate-rise">
      <header className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-heading font-extrabold uppercase">Finanças</h1>
        <button
          onClick={() => {
            setForm(emptyForm);
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1 bg-discipline text-black px-3 py-2 rounded-lg text-xs font-bold"
        >
          <Plus className="size-4" /> Lançar
        </button>
      </header>

      {/* Filtros por período */}
      <div className="flex gap-2 overflow-x-auto pb-3">
        <button onClick={() => setKind("hoje")} className={chip(kind === "hoje")}>
          Hoje
        </button>
        <button onClick={() => setKind("semana")} className={chip(kind === "semana")}>
          Esta semana
        </button>
        <button onClick={() => setKind("mes")} className={chip(kind === "mes")}>
          Este mês
        </button>
        <button onClick={() => setKind("custom")} className={chip(kind === "custom")}>
          Personalizado
        </button>
      </div>
      {kind === "custom" && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </div>
      )}

      {/* Resumo */}
      <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-4" /> {range.label}
        </span>
        <p
          className="font-heading font-black text-3xl tabular-nums mt-1"
          style={{ color: balance >= 0 ? "#22c55e" : "#ef4444" }}
        >
          {brl(balance)}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-background border border-border rounded-xl p-3">
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-discipline">
              <TrendingUp className="size-3" /> Receitas
            </span>
            <p className="font-heading font-bold tabular-nums">{brl(income)}</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-3">
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-struggle">
              <TrendingDown className="size-3" /> Despesas
            </span>
            <p className="font-heading font-bold tabular-nums">{brl(expense)}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          {list.length} lançamento(s) · {range.start.split("-").reverse().join("/")} a{" "}
          {range.end.split("-").reverse().join("/")}
        </p>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-discipline">
              {form.id ? "Editar lançamento" : "Novo lançamento"}
            </p>
            <button
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
              aria-label="Fechar"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["despesa", "receita"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setForm({ ...form, kind: k })}
                className={`py-2 rounded-xl text-[10px] font-bold uppercase border ${
                  form.kind === k
                    ? "bg-discipline text-black border-discipline"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            inputMode="decimal"
            placeholder="Valor (R$)"
            className={field}
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={field}
          >
            {FINANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {financeCategoryLabel[c]}
              </option>
            ))}
          </select>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            className={field}
          >
            <option value="">Forma de pagamento</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={field}
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição"
            className={field}
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Observação"
            className={field}
          />
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl bg-discipline text-black text-xs font-bold uppercase"
          >
            {form.id ? "Salvar alterações" : "Registrar"}
          </button>
        </div>
      )}

      {/* Gastos por categoria */}
      {byCategory.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Gastos por categoria
          </p>
          <div className="bg-surface border border-border rounded-2xl p-3">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {byCategory.map((c) => (
                      <Cell key={c.category} fill={financeCategoryColor[c.category] ?? "#71717a"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => brl(v)}
                    labelFormatter={(l: string) => financeCategoryLabel[l] ?? l}
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: financeCategoryColor[c.category] ?? "#71717a" }}
                    />
                    {financeCategoryLabel[c.category] ?? c.category}
                  </span>
                  <span className="tabular-nums font-bold">{brl(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Evolução no período */}
      {series.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Evolução do período
          </p>
          <div className="bg-surface border border-border rounded-2xl p-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} width={40} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Comparação mensal */}
      {monthlyCompare.length > 1 && (
        <section className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Comparação entre meses
          </p>
          <div className="bg-surface border border-border rounded-2xl p-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCompare}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} width={40} />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Histórico detalhado */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Histórico detalhado
        </p>
        {list.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum lançamento neste período.</p>
        )}
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="bg-surface border border-border rounded-xl p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {financeCategoryLabel[t.category] ?? t.category}
                    {t.description ? ` — ${t.description}` : ""}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {t.date.split("-").reverse().join("/")}
                    {t.paymentMethod ? ` · ${t.paymentMethod}` : ""}
                  </p>
                  {t.notes && <p className="text-[11px] text-muted-foreground mt-1">{t.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="font-heading font-bold tabular-nums text-sm"
                    style={{ color: t.kind === "receita" ? "#22c55e" : "#ef4444" }}
                  >
                    {t.kind === "receita" ? "+" : "-"}
                    {brl(t.amount)}
                  </span>
                  <button
                    onClick={() => openEdit(t)}
                    className="text-muted-foreground hover:text-discipline"
                    aria-label="Editar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm("Excluir este lançamento?")) return;
                      removeTransaction(t.id);
                      toast.success("Lançamento excluído.");
                    }}
                    className="text-muted-foreground hover:text-struggle"
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
