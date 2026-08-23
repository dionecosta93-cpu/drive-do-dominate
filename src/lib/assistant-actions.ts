import {
  dateKey,
  useStore,
  type Book,
  type BookStatus,
  type Category,
  type LifeGoalStatus,
  type Priority,
  type Repetition,
  type ShoppingItem,
  type ShoppingList,
  type Task,
  type TransactionKind,
} from "@/lib/store";
import { guessCategory, listTotals } from "@/lib/shopping";

export interface AssistantAction {
  type: string;
  label: string;
  payload: string;
}

const parse = (a: AssistantAction): Record<string, unknown> => {
  try {
    const p = JSON.parse(a.payload || "{}");
    return typeof p === "object" && p ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const str = (o: Record<string, unknown>, k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
const num = (o: Record<string, unknown>, k: string) => (typeof o[k] === "number" ? (o[k] as number) : undefined);
const bool = (o: Record<string, unknown>, k: string) => (typeof o[k] === "boolean" ? (o[k] as boolean) : undefined);

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Next date (>= from) whose weekday is in `weekdays`. */
function nextDateForWeekdays(weekdays: number[], from = dateKey()): string {
  const base = new Date(`${from}T12:00:00`);
  for (let i = 0; i < 14; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (weekdays.includes(d.getDay())) return dateKey(d);
  }
  return from;
}

/** Finds a book by id or by fuzzy title match. */
function findBook(p: Record<string, unknown>): Book | undefined {
  const s = useStore.getState();
  const id = str(p, "id");
  if (id) {
    const byId = s.books.find((b) => b.id === id);
    if (byId) return byId;
  }
  const title = (str(p, "title") ?? id ?? "").toLowerCase().trim();
  if (!title) return undefined;
  return (
    s.books.find((b) => b.title.toLowerCase() === title) ??
    s.books.find((b) => b.title.toLowerCase().includes(title) || title.includes(b.title.toLowerCase()))
  );
}

/** Lista de compras alvo: por id, por nome, ou a lista ativa/mais recente não finalizada. */
function findList(p: Record<string, unknown>): ShoppingList | undefined {
  const s = useStore.getState();
  const id = str(p, "listId") ?? str(p, "id");
  if (id) {
    const byId = s.shoppingLists.find((l) => l.id === id);
    if (byId) return byId;
  }
  const name = (str(p, "list") ?? str(p, "listName") ?? "").toLowerCase().trim();
  if (name) {
    const byName =
      s.shoppingLists.find((l) => l.name.toLowerCase() === name) ??
      s.shoppingLists.find((l) => l.name.toLowerCase().includes(name));
    if (byName) return byName;
  }
  const active = s.activeShoppingListId ? s.shoppingLists.find((l) => l.id === s.activeShoppingListId) : undefined;
  return active ?? s.shoppingLists.find((l) => !l.done) ?? s.shoppingLists[0];
}

/** Item da lista por id ou nome aproximado. */
function findItem(list: ShoppingList, p: Record<string, unknown>): ShoppingItem | undefined {
  const id = str(p, "itemId");
  if (id) {
    const byId = list.items.find((i) => i.id === id);
    if (byId) return byId;
  }
  const name = (str(p, "item") ?? str(p, "name") ?? "").toLowerCase().trim();
  if (!name) return undefined;
  return (
    list.items.find((i) => i.name.toLowerCase() === name) ??
    list.items.find((i) => i.name.toLowerCase().includes(name) || name.includes(i.name.toLowerCase()))
  );
}

/** Applies an assistant action to the local store. Returns a human message. */
export function applyAssistantAction(action: AssistantAction): string {
  const s = useStore.getState();
  const p = parse(action);

  switch (action.type) {
    case "criar_tarefa": {
      const name = str(p, "name");
      if (!name) return "Ação inválida: tarefa sem nome.";
      const est = num(p, "estimatedMinutes") ?? 30;
      const rawDays = Array.isArray(p["weekdays"])
        ? (p["weekdays"] as unknown[]).filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
        : undefined;
      const weekdays = rawDays && rawDays.length ? Array.from(new Set(rawDays)).sort() : undefined;

      let repetition = (str(p, "repetition") as Repetition) ?? "nenhuma";
      if (weekdays) repetition = repetition === "nenhuma" ? "dias-especificos" : repetition;

      // Weekday-driven tasks must land on the first matching weekday, never "today by default".
      const scheduledDate = weekdays
        ? nextDateForWeekdays(weekdays, str(p, "scheduledDate") ?? dateKey())
        : (str(p, "scheduledDate") ?? dateKey());

      const task = s.addTask({
        name,
        description: str(p, "description"),
        category: (str(p, "category") as Category) ?? "vida",
        priority: (str(p, "priority") as Priority) ?? "media",
        time: str(p, "time") ?? "08:00",
        endTime: str(p, "endTime"),
        estimatedMinutes: est,
        maxMinutes: num(p, "maxMinutes") ?? est + 15,
        difficulty: Math.min(10, Math.max(1, num(p, "difficulty") ?? 5)),
        repetition,
        weekdays,
        scheduledDate,
        startDate: str(p, "startDate"),
        endDate: str(p, "endDate"),
        alarmMinutesBefore: num(p, "alarmMinutesBefore") ?? null,
        motivation: str(p, "motivation"),
        notes: str(p, "notes"),
        reward: "",
        consequence: "",
      });
      const when = weekdays
        ? weekdays.map((d) => WEEKDAY_NAMES[d]).join(", ")
        : new Date(`${scheduledDate}T12:00:00`).toLocaleDateString("pt-BR");
      return `Tarefa criada: ${task.name} (${when} às ${task.time})`;
    }
    case "atualizar_tarefa": {
      const id = str(p, "id");
      const patch = { ...((p["patch"] ?? {}) as Partial<Task>) };
      if (!id || !s.tasks.some((t) => t.id === id)) return "Tarefa não encontrada.";
      if (Array.isArray(patch.weekdays) && patch.weekdays.length) {
        patch.repetition = patch.repetition ?? "dias-especificos";
        patch.scheduledDate = patch.scheduledDate ?? nextDateForWeekdays(patch.weekdays);
      }
      s.updateTask(id, patch);
      return "Tarefa atualizada.";
    }
    case "lembrete_tarefa": {
      const id = str(p, "id");
      const name = str(p, "name");
      const task = s.tasks.find((t) => t.id === id) ?? s.tasks.find((t) => t.name.toLowerCase() === (name ?? "").toLowerCase());
      if (!task) return "Tarefa não encontrada.";
      const raw = p["minutesBefore"];
      const minutes = typeof raw === "number" ? raw : null;
      s.updateTask(task.id, { alarmMinutesBefore: minutes });
      return minutes === null
        ? `Lembrete desativado para ${task.name}.`
        : `Lembrete de ${task.name} ajustado para ${minutes === 0 ? "o horário exato" : `${minutes} min antes`}.`;
    }
    case "excluir_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      s.removeTask(id);
      return "Tarefa excluída.";
    }
    case "duplicar_tarefa": {
      const id = str(p, "id");
      if (!id || !s.tasks.some((t) => t.id === id)) return "Tarefa não encontrada.";
      const dates = Array.isArray(p["dates"]) ? (p["dates"] as string[]).filter((d) => typeof d === "string") : [];
      if (dates.length) {
        s.duplicateTaskToDates(id, dates);
        return `Tarefa duplicada em ${dates.length} data(s).`;
      }
      s.duplicateTask(id, str(p, "date"));
      return "Tarefa duplicada.";
    }
    case "mover_tarefa": {
      const id = str(p, "id");
      const date = str(p, "date");
      if (!id || !date) return "Dados insuficientes para mover.";
      s.moveTask(id, date, str(p, "time"));
      return `Tarefa movida para ${date}.`;
    }
    case "concluir_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      const performed = str(p, "hora_realizada") ?? str(p, "performed_time");
      const session = s.completeTaskForDate(id, str(p, "date") ?? dateKey(), performed);
      return performed
        ? `Tarefa concluída (realizada às ${performed}; registro tardio não penaliza).`
        : session
          ? "Tarefa concluída."
          : "Tarefa concluída.";
    }

    case "reabrir_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      s.reopenTaskForDate(id, str(p, "date") ?? dateKey());
      return "Tarefa reaberta.";
    }
    case "arquivar_tarefa": {
      const id = str(p, "id");
      if (!id) return "Tarefa não encontrada.";
      if (bool(p, "restore")) {
        s.restoreTask(id);
        return "Tarefa restaurada.";
      }
      s.archiveTask(id);
      return "Tarefa arquivada.";
    }

    // ---------- Finanças ----------
    case "registrar_transacao": {
      const amount = num(p, "amount");
      if (!amount) return "Valor inválido.";
      const extra = [str(p, "paymentMethod"), str(p, "notes")].filter(Boolean).join(" · ");
      const desc = [str(p, "description"), extra].filter(Boolean).join(" — ");
      const tx = s.addTransaction({
        kind: ((str(p, "kind") as TransactionKind) ?? "despesa"),
        amount,
        category: str(p, "category") ?? "outros",
        description: desc || undefined,
        date: str(p, "date") ?? dateKey(),
      });
      return `${tx.kind === "receita" ? "Receita" : "Despesa"} registrada.`;
    }
    case "atualizar_transacao": {
      const id = str(p, "id");
      if (!id) return "Lançamento não encontrado.";
      s.updateTransaction(id, (p["patch"] ?? {}) as Record<string, never>);
      return "Lançamento atualizado.";
    }
    case "excluir_transacao": {
      const id = str(p, "id");
      if (!id) return "Lançamento não encontrado.";
      s.removeTransaction(id);
      return "Lançamento excluído.";
    }

    // ---------- Metas de vida ----------
    case "criar_meta": {
      const name = str(p, "name");
      if (!name) return "Meta sem nome.";
      s.addLifeGoal({
        name,
        description: str(p, "description"),
        category: "outro",
        priority: "media",
        targetDate: str(p, "deadline"),
      });
      return `Meta criada: ${name}`;
    }
    case "atualizar_meta": {
      const id = str(p, "id");
      if (!id || !s.lifeGoals.some((g) => g.id === id)) return "Meta não encontrada.";
      const patch = { ...((p["patch"] ?? {}) as Record<string, unknown>) };
      if (typeof patch["status"] === "string") patch["status"] = patch["status"] as LifeGoalStatus;
      s.updateLifeGoal(id, patch as never);
      return "Meta atualizada.";
    }
    case "excluir_meta": {
      const id = str(p, "id");
      if (!id) return "Meta não encontrada.";
      s.removeLifeGoal(id);
      return "Meta excluída.";
    }
    case "criar_objetivo": {
      const goalId = str(p, "goalId");
      const name = str(p, "name");
      if (!goalId || !name) return "Dados insuficientes.";
      s.addObjective(goalId, name);
      return "Objetivo adicionado.";
    }
    case "concluir_objetivo": {
      const goalId = str(p, "goalId");
      const objectiveId = str(p, "objectiveId");
      if (!goalId || !objectiveId) return "Objetivo não encontrado.";
      s.toggleObjective(goalId, objectiveId);
      return "Objetivo atualizado.";
    }

    // ---------- Leitura ----------
    case "criar_livro": {
      const title = str(p, "title");
      if (!title) return "Livro sem título.";
      const book = s.addBook({
        title,
        author: str(p, "author") ?? "",
        category: str(p, "category") ?? "outros",
        totalPages: num(p, "totalPages") ?? 0,
        currentPage: num(p, "currentPage") ?? 0,
        status: (str(p, "status") as BookStatus) ?? "quero-ler",
        startDate: str(p, "startDate"),
        endDate: str(p, "endDate"),
        comments: str(p, "comments"),
        quotes: str(p, "quotes"),
        tags: [],
      });
      return `Livro adicionado: ${book.title}`;
    }
    case "atualizar_livro": {
      const book = findBook(p);
      if (!book) return "Livro não encontrado.";
      s.updateBook(book.id, (p["patch"] ?? {}) as Partial<Book>);
      return `Livro atualizado: ${book.title}`;
    }
    case "excluir_livro": {
      const book = findBook(p);
      if (!book) return "Livro não encontrado.";
      s.removeBook(book.id);
      return `Livro excluído: ${book.title}`;
    }
    case "progresso_leitura": {
      const book = findBook(p);
      const page = num(p, "page");
      if (!book) return "Livro não encontrado.";
      if (page === undefined) return "Página inválida.";
      s.logReadingProgress(book.id, page);
      return `${book.title}: página ${page}.`;
    }
    case "status_livro": {
      const book = findBook(p);
      const status = str(p, "status") as BookStatus | undefined;
      if (!book || !status) return "Livro não encontrado.";
      s.updateBook(book.id, {
        status,
        ...(status === "concluido"
          ? { currentPage: book.totalPages || book.currentPage, endDate: dateKey() }
          : { endDate: undefined }),
      });
      return `${book.title}: ${status}.`;
    }
    case "sessao_leitura": {
      const book = findBook(p);
      const minutes = num(p, "minutes") ?? 0;
      if (!book || minutes <= 0) return "Sessão inválida.";
      const end = Date.now();
      s.addReadingSession({
        bookId: book.id,
        date: str(p, "date") ?? dateKey(),
        startedAt: end - minutes * 60000,
        endedAt: end,
        minutes,
        pagesRead: num(p, "pagesRead"),
      });
      return `Sessão de ${minutes} min registrada em ${book.title}.`;
    }

    case "anotacao_leitura": {
      const book = findBook(p);
      const text = str(p, "text");
      if (!book || !text) return "Anotação inválida.";
      s.addReadingNote({ bookId: book.id, text, date: str(p, "date") ?? dateKey() });
      return `Anotação salva em ${book.title}.`;
    }
    case "arquivar_livro": {
      const book = findBook(p);
      if (!book) return "Livro não encontrado.";
      s.archiveBook(book.id, book.archived);
      return `${book.title}: ${book.archived ? "restaurado" : "arquivado"}.`;
    }
    case "reiniciar_livro": {
      const book = findBook(p);
      if (!book) return "Livro não encontrado.";
      s.restartBook(book.id);
      return `Leitura de ${book.title} reiniciada.`;
    }

    // ---------- Hábitos / desafios ----------
    case "criar_habito": {
      const name = str(p, "name");
      if (!name) return "Hábito sem nome.";
      s.addChallenge({
        name,
        kind: (str(p, "kind") as never) ?? ("diario" as never),
        target: num(p, "target"),
        deadline: str(p, "deadline"),
      });
      return `Hábito criado: ${name}`;
    }
    case "concluir_habito": {
      const id = str(p, "id");
      if (!id) return "Hábito não encontrado.";
      s.toggleChallenge(id);
      return "Hábito atualizado.";
    }
    case "excluir_habito": {
      const id = str(p, "id");
      if (!id) return "Hábito não encontrado.";
      s.removeChallenge(id);
      return "Hábito excluído.";
    }

    // ---------- Lista de compras ----------
    case "criar_lista_compras": {
      const name = str(p, "name") ?? "Compras";
      const list = s.addShoppingList({
        name,
        date: str(p, "date") ?? dateKey(),
        financeCategory: str(p, "financeCategory") ?? "mercado",
      });
      const items = Array.isArray(p["items"]) ? (p["items"] as unknown[]) : [];
      let added = 0;
      for (const raw of items) {
        const it = typeof raw === "string" ? { name: raw } : (raw as Record<string, unknown>);
        const itemName = str(it, "name");
        if (!itemName) continue;
        s.addShoppingItem(list.id, {
          name: itemName,
          quantity: num(it, "quantity") ?? 1,
          unit: str(it, "unit") ?? "un",
          estimatedPrice: num(it, "estimatedPrice"),
          category: str(it, "category") ?? guessCategory(itemName),
          notes: str(it, "notes"),
        });
        added += 1;
      }
      return `Lista "${list.name}" criada com ${added} item(ns).`;
    }
    case "adicionar_item_compras": {
      const list = findList(p);
      if (!list) return "Lista de compras não encontrada.";
      const raws = Array.isArray(p["items"]) ? (p["items"] as unknown[]) : [p];
      let added = 0;
      for (const raw of raws) {
        const it = typeof raw === "string" ? { name: raw } : (raw as Record<string, unknown>);
        const itemName = str(it, "name");
        if (!itemName) continue;
        s.addShoppingItem(list.id, {
          name: itemName,
          quantity: num(it, "quantity") ?? 1,
          unit: str(it, "unit") ?? "un",
          estimatedPrice: num(it, "estimatedPrice"),
          category: str(it, "category") ?? guessCategory(itemName),
          notes: str(it, "notes"),
        });
        added += 1;
      }
      return added ? `${added} item(ns) adicionado(s) em ${list.name}.` : "Nenhum item válido.";
    }
    case "atualizar_item_compras": {
      const list = findList(p);
      const item = list ? findItem(list, p) : undefined;
      if (!list || !item) return "Item não encontrado.";
      const patch = { ...((p["patch"] ?? p) as Record<string, unknown>) };
      const clean: Record<string, unknown> = {};
      for (const k of ["name", "quantity", "unit", "estimatedPrice", "paidPrice", "category", "notes"]) {
        if (patch[k] !== undefined) clean[k] = patch[k];
      }
      s.updateShoppingItem(list.id, item.id, clean as never);
      return `Item atualizado: ${item.name}.`;
    }
    case "remover_item_compras": {
      const list = findList(p);
      const item = list ? findItem(list, p) : undefined;
      if (!list || !item) return "Item não encontrado.";
      s.removeShoppingItem(list.id, item.id);
      return `${item.name} removido de ${list.name}.`;
    }
    case "marcar_item_comprado": {
      const list = findList(p);
      const item = list ? findItem(list, p) : undefined;
      if (!list || !item) return "Item não encontrado.";
      const purchased = bool(p, "purchased") ?? true;
      const price = num(p, "paidPrice") ?? num(p, "price");
      s.setShoppingItemPurchased(list.id, item.id, purchased, price);
      if (!purchased) return `${item.name} desmarcado.`;
      return price
        ? `${item.name} comprado por R$ ${price.toFixed(2).replace(".", ",")} e lançado no financeiro.`
        : `${item.name} marcado como comprado.`;
    }
    case "duplicar_lista_compras": {
      const list = findList(p);
      if (!list) return "Lista não encontrada.";
      const copy = s.duplicateShoppingList(list.id, str(p, "name"), str(p, "date"));
      return copy ? `Lista repetida: ${copy.name}.` : "Não foi possível repetir.";
    }
    case "finalizar_lista_compras": {
      const list = findList(p);
      if (!list) return "Lista não encontrada.";
      s.updateShoppingList(list.id, { done: bool(p, "reabrir") ? false : true });
      return bool(p, "reabrir") ? `${list.name} reaberta.` : `${list.name} finalizada.`;
    }
    case "excluir_lista_compras": {
      const list = findList(p);
      if (!list) return "Lista não encontrada.";
      s.removeShoppingList(list.id);
      return `Lista ${list.name} excluída.`;
    }

    // ---------- Configurações ----------
    case "definir_minimo_diario": {
      const n = num(p, "value");
      if (!n) return "Valor inválido.";
      s.setDailyMinimum(n);
      return `Mínimo diário definido em ${n}.`;
    }
    default:
      return "Ação desconhecida.";
  }
}

