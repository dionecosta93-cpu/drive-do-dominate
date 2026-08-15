import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, Check, Copy, Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, dateKey, type ShoppingItem } from "@/lib/store";
import { brl } from "@/lib/finance";
import { listTotals, parseItemsText, SHOPPING_CATEGORIES, shoppingCategoryLabel, UNITS } from "@/lib/shopping";

export const Route = createFileRoute("/_authenticated/shopping/$id")({
  component: ShoppingDetail,
  head: () => ({
    meta: [
      { title: "Minha lista de compras — Disciplina Absoluta" },
      { name: "description", content: "Itens, quantidades, preços e progresso da sua compra, com lançamento automático no financeiro." },
      { property: "og:title", content: "Minha lista de compras — Disciplina Absoluta" },
      { property: "og:description", content: "Marque itens comprados e registre os gastos automaticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ShoppingDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const list = useStore((s) => s.shoppingLists.find((l) => l.id === id));
  const addShoppingItem = useStore((s) => s.addShoppingItem);
  const updateShoppingItem = useStore((s) => s.updateShoppingItem);
  const removeShoppingItem = useStore((s) => s.removeShoppingItem);
  const setPurchased = useStore((s) => s.setShoppingItemPurchased);
  const updateShoppingList = useStore((s) => s.updateShoppingList);
  const duplicateShoppingList = useStore((s) => s.duplicateShoppingList);
  const addTask = useStore((s) => s.addTask);

  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [priceFor, setPriceFor] = useState<string | null>(null);
  const [price, setPrice] = useState("");

  if (!list) {
    return (
      <div className="mx-auto max-w-[440px] px-4 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Lista não encontrada.</p>
        <Link to="/shopping" className="mt-4 inline-block rounded-md bg-discipline px-4 py-2 text-sm font-bold text-background">
          Voltar
        </Link>
      </div>
    );
  }

  const totals = listTotals(list);

  const addQuick = () => {
    const parsed = parseItemsText(quick);
    if (!parsed.length) return;
    for (const p of parsed) addShoppingItem(list.id, p);
    setQuick("");
    toast.success(`${parsed.length} item(ns) adicionado(s).`);
  };

  const confirmPurchase = (item: ShoppingItem) => {
    const value = Number(price.replace(",", "."));
    setPurchased(list.id, item.id, true, Number.isFinite(value) && value > 0 ? value : undefined);
    setPriceFor(null);
    setPrice("");
    toast.success(`${item.name} comprado.`);
  };

  const createShoppingTask = () => {
    addTask({
      name: `🛒 ${list.name}`,
      description: `Lista com ${list.items.length} itens`,
      category: "vida",
      priority: "media",
      time: "09:00",
      estimatedMinutes: 60,
      maxMinutes: 90,
      difficulty: 3,
      repetition: "nenhuma",
      scheduledDate: list.date,
      alarmMinutesBefore: 5,
      reward: "",
      consequence: "",
      shoppingListId: list.id,
    });
    toast.success("Tarefa de compras criada (lembrete 5 min antes).");
  };

  return (
    <div className="mx-auto max-w-[440px] px-4 pb-28 pt-6">
      <div className="flex items-center gap-2">
        <Link to="/shopping" className="rounded-md border border-input p-2">
          <ArrowLeft className="size-4" />
        </Link>
        <input
          value={list.name}
          onChange={(e) => updateShoppingList(list.id, { name: e.target.value })}
          className="flex-1 rounded-md border border-transparent bg-transparent px-1 text-xl font-black uppercase focus:border-input"
        />
      </div>

      <div className="mt-3 flex gap-2 text-xs">
        <input
          type="date"
          value={list.date}
          onChange={(e) => updateShoppingList(list.id, { date: e.target.value })}
          className="rounded-md border border-input bg-background px-2 py-1"
        />
        <select
          value={list.financeCategory}
          onChange={(e) => updateShoppingList(list.id, { financeCategory: e.target.value })}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1"
        >
          {SHOPPING_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {shoppingCategoryLabel[c]}
            </option>
          ))}
        </select>
      </div>

      {/* Totais */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimado</span>
          <span className="font-mono font-bold">{brl(totals.estimated)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Comprado</span>
          <span className="font-mono font-bold text-discipline">{brl(totals.paid)}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Itens comprados: {totals.done}/{totals.total}
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-discipline transition-all" style={{ width: `${totals.pct}%` }} />
        </div>
      </div>

      {/* Lista rápida */}
      <div className="mt-4 flex gap-2">
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuick()}
          placeholder="2 pacotes de arroz, 3 litros de leite..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button onClick={addQuick} className="rounded-md bg-discipline px-3 text-background">
          <Plus className="size-4" />
        </button>
      </div>

      {/* Itens */}
      <div className="mt-4 space-y-2">
        {list.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Lista vazia. Digite acima ou peça ao assistente.
          </p>
        )}
        {list.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  item.purchased ? setPurchased(list.id, item.id, false) : setPriceFor(item.id)
                }
                className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${
                  item.purchased ? "border-discipline bg-discipline text-background" : "border-input"
                }`}
                aria-label={item.purchased ? "Desfazer" : "Marcar como comprado"}
              >
                {item.purchased ? <Check className="size-5" /> : <span className="size-4 rounded-sm border border-muted-foreground" />}
              </button>
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(editing === item.id ? null : item.id)}>
                <div className={`truncate font-bold ${item.purchased ? "text-muted-foreground line-through" : ""}`}>
                  {item.name}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {item.quantity} {item.unit} · {shoppingCategoryLabel[item.category] ?? item.category}
                  {item.estimatedPrice ? ` · est. ${brl(item.estimatedPrice)}` : ""}
                  {item.purchased && item.paidPrice ? ` · pago ${brl(item.paidPrice)}` : ""}
                  {item.purchased && item.purchasedAt
                    ? ` · ${new Date(`${item.purchasedAt}T12:00:00`).toLocaleDateString("pt-BR")}`
                    : ""}
                </div>
              </button>
              {item.purchased && (
                <button onClick={() => setPurchased(list.id, item.id, false)} className="p-1 text-muted-foreground" aria-label="Desfazer">
                  <Undo2 className="size-4" />
                </button>
              )}
              <button onClick={() => removeShoppingItem(list.id, item.id)} className="p-1 text-destructive" aria-label="Excluir item">
                <Trash2 className="size-4" />
              </button>
            </div>

            {priceFor === item.id && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmPurchase(item)}
                  placeholder="Preço pago (R$)"
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
                <button onClick={() => confirmPurchase(item)} className="rounded-md bg-discipline px-3 text-sm font-bold text-background">
                  Comprado
                </button>
              </div>
            )}

            {editing === item.id && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <input
                  value={item.name}
                  onChange={(e) => updateShoppingItem(list.id, item.id, { name: e.target.value })}
                  className="col-span-2 rounded-md border border-input bg-background px-2 py-1"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateShoppingItem(list.id, item.id, { quantity: Number(e.target.value) || 1 })}
                  className="rounded-md border border-input bg-background px-2 py-1"
                />
                <select
                  value={item.unit}
                  onChange={(e) => updateShoppingItem(list.id, item.id, { unit: e.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  inputMode="decimal"
                  placeholder="Preço estimado"
                  value={item.estimatedPrice ?? ""}
                  onChange={(e) =>
                    updateShoppingItem(list.id, item.id, { estimatedPrice: Number(e.target.value.replace(",", ".")) || undefined })
                  }
                  className="rounded-md border border-input bg-background px-2 py-1"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateShoppingItem(list.id, item.id, { category: e.target.value })}
                  className="rounded-md border border-input bg-background px-2 py-1"
                >
                  {SHOPPING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {shoppingCategoryLabel[c]}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Observação"
                  value={item.notes ?? ""}
                  onChange={(e) => updateShoppingItem(list.id, item.id, { notes: e.target.value })}
                  className="col-span-2 rounded-md border border-input bg-background px-2 py-1"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold uppercase">
        <button onClick={createShoppingTask} className="flex items-center justify-center gap-1 rounded-md border border-input py-2">
          <CalendarPlus className="size-4" /> Criar tarefa
        </button>
        <button
          onClick={() => {
            const copy = duplicateShoppingList(list.id, `${list.name}`, dateKey());
            if (copy) void router.navigate({ to: "/shopping/$id", params: { id: copy.id } });
          }}
          className="flex items-center justify-center gap-1 rounded-md border border-input py-2"
        >
          <Copy className="size-4" /> Repetir lista
        </button>
        <button
          onClick={() => {
            updateShoppingList(list.id, { done: !list.done });
            toast.success(list.done ? "Lista reaberta." : "Compra finalizada.");
          }}
          className="col-span-2 rounded-md bg-discipline py-2.5 text-background"
        >
          {list.done ? "Reabrir lista" : "Finalizar compra"}
        </button>
      </div>
    </div>
  );
}
