import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, dateKey } from "@/lib/store";
import { brl } from "@/lib/finance";
import { listTotals, SHOPPING_CATEGORIES, shoppingCategoryLabel } from "@/lib/shopping";
import { RequireFeature } from "@/components/require-feature";

export const Route = createFileRoute("/_authenticated/shopping/")({
  component: () => (
    <RequireFeature feature="shopping">
      <ShoppingHome />
    </RequireFeature>
  ),
  head: () => ({
    meta: [
      { title: "Lista de Compras — Disciplina Absoluta" },
      {
        name: "description",
        content:
          "Crie listas de compras, marque itens comprados e registre os gastos direto no financeiro.",
      },
      { property: "og:title", content: "Lista de Compras — Disciplina Absoluta" },
      {
        property: "og:description",
        content: "Listas inteligentes de compras integradas ao financeiro e ao assistente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ShoppingHome() {
  const router = useRouter();
  const lists = useStore((s) => s.shoppingLists);
  const transactions = useStore((s) => s.transactions);
  const addShoppingList = useStore((s) => s.addShoppingList);
  const removeShoppingList = useStore((s) => s.removeShoppingList);
  const duplicateShoppingList = useStore((s) => s.duplicateShoppingList);

  const [tab, setTab] = useState<"ativas" | "historico" | "gastos">("ativas");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("mercado");
  const [date, setDate] = useState(dateKey());
  const [open, setOpen] = useState(false);

  const active = lists.filter((l) => !l.done);
  const history = lists.filter((l) => l.done);

  /** Evolução dos gastos por mês nas categorias de compras. */
  const evolution = useMemo(() => {
    const cats = new Set<string>(SHOPPING_CATEGORIES);
    const map = new Map<string, Map<string, number>>();
    for (const t of transactions) {
      if (t.kind !== "despesa" || !cats.has(t.category)) continue;
      const m = t.date.slice(0, 7);
      const inner = map.get(t.category) ?? new Map<string, number>();
      inner.set(m, (inner.get(m) ?? 0) + t.amount);
      map.set(t.category, inner);
    }
    return [...map.entries()]
      .map(([cat, inner]) => ({
        cat,
        months: [...inner.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6),
        total: [...inner.values()].reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const create = () => {
    const list = addShoppingList({
      name: name.trim() || "Compras",
      financeCategory: category,
      date,
    });
    setName("");
    setOpen(false);
    toast.success("Lista criada.");
    void router.navigate({ to: "/shopping/$id", params: { id: list.id } });
  };

  return (
    <div className="mx-auto max-w-[440px] px-4 pb-28 pt-6">
      <header className="flex items-center gap-3">
        <ShoppingCart className="size-6 text-discipline" />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Lista de Compras</h1>
          <p className="text-xs text-muted-foreground">
            Compre, marque e o gasto vai direto pro financeiro.
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-border p-1 text-[11px] font-bold uppercase">
        {(["ativas", "historico", "gastos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md py-2 transition-colors ${tab === t ? "bg-discipline text-background" : "text-muted-foreground"}`}
          >
            {t === "ativas" ? "Ativas" : t === "historico" ? "Histórico" : "Gastos"}
          </button>
        ))}
      </div>

      {tab === "ativas" && (
        <>
          {open ? (
            <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da lista (Mercado, Farmácia...)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  {SHOPPING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {shoppingCategoryLabel[c]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={create}
                  className="flex-1 rounded-md bg-discipline py-2 text-sm font-bold text-background"
                >
                  Criar lista
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-input px-3 py-2 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-discipline py-3 text-sm font-black uppercase text-background"
            >
              <Plus className="size-4" /> Nova lista
            </button>
          )}

          <div className="mt-4 space-y-3">
            {active.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma lista ativa. Crie uma ou peça ao assistente: “cria uma lista com arroz,
                feijão e leite”.
              </p>
            )}
            {active.map((l) => {
              const t = listTotals(l);
              return (
                <div key={l.id} className="rounded-xl border border-border bg-card p-3">
                  <Link to="/shopping/$id" params={{ id: l.id }} className="block">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold">{l.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(`${l.date}T12:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Itens {t.done}/{t.total} · Estimado {brl(t.estimated)} · Comprado{" "}
                      {brl(t.paid)}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-discipline transition-all"
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </Link>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        duplicateShoppingList(l.id);
                        toast.success("Lista repetida.");
                      }}
                      className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[11px]"
                    >
                      <Copy className="size-3" /> Repetir
                    </button>
                    <button
                      onClick={() => {
                        removeShoppingList(l.id);
                        toast("Lista excluída.");
                      }}
                      className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-[11px] text-destructive"
                    >
                      <Trash2 className="size-3" /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "historico" && (
        <div className="mt-4 space-y-3">
          {history.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma lista finalizada ainda.
            </p>
          )}
          {history.map((l) => {
            const t = listTotals(l);
            const cats = [
              ...new Set(l.items.map((i) => shoppingCategoryLabel[i.category] ?? i.category)),
            ];
            return (
              <Link
                key={l.id}
                to="/shopping/$id"
                params={{ id: l.id }}
                className="block rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{l.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(`${l.date}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.total} itens · Total gasto {brl(t.paid)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{cats.join(" · ")}</div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "gastos" && (
        <div className="mt-4 space-y-3">
          {evolution.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Ainda não há gastos registrados nas categorias de compras.
            </p>
          )}
          {evolution.map((row) => (
            <div key={row.cat} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{shoppingCategoryLabel[row.cat] ?? row.cat}</span>
                <span className="text-xs text-muted-foreground">{brl(row.total)}</span>
              </div>
              <div className="mt-2 space-y-1">
                {row.months.map(([m, v]) => (
                  <div key={m} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {new Date(`${m}-01T12:00:00`).toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="font-mono">{brl(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/finance"
            className="block rounded-xl border border-border p-3 text-center text-xs font-bold uppercase"
          >
            Ver financeiro completo
          </Link>
        </div>
      )}
    </div>
  );
}