/** Compact snapshot of app state sent to the assistant as context. */
export function buildAssistantContext(): string {
  const s = useStore.getState();
  const today = dateKey();
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = today.slice(0, 4);

  // Monthly aggregation over ALL transactions so the AI can answer any period question.
  const byMonth = new Map<string, { receitas: number; despesas: number }>();
  const byCategory = new Map<string, number>();
  for (const t of s.transactions) {
    const m = t.date.slice(0, 7);
    const agg = byMonth.get(m) ?? { receitas: 0, despesas: 0 };
    if (t.kind === "receita") agg.receitas += t.amount;
    else agg.despesas += t.amount;
    byMonth.set(m, agg);
    if (t.kind === "despesa") byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const months = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 24)
    .map(([mes, v]) => ({ mes, ...v, saldo: v.receitas - v.despesas }));

  const monthTx = s.transactions.filter((t) => t.date.startsWith(monthPrefix));
  const yearTx = s.transactions.filter((t) => t.date.startsWith(yearPrefix));
  const sum = (list: typeof s.transactions, kind: TransactionKind) =>
    list.filter((t) => t.kind === kind).reduce((a, b) => a + b.amount, 0);

  const readingMinutes = s.readingSessions.reduce((a, b) => a + b.minutes, 0);

  return JSON.stringify({
    hoje: today,
    usuario: s.userName || null,
    disciplina: s.discipline,
    xp: s.xp,
    streak: s.streak,
    maior_streak: s.longestStreak,
    minimo_diario: s.dailyMinimum,
    conquistas: s.achievements.map((a) => a.id),
    tarefas: s.tasks.map((t) => ({
      id: t.id,
      nome: t.name,
      hora: t.time,
      data: t.scheduledDate,
      repeticao: t.repetition,
      dias_semana: t.weekdays ?? null,
      categoria: t.category,
      prioridade: t.priority,
      dificuldade: t.difficulty,
      status: t.status ?? null,
      arquivada: !!t.archived,
      concluida_em: t.lastCompletedDate ?? null,
    })),
    concluidas_recentes: s.sessions.slice(-30).map((x) => ({ tarefa: x.taskName, data: x.scheduledDate ?? null })),
    habitos: s.challenges.map((c) => ({ id: c.id, nome: c.name, tipo: c.kind, feito: !!c.done, prazo: c.deadline ?? null })),
    metas: s.lifeGoals.map((g) => ({
      id: g.id,
      nome: g.name,
      prazo: g.targetDate ?? null,
      status: g.status,
      objetivos: g.objectives.map((o) => ({ id: o.id, nome: o.name, feito: !!o.done })),
    })),
    leitura: {
      minutos_totais: readingMinutes,
      metas: s.readingGoals.map((g) => ({ id: g.id, tipo: g.kind, alvo: g.target })),
      livros: s.books.map((b) => ({
        id: b.id,
        titulo: b.title,
        autor: b.author,
        categoria: b.category,
        paginas: b.totalPages,
        pagina_atual: b.currentPage,
        status: b.status,
        inicio: b.startDate ?? null,
        fim: b.endDate ?? null,
        nota: b.rating ?? null,
      })),
      sessoes_recentes: s.readingSessions.slice(-20).map((x) => ({ livroId: x.bookId, data: x.date, minutos: x.minutes })),
    },
    financas: {
      mes_atual: {
        mes: monthPrefix,
        receitas: sum(monthTx, "receita"),
        despesas: sum(monthTx, "despesa"),
        saldo: sum(monthTx, "receita") - sum(monthTx, "despesa"),
      },
      ano_atual: {
        ano: yearPrefix,
        receitas: sum(yearTx, "receita"),
        despesas: sum(yearTx, "despesa"),
      },
      por_mes: months,
      despesas_por_categoria: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([categoria, total]) => ({ categoria, total })),
      total_lancamentos: s.transactions.length,
      lancamentos: s.transactions
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 150)
        .map((t) => ({
          id: t.id,
          tipo: t.kind,
          valor: t.amount,
          categoria: t.category,
          descricao: t.description ?? null,
          data: t.date,
        })),
    },
    compras: {
      lista_ativa_id: s.activeShoppingListId,
      listas: s.shoppingLists.slice(0, 20).map((l) => {
        const t = listTotals(l);
        return {
          id: l.id,
          nome: l.name,
          data: l.date,
          finalizada: !!l.done,
          categoria_financeira: l.financeCategory,
          total_estimado: t.estimated,
          total_comprado: t.paid,
          itens_comprados: `${t.done}/${t.total}`,
          itens: l.items.map((i) => ({
            id: i.id,
            nome: i.name,
            quantidade: i.quantity,
            unidade: i.unit,
            categoria: i.category,
            preco_estimado: i.estimatedPrice ?? null,
            preco_pago: i.paidPrice ?? null,
            comprado: i.purchased,
            data_compra: i.purchasedAt ?? null,
            lancamento_id: i.transactionId ?? null,
          })),
        };
      }),
    },
  });
}
