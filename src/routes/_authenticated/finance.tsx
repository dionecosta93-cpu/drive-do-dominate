import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { brl, FINANCE_CATEGORIES, financeCategoryColor, financeCategoryLabel } from "@/lib/finance";
import { dateKey } from "@/lib/store";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance")({
  component: FinanceScreen,
  head: () => ({
    meta: [
      { title: "Finanças — Disciplina Absoluta" },
      { name: "description", content: "Controle gastos, receitas e relatórios financeiros com o assistente de IA." },
      { property: "og:title", content: "Finanças — Disciplina Absoluta" },
      { property: "og:description", content: "Controle gastos, receitas e relatórios financeiros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FinanceScreen() {
  const transactions = useStore((s) => s.transactions);
  const addTransaction = useStore((s) => s.addTransaction);
  const removeTransaction = useStore((s) => s.removeTransaction);

  const [month, setMonth] = useState(dateKey().slice(0, 7));
  const [form, setForm] = useState({
    kind: "despesa" as "despesa" | "receita",
    amount: "",
    category: "outros",
    description: "",
    date: dateKey(),
  });
  const [showForm, setShowForm] = useState(false);

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(month)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, month],
  );
  const income = monthTx.filter((t) => t.kind === "receita").reduce((a, b) => a + b.amount, 0);
  const expense = monthTx.filter((t) => t.kind === "despesa").reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) if (t.kind === "despesa") map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)));
    set.add(dateKey().slice(0, 7));
    return [...set].sort().reverse();
  }, [transactions]);

  const submit = () => {
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor válido.");
    addTransaction({
      kind: form.kind,
      amount,
      category: form.category,
      description: form.description.trim() || undefined,
      date: form.date,
    });
    setForm({ ...form, amount: "", description: "" });
    setShowForm(false);
    toast.success("Lançamento registrado.");
  };

  return (
    <div className="px-5 pt-8 pb-28 animate-rise">
      <header className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-heading font-extrabold uppercase">Finanças</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 bg-discipline text-black px-3 py-2 rounded-lg text-xs font-bold"
        >
          <Plus className="size-4" /> Lançar
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border ${
              m === month ? "bg-discipline/20 border-discipline text-discipline" : "bg-surface border-border text-muted-foreground"
            }`}
          >
            {m.split("-").reverse().join("/")}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Wallet className="size-4" /> Saldo do mês
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
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["despesa", "receita"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setForm({ ...form, kind: k })}
                className={`py-2 rounded-lg text-[10px] font-bold uppercase border ${
                  form.kind === k ? "bg-discipline/20 border-discipline text-discipline" : "bg-background border-border text-muted-foreground"
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
            placeholder="Valor (ex.: 45,90)"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-discipline"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
          >
            {FINANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{financeCategoryLabel[c]}</option>
            ))}
          </select>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-discipline"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
          />
          <button onClick={submit} className="w-full bg-discipline text-black rounded-xl py-3 font-bold uppercase text-sm">
            Registrar
          </button>
        </div>
      )}

      {byCategory.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gastos por categoria</span>
          <div className="space-y-2 mt-3">
            {byCategory.map(([cat, value]) => (
              <div key={cat}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>{financeCategoryLabel[cat] ?? cat}</span>
                  <span className="tabular-nums text-muted-foreground">{brl(value)}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(3, (value / Math.max(expense, 1)) * 100)}%`,
                      background: financeCategoryColor[cat] ?? "#71717a",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Lançamentos</h2>
      {monthTx.length === 0 && <p className="text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>}
      <div className="space-y-2">
        {monthTx.map((t) => (
          <div key={t.id} className="bg-surface border border-border rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold leading-tight">{t.description || financeCategoryLabel[t.category] || t.category}</p>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {t.date.split("-").reverse().join("/")} · {financeCategoryLabel[t.category] ?? t.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-heading font-bold tabular-nums text-sm"
                style={{ color: t.kind === "receita" ? "#22c55e" : "#ef4444" }}
              >
                {t.kind === "receita" ? "+" : "−"}{brl(t.amount)}
              </span>
              <button onClick={() => removeTransaction(t.id)} className="text-muted-foreground p-1" aria-label="Excluir">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
