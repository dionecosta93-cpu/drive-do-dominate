import { create } from "zustand";
import { persist } from "zustand/middleware";
import { evaluateAchievements, type AchievementStats } from "@/lib/achievements";
import {
  clampDiscipline,
  disciplinePenalty,
  disciplinePoints,
  EMPTY_DAY_PENALTY,
} from "@/lib/discipline";

export type Priority = "baixa" | "media" | "alta";
export type Category =
  "treino" | "trabalho" | "estudo" | "vida" | "negocios" | "saude" | "familia" | "espiritual";
export type Repetition =
  | "nenhuma"
  | "diaria"
  | "semanal"
  | "dias-uteis"
  | "fim-de-semana"
  | "dias-especificos"
  | "quinzenal"
  | "mensal"
  | "anual"
  | "personalizada";
export type TaskStatus = "nao-iniciada" | "em-andamento" | "concluida" | "adiada" | "cancelada";

export type AlarmSound = "padrao" | "suave" | "classico" | "forja";

export interface Task {
  id: string;
  name: string;
  description?: string;
  category: Category;
  priority: Priority;
  time: string; // HH:MM
  endTime?: string;
  estimatedMinutes: number;
  maxMinutes: number;
  actualMinutes?: number;
  repetition: Repetition;
  customDates?: string[];
  difficulty: number; // 1-10
  reward: string;
  consequence: string;
  status?: TaskStatus;
  color?: string;
  icon?: string;
  notes?: string;
  motivation?: string;
  alarmMinutesBefore?: number | null;
  /** Som do lembrete (canal nativo Android) — "padrao" usa o som padrão de notificação. */
  alarmSound?: AlarmSound;
  /** "despertador" = tela cheia, toca em loop até desligar (mesmo bloqueado). */
  alarmMode?: "notificacao" | "despertador";
  archived?: boolean;
  editCount?: number;
  createdAt: number;
  scheduledDate: string;
  startDate?: string;
  endDate?: string;
  weekdays?: number[]; // 0=Sun..6=Sat, for dias-especificos
  lastCompletedDate?: string;
  rolloverCount?: number;
  goalId?: string;
  objectiveId?: string;
  /** Lista de compras vinculada (tarefa "fazer compras"). */
  shoppingListId?: string;
}

const parseDate = (s: string) => new Date(s + "T00:00:00");

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const timeKey = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const minutesOfDay = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

const completionDateForSession = (s: CompletedSession) =>
  s.scheduledDate ?? dateKey(new Date(s.completedAt));

export const taskCompletedOn = (taskId: string, sessions: CompletedSession[], date: string) =>
  sessions.some((s) => s.taskId === taskId && completionDateForSession(s) === date);

/** Whether a task appears on a given YYYY-MM-DD. Ignores archived/cancelled. */
export const taskAppearsOn = (t: Task, date: string): boolean => {
  if (t.archived) return false;
  if (t.status === "cancelada") return false;
  // Respect optional start/end period (inclusive)
  if (t.startDate && date < t.startDate) return false;
  if (t.endDate && date > t.endDate) return false;
  const d = parseDate(date);
  const dow = d.getDay();
  const created = new Date(t.createdAt);
  const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
  const start = t.scheduledDate < createdKey ? t.scheduledDate : createdKey;
  if (date < start && t.repetition !== "nenhuma") return false;

  switch (t.repetition) {
    case "nenhuma":
      return t.scheduledDate === date;
    case "diaria":
      return true;
    case "dias-uteis":
      return dow >= 1 && dow <= 5;
    case "fim-de-semana":
      return dow === 0 || dow === 6;
    case "dias-especificos":
      return (t.weekdays ?? []).includes(dow);
    case "semanal":
      return created.getDay() === dow;
    case "quinzenal": {
      const diff = Math.floor((d.getTime() - parseDate(start).getTime()) / 86400000);
      return diff >= 0 && diff % 14 === 0;
    }
    case "mensal":
      return d.getDate() === parseDate(t.scheduledDate).getDate();
    case "anual": {
      const s = parseDate(t.scheduledDate);
      return d.getDate() === s.getDate() && d.getMonth() === s.getMonth();
    }
    case "personalizada":
      return (t.customDates ?? []).includes(date);
    default:
      return false;
  }
};

export const todaysTasks = (tasks: Task[], today: string): Task[] =>
  tasks.filter((t) => taskAppearsOn(t, today));

export interface CompletedSession {
  id: string;
  taskId: string;
  taskName: string;
  category: Category;
  difficulty: number;
  estimatedMinutes: number;
  spentSeconds: number;
  pauses: number;
  xp: number;
  completedAt: number;
  hourOfDay: number;
  scheduledDate?: string;
  /** 🕐 Horário planejado */
  scheduledTime?: string;
  /** ✅ Horário em que a tarefa foi realmente realizada */
  completedTime?: string;
  /** 📱 Horário em que o usuário registrou no app */
  registeredTime?: string;
  /** Momento (epoch) do registro no app */
  registeredAt?: number;
  timingDeltaMinutes?: number;
  status?: "concluida";

  reflection?: string;
  feeling?: string;
}

export interface Achievement {
  id: string;
  unlockedAt: number;
}

export interface WeeklyGoal {
  weekStart: number;
  goal: string;
  targetSessions: number;
}

export type LifeGoalStatus = "em-andamento" | "concluida" | "pausada";
export type LifeGoalCategory =
  | "negocios"
  | "financeiro"
  | "familia"
  | "relacionamento"
  | "saude"
  | "atleta"
  | "espiritual"
  | "estudo"
  | "carreira"
  | "outro";

export interface GoalObjective {
  id: string;
  name: string;
  done?: boolean;
}

export interface LifeGoal {
  id: string;
  name: string;
  description?: string;
  category: LifeGoalCategory;
  priority: Priority;
  targetDate?: string;
  motivation?: string;
  status: LifeGoalStatus;
  manualProgress?: number; // 0-100 override
  objectives: GoalObjective[];
  createdAt: number;
}

// ============================================================
// Leitura — tipos
// ============================================================
export type BookStatus = "quero-ler" | "lendo" | "pausado" | "concluido";

export interface ReadingLog {
  id: string;
  date: string; // YYYY-MM-DD
  page: number;
  chapter?: number;
  at: number;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  endedAt: number;
  minutes: number;
  pagesRead?: number;
}

/** Diário de leitura — anotações/aprendizados por livro. */
export interface ReadingNote {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  text: string;
  at: number;
}

export type ReadingGoalKind =
  | "livros-ano"
  | "paginas-dia"
  | "minutos-dia"
  | "horas-semana"
  | "paginas-semana"
  | "paginas-mes"
  | "paginas-ano";

export interface ReadingGoal {
  id: string;
  kind: ReadingGoalKind;
  target: number;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  category: string;
  genre?: string;
  publisher?: string;
  publishedYear?: number;
  language?: string;
  isbn?: string;
  synopsis?: string;
  averageRating?: number; // nota média da obra (0-5)
  estimatedMinutes?: number; // tempo médio estimado de leitura
  cover?: string;
  totalPages: number;
  currentPage: number;
  totalChapters?: number;
  currentChapter?: number;
  dailyPageGoal?: number;
  dailyMinutesGoal?: number;
  targetDate?: string; // meta de conclusão
  startDate?: string;
  endDate?: string;
  status: BookStatus;
  archived?: boolean;
  rating?: number; // 1-5
  favorite?: boolean;
  comments?: string;
  summary?: string;
  learnings?: string;
  ideas?: string;
  quotes?: string;
  application?: string;
  tags: string[];
  logs: ReadingLog[];
  createdAt: number;
  updatedAt: number;
}

export interface DisciplineEntry {
  id: string;
  date: string;
  delta: number;
  reason: string;
  at: number;
}

export type ChallengeKind = "diario" | "semanal" | "mensal" | "anual" | "pessoal";

export interface Challenge {
  id: string;
  name: string;
  kind: ChallengeKind;
  target?: number;
  deadline?: string;
  done?: boolean;
  createdAt: number;
}
export type TransactionKind = "receita" | "despesa";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  description?: string;
  paymentMethod?: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
}

// ---------- Lista de compras ----------
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  paidPrice?: number;
  category: string;
  notes?: string;
  purchased: boolean;
  purchasedAt?: string; // YYYY-MM-DD
  /** Lançamento financeiro gerado (evita duplicidade). */
  transactionId?: string;
  createdAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  items: ShoppingItem[];
  /** Categoria financeira padrão usada ao registrar gastos. */
  financeCategory: string;
  notes?: string;
  done?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AppTheme = "escuro" | "claro" | "divertido";

interface State {
  userName: string;
  theme: AppTheme;
  tasks: Task[];
  completedToday: string[];
  sessions: CompletedSession[];
  xp: number;
  streak: number;
  lastActiveDay: string | null;
  longestStreak: number;
  achievements: Achievement[];
  weeklyGoal: WeeklyGoal | null;
  dailyMissionCompleted: string | null;
  onboarded: boolean;
  lifeGoals: LifeGoal[];
  books: Book[];
  readingSessions: ReadingSession[];
  readingGoals: ReadingGoal[];
  readingNotes: ReadingNote[];

  // Disciplina / gamificação
  discipline: number;
  disciplineLog: DisciplineEntry[];
  dailyMinimum: number;
  lastPenaltyDate: string | null;
  claimedMissions: string[];
  /** Chaves "taskId|YYYY-MM-DD" de alertas de tarefa não concluída dispensados. */
  dismissedMissed: string[];
  dismissMissed: (taskId: string, date: string) => void;
  challenges: Challenge[];
  recentUnlocks: string[];

  // Finanças + Assistente IA
  transactions: Transaction[];
  assistantMessages: ChatMessage[];
  addTransaction: (t: Omit<Transaction, "id" | "createdAt"> & { date?: string }) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  addChatMessage: (m: Omit<ChatMessage, "id" | "at">) => ChatMessage;
  clearChat: () => void;

  // Lista de compras
  shoppingLists: ShoppingList[];
  activeShoppingListId: string | null;
  addShoppingList: (l: {
    name: string;
    date?: string;
    financeCategory?: string;
    notes?: string;
  }) => ShoppingList;
  updateShoppingList: (id: string, patch: Partial<Omit<ShoppingList, "id" | "items">>) => void;
  removeShoppingList: (id: string) => void;
  duplicateShoppingList: (id: string, name?: string, date?: string) => ShoppingList | null;
  setActiveShoppingList: (id: string | null) => void;
  addShoppingItem: (
    listId: string,
    item: {
      name: string;
      quantity?: number;
      unit?: string;
      estimatedPrice?: number;
      category?: string;
      notes?: string;
    },
  ) => ShoppingItem | null;
  updateShoppingItem: (
    listId: string,
    itemId: string,
    patch: Partial<Omit<ShoppingItem, "id">>,
  ) => void;
  removeShoppingItem: (listId: string, itemId: string) => void;
  /** Marca/desmarca comprado. Com preço pago, lança automaticamente no financeiro (sem duplicar). */
  setShoppingItemPurchased: (
    listId: string,
    itemId: string,
    purchased: boolean,
    paidPrice?: number,
  ) => void;

  addDiscipline: (delta: number, reason: string) => void;
  setDailyMinimum: (n: number) => void;
  claimMission: (id: string) => void;
  addChallenge: (c: Omit<Challenge, "id" | "createdAt" | "done">) => void;
  toggleChallenge: (id: string) => void;
  removeChallenge: (id: string) => void;
  clearRecentUnlocks: () => void;
  syncAchievements: () => string[];

  addBook: (b: Partial<Book> & { title: string }) => Book;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;
  toggleBookFavorite: (id: string) => void;
  logReadingProgress: (id: string, page: number) => void;
  addReadingSession: (s: Omit<ReadingSession, "id">) => void;
  removeReadingSession: (id: string) => void;
  updateReadingSession: (id: string, patch: Partial<ReadingSession>) => void;
  updateReadingLog: (
    bookId: string,
    logId: string,
    patch: { page?: number; chapter?: number; date?: string },
  ) => void;
  removeReadingLog: (bookId: string, logId: string) => void;
  addReadingGoal: (g: Omit<ReadingGoal, "id" | "createdAt">) => void;
  removeReadingGoal: (id: string) => void;
  updateReadingGoal: (id: string, patch: Partial<ReadingGoal>) => void;
  addReadingNote: (n: Omit<ReadingNote, "id" | "at"> & { date?: string }) => ReadingNote;
  updateReadingNote: (id: string, text: string) => void;
  removeReadingNote: (id: string) => void;
  setBookStatus: (id: string, status: BookStatus) => void;
  archiveBook: (id: string, restore?: boolean) => void;
  restartBook: (id: string) => void;
  updateReadingProgress: (
    id: string,
    v: {
      page?: number;
      chapter?: number;
      pagesReadToday?: number;
      minutes?: number;
      date?: string;
    },
  ) => void;

  addLifeGoal: (
    g: Omit<LifeGoal, "id" | "createdAt" | "objectives" | "status"> & {
      status?: LifeGoalStatus;
      objectives?: GoalObjective[];
    },
  ) => LifeGoal;

  updateLifeGoal: (id: string, patch: Partial<LifeGoal>) => void;
  removeLifeGoal: (id: string) => void;
  addObjective: (goalId: string, name: string) => void;
  toggleObjective: (goalId: string, objectiveId: string) => void;
  removeObjective: (goalId: string, objectiveId: string) => void;

  setUserName: (n: string) => void;
  setTheme: (theme: AppTheme) => void;
  setOnboarded: (b: boolean) => void;
  addTask: (
    t: Omit<Task, "id" | "createdAt" | "scheduledDate"> & { scheduledDate?: string },
  ) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  duplicateTask: (id: string, newDate?: string) => void;
  duplicateTaskToDates: (id: string, dates: string[]) => void;
  moveTask: (id: string, newDate: string, newTime?: string) => void;
  archiveTask: (id: string) => void;
  restoreTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  reopenTask: (id: string) => void;
  reopenTaskForDate: (id: string, date: string) => void;
  completeSession: (
    s: Omit<CompletedSession, "id" | "completedAt" | "hourOfDay" | "xp">,
  ) => CompletedSession;
  completeTaskForDate: (
    id: string,
    date: string,
    performedTime?: string,
  ) => CompletedSession | null;
  setSessionPerformedTime: (sessionId: string, performedTime: string) => void;
  addReflection: (sessionId: string, feeling: string, reflection: string) => void;
  markDailyMission: () => void;

  setWeeklyGoal: (g: WeeklyGoal) => void;
  tickDay: () => void;
  reset: () => void;
}

const todayKey = () => dateKey();

const calcXp = (difficulty: number, estimatedMinutes: number, spentSeconds: number) => {
  const base = difficulty * 20;
  const timeBonus = Math.min(estimatedMinutes, 120) * 1.5;
  const efficiencyMult =
    estimatedMinutes > 0
      ? Math.max(0.7, Math.min(1.5, (estimatedMinutes * 60) / Math.max(spentSeconds, 1)))
      : 1;
  return Math.round((base + timeBonus) * efficiencyMult);
};

const levelFromXp = (xp: number) => {
  let level = 1;
  let need = 100;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level += 1;
    need = level * 200;
  }
  return { level, current: xp - acc, needed: need };
};

export const xpToLevel = levelFromXp;

const genId = () => Math.random().toString(36).slice(2, 10);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      userName: "",
      theme: "escuro",
      tasks: [],
      completedToday: [],
      sessions: [],
      xp: 0,
      streak: 0,
      lastActiveDay: null,
      longestStreak: 0,
      achievements: [],
      weeklyGoal: null,
      dailyMissionCompleted: null,
      onboarded: false,
      lifeGoals: [],
      books: [],
      readingSessions: [],
      readingGoals: [],
      readingNotes: [],

      discipline: 0,
      disciplineLog: [],
      dailyMinimum: 1,
      lastPenaltyDate: null,
      claimedMissions: [],
      dismissedMissed: [],
      dismissMissed: (taskId, date) =>
        set((st) => {
          const key = `${taskId}|${date}`;
          if (st.dismissedMissed.includes(key)) return st;
          const task = st.tasks.find((t) => t.id === taskId);
          const penalty = task ? disciplinePenalty(task.difficulty ?? 5) : 5;
          return {
            dismissedMissed: [...st.dismissedMissed, key].slice(-300),
            discipline: clampDiscipline(st.discipline - penalty),
            disciplineLog: [
              ...st.disciplineLog.slice(-400),
              {
                id: genId(),
                date,
                delta: -penalty,
                reason: `Tarefa dispensada: ${task?.name ?? "tarefa"}`,
                at: Date.now(),
              },
            ],
          };
        }),

      challenges: [],
      recentUnlocks: [],

      transactions: [],
      assistantMessages: [],

      addTransaction: (t) => {
        const tx: Transaction = {
          id: genId(),
          kind: t.kind,
          amount: Math.abs(Number(t.amount) || 0),
          category: t.category || "outros",
          description: t.description,
          date: t.date || todayKey(),
          createdAt: Date.now(),
        };
        set((s) => ({ transactions: [tx, ...s.transactions] }));
        return tx;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addChatMessage: (m) => {
        const msg: ChatMessage = { id: genId(), role: m.role, content: m.content, at: Date.now() };
        set((s) => ({ assistantMessages: [...s.assistantMessages.slice(-120), msg] }));
        return msg;
      },
      clearChat: () => set({ assistantMessages: [] }),

      // ---------- Lista de compras ----------
      shoppingLists: [],
      activeShoppingListId: null,

      addShoppingList: (l) => {
        const now = Date.now();
        const list: ShoppingList = {
          id: genId(),
          name: l.name.trim() || "Nova lista",
          date: l.date || todayKey(),
          items: [],
          financeCategory: l.financeCategory || "mercado",
          notes: l.notes,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ shoppingLists: [list, ...s.shoppingLists], activeShoppingListId: list.id }));
        return list;
      },

      updateShoppingList: (id, patch) =>
        set((s) => ({
          shoppingLists: s.shoppingLists.map((l) =>
            l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l,
          ),
        })),

      removeShoppingList: (id) =>
        set((s) => ({
          shoppingLists: s.shoppingLists.filter((l) => l.id !== id),
          activeShoppingListId: s.activeShoppingListId === id ? null : s.activeShoppingListId,
        })),

      duplicateShoppingList: (id, name, date) => {
        const src = get().shoppingLists.find((l) => l.id === id);
        if (!src) return null;
        const now = Date.now();
        const copy: ShoppingList = {
          ...src,
          id: genId(),
          name: name || `${src.name} (cópia)`,
          date: date || todayKey(),
          done: false,
          createdAt: now,
          updatedAt: now,
          items: src.items.map((i) => ({
            ...i,
            id: genId(),
            purchased: false,
            purchasedAt: undefined,
            paidPrice: undefined,
            transactionId: undefined,
            createdAt: now,
          })),
        };
        set((s) => ({ shoppingLists: [copy, ...s.shoppingLists], activeShoppingListId: copy.id }));
        return copy;
      },

      setActiveShoppingList: (id) => set({ activeShoppingListId: id }),

      addShoppingItem: (listId, item) => {
        const list = get().shoppingLists.find((l) => l.id === listId);
        if (!list) return null;
        const it: ShoppingItem = {
          id: genId(),
          name: item.name.trim(),
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          unit: item.unit?.trim() || "un",
          estimatedPrice: item.estimatedPrice,
          category: item.category || "outros",
          notes: item.notes,
          purchased: false,
          createdAt: Date.now(),
        };
        set((s) => ({
          shoppingLists: s.shoppingLists.map((l) =>
            l.id === listId ? { ...l, items: [...l.items, it], updatedAt: Date.now() } : l,
          ),
        }));
        return it;
      },

      updateShoppingItem: (listId, itemId, patch) =>
        set((s) => ({
          shoppingLists: s.shoppingLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  updatedAt: Date.now(),
                  items: l.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
                }
              : l,
          ),
        })),

      removeShoppingItem: (listId, itemId) => {
        const list = get().shoppingLists.find((l) => l.id === listId);
        const item = list?.items.find((i) => i.id === itemId);
        if (item?.transactionId) get().removeTransaction(item.transactionId);
        set((s) => ({
          shoppingLists: s.shoppingLists.map((l) =>
            l.id === listId
              ? { ...l, items: l.items.filter((i) => i.id !== itemId), updatedAt: Date.now() }
              : l,
          ),
        }));
      },

      setShoppingItemPurchased: (listId, itemId, purchased, paidPrice) => {
        const list = get().shoppingLists.find((l) => l.id === listId);
        const item = list?.items.find((i) => i.id === itemId);
        if (!list || !item) return;

        if (!purchased) {
          // Desfaz: remove o lançamento financeiro gerado por este item.
          if (item.transactionId) get().removeTransaction(item.transactionId);
          get().updateShoppingItem(listId, itemId, {
            purchased: false,
            purchasedAt: undefined,
            transactionId: undefined,
          });
          return;
        }

        const price = paidPrice ?? item.paidPrice ?? item.estimatedPrice;
        const date = item.purchasedAt || todayKey();
        let transactionId = item.transactionId;

        if (price && price > 0) {
          const category =
            item.category && item.category !== "outros" ? item.category : list.financeCategory;
          if (transactionId && get().transactions.some((t) => t.id === transactionId)) {
            // Já lançado: apenas atualiza (nunca duplica).
            get().updateTransaction(transactionId, { amount: price, category, date });
          } else {
            const tx = get().addTransaction({
              kind: "despesa",
              amount: price,
              category,
              description: `${item.name}${item.quantity > 1 ? ` (${item.quantity} ${item.unit})` : ""} — ${list.name}`,
              date,
            });
            transactionId = tx.id;
          }
        }

        get().updateShoppingItem(listId, itemId, {
          purchased: true,
          purchasedAt: date,
          paidPrice: price,
          transactionId,
        });
      },

      addDiscipline: (delta, reason) =>
        set((s) => ({
          discipline: clampDiscipline(s.discipline + delta),
          disciplineLog: [
            ...s.disciplineLog.slice(-400),
            { id: genId(), date: todayKey(), delta, reason, at: Date.now() },
          ],
        })),

      setDailyMinimum: (n) => set({ dailyMinimum: Math.max(1, Math.round(n)) }),

      claimMission: (id) =>
        set((s) =>
          s.claimedMissions.includes(id) ? s : { claimedMissions: [...s.claimedMissions, id] },
        ),

      addChallenge: (c) =>
        set((s) => ({
          challenges: [...s.challenges, { ...c, id: genId(), createdAt: Date.now() }],
        })),

      toggleChallenge: (id) =>
        set((s) => ({
          challenges: s.challenges.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
        })),

      removeChallenge: (id) =>
        set((s) => ({ challenges: s.challenges.filter((c) => c.id !== id) })),

      clearRecentUnlocks: () => set({ recentUnlocks: [] }),

      syncAchievements: () => {
        const s = get();
        const hoursByCategory: Record<string, number> = {};
        let totalHours = 0;
        for (const sess of s.sessions) {
          const h = sess.spentSeconds / 3600;
          totalHours += h;
          hoursByCategory[sess.category] = (hoursByCategory[sess.category] ?? 0) + h;
        }
        const readingHours = s.readingSessions.reduce((a, r) => a + r.minutes, 0) / 60;
        const dates = new Set(
          s.sessions.map((x) => x.scheduledDate ?? dateKey(new Date(x.completedAt))),
        );
        let perfectDays = 0;
        for (const d of dates) {
          const st = dayStats(s.tasks, s.sessions, d);
          if (st.total > 0 && st.pct === 100) perfectDays += 1;
        }
        const stats: AchievementStats = {
          sessions: s.sessions.length,
          streak: s.streak,
          longestStreak: s.longestStreak,
          discipline: s.discipline,
          xp: s.xp,
          level: levelFromXp(s.xp).level,
          totalHours,
          hoursByCategory,
          readingHours,
          noPauseSession: s.sessions.some((x) => x.pauses === 0),
          earlyFinish: s.sessions.some((x) => x.spentSeconds < x.estimatedMinutes * 60),
          perfectDays,
        };
        const newIds = evaluateAchievements(
          stats,
          s.achievements.map((a) => a.id),
        );
        if (newIds.length) {
          set({
            achievements: [
              ...s.achievements,
              ...newIds.map((id) => ({ id, unlockedAt: Date.now() })),
            ],
            recentUnlocks: [...s.recentUnlocks, ...newIds],
          });
        }
        return newIds;
      },

      addBook: (b) => {
        const now = Date.now();
        const book: Book = {
          author: "",
          category: "",
          totalPages: 0,
          currentPage: 0,
          status: "quero-ler",
          tags: [],
          logs: [],
          ...b,
          id: genId(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ books: [...s.books, book] }));
        return book;
      },

      updateBook: (id, patch) =>
        set((s) => ({
          books: s.books.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b)),
        })),

      removeBook: (id) =>
        set((s) => ({
          books: s.books.filter((b) => b.id !== id),
          readingSessions: s.readingSessions.filter((r) => r.bookId !== id),
          readingNotes: s.readingNotes.filter((n) => n.bookId !== id),
        })),

      toggleBookFavorite: (id) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === id ? { ...b, favorite: !b.favorite, updatedAt: Date.now() } : b,
          ),
        })),

      logReadingProgress: (id, page) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== id) return b;
            const p = Math.max(0, b.totalPages ? Math.min(page, b.totalPages) : page);
            const done = b.totalPages > 0 && p >= b.totalPages;
            return {
              ...b,
              currentPage: p,
              status: done ? "concluido" : b.status === "concluido" ? b.status : "lendo",
              endDate: done ? (b.endDate ?? todayKey()) : b.endDate,
              startDate: b.startDate ?? todayKey(),
              logs: [...b.logs, { id: genId(), date: todayKey(), page: p, at: Date.now() }],
              updatedAt: Date.now(),
            };
          }),
        })),

      /** Atualização rápida: página, capítulo, páginas lidas no dia e tempo de leitura. */
      updateReadingProgress: (id, v) =>
        set((s) => {
          const date = v.date ?? todayKey();
          const book = s.books.find((b) => b.id === id);
          if (!book) return {};
          const fromPages =
            v.page !== undefined
              ? v.page
              : v.pagesReadToday !== undefined
                ? book.currentPage + v.pagesReadToday
                : book.currentPage;
          const page = Math.max(
            0,
            book.totalPages ? Math.min(fromPages, book.totalPages) : fromPages,
          );
          const done = book.totalPages > 0 && page >= book.totalPages;
          const changed = page !== book.currentPage || v.chapter !== undefined;
          const updated: Book = {
            ...book,
            currentPage: page,
            currentChapter: v.chapter ?? book.currentChapter,
            startDate: book.startDate ?? date,
            status: done ? "concluido" : book.status === "concluido" ? book.status : "lendo",
            endDate: done ? (book.endDate ?? date) : book.endDate,
            logs: changed
              ? [...book.logs, { id: genId(), date, page, chapter: v.chapter, at: Date.now() }]
              : book.logs,
            updatedAt: Date.now(),
          };
          const minutes = v.minutes ?? 0;
          const end = Date.now();
          return {
            books: s.books.map((b) => (b.id === id ? updated : b)),
            readingSessions:
              minutes > 0
                ? [
                    ...s.readingSessions,
                    {
                      id: genId(),
                      bookId: id,
                      date,
                      startedAt: end - minutes * 60000,
                      endedAt: end,
                      minutes,
                      pagesRead: Math.max(0, page - book.currentPage) || v.pagesReadToday,
                    },
                  ]
                : s.readingSessions,
          };
        }),

      setBookStatus: (id, status) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== id) return b;
            if (status === "concluido") {
              return {
                ...b,
                status,
                currentPage: b.totalPages || b.currentPage,
                endDate: b.endDate ?? todayKey(),
                startDate: b.startDate ?? todayKey(),
                updatedAt: Date.now(),
              };
            }
            return {
              ...b,
              status,
              endDate: undefined,
              startDate: status === "lendo" ? (b.startDate ?? todayKey()) : b.startDate,
              updatedAt: Date.now(),
            };
          }),
        })),

      archiveBook: (id, restore) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === id ? { ...b, archived: !restore, updatedAt: Date.now() } : b,
          ),
        })),

      restartBook: (id) =>
        set((s) => ({
          books: s.books.map((b) =>
            b.id === id
              ? {
                  ...b,
                  currentPage: 0,
                  currentChapter: undefined,
                  status: "lendo",
                  startDate: todayKey(),
                  endDate: undefined,
                  logs: [],
                  updatedAt: Date.now(),
                }
              : b,
          ),
          readingSessions: s.readingSessions.filter((r) => r.bookId !== id),
        })),

      addReadingSession: (s0) =>
        set((s) => ({ readingSessions: [...s.readingSessions, { ...s0, id: genId() }] })),

      removeReadingSession: (id) =>
        set((s) => ({ readingSessions: s.readingSessions.filter((r) => r.id !== id) })),

      updateReadingSession: (id, patch) =>
        set((s) => ({
          readingSessions: s.readingSessions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      /** Corrige um registro do histórico e recalcula a página atual do livro. */
      updateReadingLog: (bookId, logId, patch) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            const logs = b.logs.map((l) =>
              l.id === logId
                ? {
                    ...l,
                    page: patch.page ?? l.page,
                    chapter: patch.chapter ?? l.chapter,
                    date: patch.date ?? l.date,
                  }
                : l,
            );
            const last = [...logs]
              .sort((a, c) => (a.date === c.date ? a.at - c.at : a.date < c.date ? -1 : 1))
              .at(-1);
            return {
              ...b,
              logs,
              currentPage: last ? last.page : b.currentPage,
              currentChapter: last?.chapter ?? b.currentChapter,
              updatedAt: Date.now(),
            };
          }),
        })),

      removeReadingLog: (bookId, logId) =>
        set((s) => ({
          books: s.books.map((b) => {
            if (b.id !== bookId) return b;
            const logs = b.logs.filter((l) => l.id !== logId);
            const last = [...logs]
              .sort((a, c) => (a.date === c.date ? a.at - c.at : a.date < c.date ? -1 : 1))
              .at(-1);
            return { ...b, logs, currentPage: last ? last.page : 0, updatedAt: Date.now() };
          }),
        })),

      addReadingGoal: (g) =>
        set((s) => ({
          readingGoals: [...s.readingGoals, { ...g, id: genId(), createdAt: Date.now() }],
        })),

      removeReadingGoal: (id) =>
        set((s) => ({ readingGoals: s.readingGoals.filter((g) => g.id !== id) })),

      updateReadingGoal: (id, patch) =>
        set((s) => ({
          readingGoals: s.readingGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      addReadingNote: (n) => {
        const note: ReadingNote = {
          id: genId(),
          bookId: n.bookId,
          text: n.text,
          date: n.date ?? todayKey(),
          at: Date.now(),
        };
        set((s) => ({ readingNotes: [...s.readingNotes, note] }));
        return note;
      },

      updateReadingNote: (id, text) =>
        set((s) => ({
          readingNotes: s.readingNotes.map((n) => (n.id === id ? { ...n, text } : n)),
        })),

      removeReadingNote: (id) =>
        set((s) => ({ readingNotes: s.readingNotes.filter((n) => n.id !== id) })),

      addLifeGoal: (g) => {
        const goal: LifeGoal = {
          status: "em-andamento",
          objectives: [],
          ...g,
          id: genId(),
          createdAt: Date.now(),
        };
        set((s) => ({ lifeGoals: [...s.lifeGoals, goal] }));
        return goal;
      },

      updateLifeGoal: (id, patch) =>
        set((s) => ({ lifeGoals: s.lifeGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      removeLifeGoal: (id) =>
        set((s) => ({
          lifeGoals: s.lifeGoals.filter((g) => g.id !== id),
          tasks: s.tasks.map((t) =>
            t.goalId === id ? { ...t, goalId: undefined, objectiveId: undefined } : t,
          ),
        })),

      addObjective: (goalId, name) =>
        set((s) => ({
          lifeGoals: s.lifeGoals.map((g) =>
            g.id === goalId ? { ...g, objectives: [...g.objectives, { id: genId(), name }] } : g,
          ),
        })),

      toggleObjective: (goalId, objectiveId) =>
        set((s) => ({
          lifeGoals: s.lifeGoals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  objectives: g.objectives.map((o) =>
                    o.id === objectiveId ? { ...o, done: !o.done } : o,
                  ),
                }
              : g,
          ),
        })),

      removeObjective: (goalId, objectiveId) =>
        set((s) => ({
          lifeGoals: s.lifeGoals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  objectives: g.objectives.filter((o) => o.id !== objectiveId),
                }
              : g,
          ),
          tasks: s.tasks.map((t) =>
            t.objectiveId === objectiveId ? { ...t, objectiveId: undefined } : t,
          ),
        })),

      setUserName: (userName) => set({ userName }),
      setTheme: (theme) => set({ theme }),
      setOnboarded: (onboarded) => set({ onboarded }),

      addTask: (t) => {
        const task: Task = {
          scheduledDate: todayKey(),
          status: "nao-iniciada",
          editCount: 0,
          ...t,
          id: genId(),
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, editCount: (t.editCount ?? 0) + 1 } : t,
          ),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      duplicateTask: (id, newDate) => {
        const src = get().tasks.find((t) => t.id === id);
        if (!src) return;
        const copy: Task = {
          ...src,
          id: genId(),
          createdAt: Date.now(),
          scheduledDate: newDate ?? src.scheduledDate,
          repetition: "nenhuma",
          customDates: undefined,
          status: "nao-iniciada",
          lastCompletedDate: undefined,
          rolloverCount: 0,
          editCount: 0,
          actualMinutes: 0,
        };
        set((s) => ({ tasks: [...s.tasks, copy] }));
      },

      duplicateTaskToDates: (id, dates) => {
        const src = get().tasks.find((t) => t.id === id);
        if (!src) return;
        const copies: Task[] = dates.map((d) => ({
          ...src,
          id: genId(),
          createdAt: Date.now() + Math.random(),
          scheduledDate: d,
          repetition: "nenhuma",
          customDates: undefined,
          status: "nao-iniciada",
          lastCompletedDate: undefined,
          rolloverCount: 0,
          editCount: 0,
          actualMinutes: 0,
        }));
        set((s) => ({ tasks: [...s.tasks, ...copies] }));
      },

      moveTask: (id, newDate, newTime) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  scheduledDate: newDate,
                  time: newTime ?? t.time,
                  editCount: (t.editCount ?? 0) + 1,
                }
              : t,
          ),
        })),

      archiveTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, archived: true } : t)) })),

      restoreTask: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, archived: false } : t)) })),

      setTaskStatus: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),

      reopenTask: (id) => {
        const today = todayKey();
        get().reopenTaskForDate(id, today);
      },

      reopenTaskForDate: (id, date) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: t.status === "concluida" ? "nao-iniciada" : t.status,
                  lastCompletedDate: t.lastCompletedDate === date ? undefined : t.lastCompletedDate,
                }
              : t,
          ),
          completedToday:
            date === todayKey() ? s.completedToday.filter((tid) => tid !== id) : s.completedToday,
          sessions: s.sessions.filter(
            (sess) => !(sess.taskId === id && completionDateForSession(sess) === date),
          ),
        })),

      completeSession: (partial) => {
        const xp = calcXp(partial.difficulty, partial.estimatedMinutes, partial.spentSeconds);
        const state = get();
        const today = todayKey();
        const task = state.tasks.find((t) => t.id === partial.taskId);
        const completedAt = Date.now();
        const completedTime = timeKey(new Date(completedAt));
        const session: CompletedSession = {
          ...partial,
          id: genId(),
          completedAt,
          hourOfDay: new Date().getHours(),
          xp,
          scheduledDate: today,
          scheduledTime: task?.time,
          completedTime,
          registeredTime: completedTime,
          registeredAt: completedAt,

          timingDeltaMinutes: task
            ? minutesOfDay(completedTime) - minutesOfDay(task.time)
            : undefined,
          status: "concluida",
        };
        let newStreak = state.streak;
        if (state.lastActiveDay !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
          newStreak = state.lastActiveDay === yKey ? state.streak + 1 : 1;
        }
        const newXp = state.xp + xp;
        const newAch = [...state.achievements];
        const unlock = (id: string) => {
          if (!newAch.find((a) => a.id === id)) newAch.push({ id, unlockedAt: Date.now() });
        };
        const totalSessions = state.sessions.length + 1;
        if (totalSessions === 1) unlock("first_task");
        if (totalSessions >= 100) unlock("hundred_tasks");
        if (newStreak >= 7) unlock("first_week");
        if (newStreak >= 30) unlock("thirty_days");
        if (session.pauses === 0) unlock("no_pauses");
        if (session.spentSeconds < session.estimatedMinutes * 60) unlock("finished_early");
        const focusHours =
          (state.sessions.reduce((a, b) => a + b.spentSeconds, 0) + session.spentSeconds) / 3600;
        if (focusHours >= 100) unlock("hundred_hours");

        set({
          sessions: [...state.sessions, session],
          completedToday:
            state.lastActiveDay === today
              ? [...state.completedToday, session.taskId]
              : [session.taskId],
          xp: newXp,
          streak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          lastActiveDay: today,
          achievements: newAch,
          tasks: state.tasks.map((t) =>
            t.id === session.taskId
              ? {
                  ...t,
                  lastCompletedDate: today,
                  // Conclusão é sempre por ocorrência/data, registrada em sessions.
                  status: t.status === "concluida" ? "nao-iniciada" : t.status,
                  actualMinutes: (t.actualMinutes ?? 0) + Math.round(session.spentSeconds / 60),
                }
              : t,
          ),
        });
        get().addDiscipline(disciplinePoints(session.difficulty), `Concluiu "${session.taskName}"`);
        get().syncAchievements();
        return session;
      },

      completeTaskForDate: (id, date, performedTime) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task || taskCompletedOn(id, state.sessions, date)) return null;

        const now = new Date();
        const isToday = date === todayKey();
        // ✅ horário de realização informado pelo usuário (fallback: agora, ou o horário planejado em dias passados)
        const doneTime = performedTime ?? (isToday ? timeKey(now) : task.time);
        const completedAt = new Date(`${date}T${doneTime}:00`).getTime();
        const xp = calcXp(task.difficulty, task.estimatedMinutes, task.estimatedMinutes * 60);
        const session: CompletedSession = {
          id: genId(),
          taskId: task.id,
          taskName: task.name,
          category: task.category,
          difficulty: task.difficulty,
          estimatedMinutes: task.estimatedMinutes,
          spentSeconds: task.estimatedMinutes * 60,
          pauses: 0,
          xp,
          completedAt,
          hourOfDay: Number(doneTime.slice(0, 2)),
          scheduledDate: date,
          scheduledTime: task.time,
          completedTime: doneTime,
          registeredTime: timeKey(now),
          registeredAt: now.getTime(),
          timingDeltaMinutes: minutesOfDay(doneTime) - minutesOfDay(task.time),
          status: "concluida",
        };

        set((s) => ({
          sessions: [...s.sessions, session],
          completedToday:
            isToday && !s.completedToday.includes(id)
              ? [...s.completedToday, id]
              : s.completedToday,
          xp: s.xp + xp,
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  lastCompletedDate: date,
                  status: t.status === "concluida" ? "nao-iniciada" : t.status,
                }
              : t,
          ),
        }));
        get().addDiscipline(disciplinePoints(task.difficulty), `Concluiu "${task.name}"`);
        get().syncAchievements();
        return session;
      },

      setSessionPerformedTime: (sessionId, performedTime) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            const date = sess.scheduledDate ?? dateKey(new Date(sess.completedAt));
            return {
              ...sess,
              completedTime: performedTime,
              completedAt: new Date(`${date}T${performedTime}:00`).getTime(),
              hourOfDay: Number(performedTime.slice(0, 2)),
              timingDeltaMinutes: sess.scheduledTime
                ? minutesOfDay(performedTime) - minutesOfDay(sess.scheduledTime)
                : sess.timingDeltaMinutes,
            };
          }),
        })),

      addReflection: (sessionId, feeling, reflection) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, feeling, reflection } : sess,
          ),
        })),

      markDailyMission: () => set({ dailyMissionCompleted: todayKey() }),

      setWeeklyGoal: (weeklyGoal) => set({ weeklyGoal }),

      tickDay: () => {
        const state = get();
        const today = todayKey();
        const rolledTasks = state.tasks.map((t) => {
          const completedOnScheduledDate =
            t.lastCompletedDate === t.scheduledDate ||
            taskCompletedOn(t.id, state.sessions, t.scheduledDate);
          return t.repetition === "nenhuma" &&
            !t.archived &&
            t.status !== "cancelada" &&
            t.scheduledDate < today &&
            !completedOnScheduledDate
            ? {
                ...t,
                scheduledDate: today,
                rolloverCount: (t.rolloverCount ?? 0) + 1,
                status: "adiada" as TaskStatus,
              }
            : t;
        });
        if (state.lastActiveDay && state.lastActiveDay !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
          if (state.lastActiveDay !== yKey) {
            set({ streak: 0, completedToday: [], tasks: rolledTasks });
          } else {
            set({ completedToday: [], tasks: rolledTasks });
          }
        } else {
          set({ tasks: rolledTasks });
        }

        // ---- Penalidades de disciplina por dias passados sem cumprir ----
        const after = get();
        const start = after.lastPenaltyDate ?? dateKey(new Date(Date.now() - 86400000));
        const cursor = parseDate(start);
        if (after.lastPenaltyDate) cursor.setDate(cursor.getDate() + 1);
        let penalty = 0;
        const reasons: string[] = [];
        let guard = 0;
        while (dateKey(cursor) < today && guard < 60) {
          guard += 1;
          const d = dateKey(cursor);
          const dayTasks = todaysTasks(after.tasks, d);
          const doneCount = dayTasks.filter((t) => taskCompletedOn(t.id, after.sessions, d)).length;
          for (const t of dayTasks) {
            if (!taskCompletedOn(t.id, after.sessions, d) && t.priority === "alta") {
              penalty += disciplinePenalty(t.difficulty);
            }
          }
          if (dayTasks.length > 0 && doneCount === 0) {
            penalty += EMPTY_DAY_PENALTY;
            reasons.push(`Dia sem nenhuma conclusão (${d})`);
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        if (penalty > 0) {
          get().addDiscipline(-penalty, reasons[0] ?? "Tarefas obrigatórias não concluídas");
        }
        if (after.lastPenaltyDate !== today) set({ lastPenaltyDate: today });
        get().syncAchievements();
      },

      reset: () =>
        set({
          transactions: [],
          assistantMessages: [],
          userName: "",
          theme: "escuro",

          tasks: [],
          completedToday: [],
          sessions: [],
          xp: 0,
          streak: 0,
          lastActiveDay: null,
          longestStreak: 0,
          achievements: [],
          weeklyGoal: null,
          dailyMissionCompleted: null,
          onboarded: false,
          lifeGoals: [],
          books: [],
          readingSessions: [],
          readingGoals: [],
          readingNotes: [],
          discipline: 0,
          disciplineLog: [],
          dailyMinimum: 1,
          lastPenaltyDate: null,
          claimedMissions: [],
          dismissedMissed: [],
          challenges: [],
          recentUnlocks: [],
          shoppingLists: [],
          activeShoppingListId: null,
        }),
    }),
    { name: "kairos-store-v1" },
  ),
);

/** Compute per-day stats: total, done, pending, %. */
export const dayStats = (tasks: Task[], sessions: CompletedSession[], date: string) => {
  const list = todaysTasks(tasks, date);
  const total = list.length;
  const dayStart = parseDate(date).getTime();
  const dayEnd = dayStart + 86400000;
  const doneIds = new Set(
    sessions
      .filter(
        (s) =>
          completionDateForSession(s) === date ||
          (s.completedAt >= dayStart && s.completedAt < dayEnd),
      )
      .map((s) => s.taskId),
  );
  // Also count tasks marked concluida for this date via lastCompletedDate
  for (const t of list) if (t.lastCompletedDate === date) doneIds.add(t.id);
  const done = list.filter((t) => doneIds.has(t.id)).length;
  const pending = Math.max(total - done, 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pending, pct };
};

// ============================================================
// Metas de Vida — helpers de progresso e impacto
// ============================================================

export const goalCategoryLabel: Record<LifeGoalCategory, string> = {
  negocios: "Negócios",
  financeiro: "Financeiro",
  familia: "Família",
  relacionamento: "Relacionamentos",
  saude: "Saúde",
  atleta: "Atleta",
  espiritual: "Espiritual",
  estudo: "Estudos",
  carreira: "Carreira",
  outro: "Outro",
};

export const goalStatusLabel: Record<LifeGoalStatus, string> = {
  "em-andamento": "Em andamento",
  concluida: "Concluída",
  pausada: "Pausada",
};

/** Sessões concluídas ligadas a uma meta (via tarefa vinculada). */
export const goalSessions = (goal: LifeGoal, tasks: Task[], sessions: CompletedSession[]) => {
  const ids = new Set(tasks.filter((t) => t.goalId === goal.id).map((t) => t.id));
  return sessions.filter((s) => ids.has(s.taskId));
};

/**
 * Progresso de uma meta: combina objetivos concluídos com execução de tarefas.
 * `manualProgress` sobrepõe o cálculo automático quando definido.
 */
export const goalProgress = (goal: LifeGoal, tasks: Task[], sessions: CompletedSession[]) => {
  const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
  const completions = goalSessions(goal, tasks, sessions).length;
  const objectivesTotal = goal.objectives.length;
  const objectivesDone = goal.objectives.filter((o) => o.done).length;

  if (goal.status === "concluida") {
    return {
      pct: 100,
      completions,
      linkedTasks: linkedTasks.length,
      objectivesDone,
      objectivesTotal,
    };
  }
  if (typeof goal.manualProgress === "number") {
    return {
      pct: Math.max(0, Math.min(100, Math.round(goal.manualProgress))),
      completions,
      linkedTasks: linkedTasks.length,
      objectivesDone,
      objectivesTotal,
    };
  }

  const objectivePct = objectivesTotal > 0 ? (objectivesDone / objectivesTotal) * 100 : 0;
  // Execução: 40 conclusões de tarefas ligadas = 100% da parcela de execução.
  const executionPct = Math.min(100, (completions / 40) * 100);
  const pct =
    objectivesTotal > 0
      ? Math.round(objectivePct * 0.6 + executionPct * 0.4)
      : Math.round(executionPct);

  return {
    pct: Math.max(0, Math.min(100, pct)),
    completions,
    linkedTasks: linkedTasks.length,
    objectivesDone,
    objectivesTotal,
  };
};

const daysAgoKey = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateKey(d);
};

/** Painel de impacto: métricas por meta + evolução semanal/mensal/anual. */
export const goalImpact = (goals: LifeGoal[], tasks: Task[], sessions: CompletedSession[]) => {
  const week = daysAgoKey(7);
  const month = daysAgoKey(30);
  const year = daysAgoKey(365);

  const rows = goals.map((g) => {
    const gs = goalSessions(g, tasks, sessions);
    const dateOf = (s: CompletedSession) => s.scheduledDate ?? dateKey(new Date(s.completedAt));
    const last = gs.reduce((acc, s) => Math.max(acc, s.completedAt), 0);
    return {
      goal: g,
      ...goalProgress(g, tasks, sessions),
      weekCount: gs.filter((s) => dateOf(s) >= week).length,
      monthCount: gs.filter((s) => dateOf(s) >= month).length,
      yearCount: gs.filter((s) => dateOf(s) >= year).length,
      xp: gs.reduce((a, s) => a + s.xp, 0),
      minutes: Math.round(gs.reduce((a, s) => a + s.spentSeconds, 0) / 60),
      lastActivity: last || null,
    };
  });

  const active = rows.filter((r) => r.goal.status !== "pausada");
  const mostAttention = active.slice().sort((a, b) => b.weekCount - a.weekCount)[0] ?? null;
  const neglected =
    active
      .filter((r) => r.goal.status === "em-andamento")
      .slice()
      .sort(
        (a, b) => a.weekCount - b.weekCount || (a.lastActivity ?? 0) - (b.lastActivity ?? 0),
      )[0] ?? null;

  const unlinkedToday = tasks.filter((t) => !t.goalId && !t.archived).length;

  return { rows, mostAttention, neglected, unlinkedToday };
};

// ============================================================
// Leitura — helpers
// ============================================================

export const bookStatusLabel: Record<BookStatus, string> = {
  "quero-ler": "Não iniciado",
  lendo: "Em leitura",
  pausado: "Pausado",
  concluido: "Concluído",
};

export const bookProgress = (b: Book) =>
  b.totalPages > 0
    ? Math.max(0, Math.min(100, Math.round((b.currentPage / b.totalPages) * 100)))
    : 0;

export const readingGoalLabel: Record<ReadingGoalKind, string> = {
  "livros-ano": "livros por ano",
  "paginas-dia": "páginas por dia",
  "minutos-dia": "minutos por dia",
  "horas-semana": "horas por semana",
  "paginas-semana": "páginas por semana",
  "paginas-mes": "páginas por mês",
  "paginas-ano": "páginas por ano",
};

const startOfWeekKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return dateKey(d);
};

export const readingStats = (books: Book[], sessions: ReadingSession[]) => {
  const today = dateKey();
  const week = startOfWeekKey();
  const monthPrefix = today.slice(0, 7);

  const minutes = (list: ReadingSession[]) => list.reduce((a, s) => a + s.minutes, 0);
  const todayMinutes = minutes(sessions.filter((s) => s.date === today));
  const weekMinutes = minutes(sessions.filter((s) => s.date >= week));
  const monthMinutes = minutes(sessions.filter((s) => s.date.startsWith(monthPrefix)));
  const totalMinutes = minutes(sessions);

  const completed = books.filter((b) => b.status === "concluido");
  const reading = books.filter((b) => b.status === "lendo");
  const wishlist = books.filter((b) => b.status === "quero-ler");

  const pagesRead = books.reduce(
    (a, b) => a + (b.status === "concluido" ? b.totalPages || b.currentPage : b.currentPage),
    0,
  );

  // Páginas por dia (baseado nos logs)
  const pagesByDay = new Map<string, number>();
  for (const b of books) {
    let prev = 0;
    for (const l of [...b.logs].sort((x, y) => x.at - y.at)) {
      const delta = Math.max(0, l.page - prev);
      prev = l.page;
      pagesByDay.set(l.date, (pagesByDay.get(l.date) ?? 0) + delta);
    }
  }
  const dayCount = Math.max(pagesByDay.size, 1);
  const avgPagesPerDay = Math.round([...pagesByDay.values()].reduce((a, v) => a + v, 0) / dayCount);
  const todayPages = pagesByDay.get(today) ?? 0;

  const avgSessionMinutes = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;

  // Streak de dias lendo (sessão ou log)
  const activeDays = new Set<string>([...sessions.map((s) => s.date), ...pagesByDay.keys()]);
  let streak = 0;
  const cursor = new Date();
  if (!activeDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const countBy = (vals: string[]) => {
    const m = new Map<string, number>();
    for (const v of vals) if (v.trim()) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const topCategories = countBy(books.map((b) => b.category));
  const topAuthors = countBy(books.map((b) => b.author));

  const booksThisYear = completed.filter((b) =>
    (b.endDate ?? "").startsWith(String(new Date().getFullYear())),
  ).length;

  // Agregações por mês / ano (páginas e minutos)
  const yearPrefix = today.slice(0, 4);
  const pagesThisWeek = [...pagesByDay.entries()]
    .filter(([d]) => d >= week)
    .reduce((a, [, v]) => a + v, 0);
  const pagesThisMonth = [...pagesByDay.entries()]
    .filter(([d]) => d.startsWith(monthPrefix))
    .reduce((a, [, v]) => a + v, 0);
  const pagesThisYear = [...pagesByDay.entries()]
    .filter(([d]) => d.startsWith(yearPrefix))
    .reduce((a, [, v]) => a + v, 0);

  const pagesByMonth = new Map<string, number>();
  for (const [d, v] of pagesByDay)
    pagesByMonth.set(d.slice(0, 7), (pagesByMonth.get(d.slice(0, 7)) ?? 0) + v);
  const minutesByMonth = new Map<string, number>();
  for (const s of sessions)
    minutesByMonth.set(
      s.date.slice(0, 7),
      (minutesByMonth.get(s.date.slice(0, 7)) ?? 0) + s.minutes,
    );
  const monthly = [...new Set([...pagesByMonth.keys(), ...minutesByMonth.keys()])]
    .sort()
    .map((m) => ({
      mes: m,
      paginas: pagesByMonth.get(m) ?? 0,
      minutos: minutesByMonth.get(m) ?? 0,
    }));

  const pagesByYear = new Map<string, number>();
  for (const [d, v] of pagesByDay)
    pagesByYear.set(d.slice(0, 4), (pagesByYear.get(d.slice(0, 4)) ?? 0) + v);
  const yearly = [...pagesByYear.entries()].sort().map(([ano, paginas]) => ({ ano, paginas }));

  const totalPagesLogged = [...pagesByDay.values()].reduce((a, v) => a + v, 0);
  // Velocidade média de leitura em páginas por minuto/hora
  const pagesPerMinute = totalMinutes > 0 ? totalPagesLogged / totalMinutes : 0;
  const pagesPerHour = Math.round(pagesPerMinute * 60);
  const avgMinutesPerDay = Math.round(
    totalMinutes / Math.max(new Set(sessions.map((s) => s.date)).size, 1),
  );

  // Maior sequência de dias lendo (histórica)
  const activeSorted = [...activeDays].sort();
  let longestStreak = 0;
  let run = 0;
  let prevDay: string | null = null;
  for (const d of activeSorted) {
    if (prevDay) {
      const prevDate = new Date(`${prevDay}T12:00:00`);
      prevDate.setDate(prevDate.getDate() + 1);
      run = dateKey(prevDate) === d ? run + 1 : 1;
    } else run = 1;
    longestStreak = Math.max(longestStreak, run);
    prevDay = d;
  }

  return {
    todayMinutes,
    weekMinutes,
    monthMinutes,
    totalMinutes,
    completed: completed.length,
    reading: reading.length,
    wishlist: wishlist.length,
    paused: books.filter((b) => b.status === "pausado").length,
    pagesRead,
    avgPagesPerDay,
    todayPages,
    pagesThisWeek,
    pagesThisMonth,
    pagesThisYear,
    monthly,
    yearly,
    pagesByDay,
    activeDays,
    avgSessionMinutes,
    avgMinutesPerDay,
    pagesPerHour,
    pagesPerMinute,
    streak,
    longestReadingStreak: longestStreak,
    topCategories,
    topAuthors,
    booksThisYear,
  };
};

/** Estatísticas detalhadas de um livro específico. */
export const bookStats = (b: Book, sessions: ReadingSession[], notes: ReadingNote[] = []) => {
  const mine = sessions.filter((s) => s.bookId === b.id);
  const totalMinutes = mine.reduce((a, s) => a + s.minutes, 0);
  const days = new Set<string>([...mine.map((s) => s.date), ...b.logs.map((l) => l.date)]);
  const dayList = [...days].sort();
  const pct = bookProgress(b);
  const remainingPages = Math.max(0, (b.totalPages || 0) - b.currentPage);
  const remainingChapters =
    b.totalChapters && b.totalChapters > 0
      ? Math.max(0, b.totalChapters - (b.currentChapter ?? 0))
      : null;
  const avgPagesPerDay = dayList.length ? Math.round(b.currentPage / dayList.length) : 0;
  const avgMinutesPerDay = dayList.length ? Math.round(totalMinutes / dayList.length) : 0;
  const pagesPerMinute = totalMinutes > 0 ? b.currentPage / totalMinutes : 0;

  let estimatedFinish: string | null = null;
  if (remainingPages > 0 && avgPagesPerDay > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.ceil(remainingPages / avgPagesPerDay));
    estimatedFinish = dateKey(d);
  }

  const daysToFinish =
    b.startDate && b.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(`${b.endDate}T12:00:00`).getTime() -
              new Date(`${b.startDate}T12:00:00`).getTime()) /
              86400000,
          ),
        )
      : null;

  // Maior sequência de dias lendo neste livro
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dayList) {
    if (prev) {
      const p = new Date(`${prev}T12:00:00`);
      p.setDate(p.getDate() + 1);
      run = dateKey(p) === d ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  // Páginas por dia necessárias para bater a meta de conclusão
  let pagesPerDayNeeded: number | null = null;
  if (b.targetDate && remainingPages > 0) {
    const diff = Math.ceil(
      (new Date(`${b.targetDate}T12:00:00`).getTime() - Date.now()) / 86400000,
    );
    pagesPerDayNeeded = diff > 0 ? Math.ceil(remainingPages / diff) : remainingPages;
  }

  return {
    pct,
    totalMinutes,
    sessions: mine.length,
    notes: notes.filter((n) => n.bookId === b.id).length,
    readingDays: dayList.length,
    activeDays: days,
    remainingPages,
    remainingChapters,
    avgPagesPerDay,
    avgMinutesPerDay,
    pagesPerHour: Math.round(pagesPerMinute * 60),
    estimatedFinish,
    daysToFinish,
    longestStreak: longest,
    pagesPerDayNeeded,
  };
};

export const readingGoalProgress = (g: ReadingGoal, stats: ReturnType<typeof readingStats>) => {
  const current =
    g.kind === "livros-ano"
      ? stats.booksThisYear
      : g.kind === "paginas-dia"
        ? stats.todayPages
        : g.kind === "minutos-dia"
          ? stats.todayMinutes
          : g.kind === "paginas-semana"
            ? stats.pagesThisWeek
            : g.kind === "paginas-mes"
              ? stats.pagesThisMonth
              : g.kind === "paginas-ano"
                ? stats.pagesThisYear
                : Math.round((stats.weekMinutes / 60) * 10) / 10;
  const pct = g.target > 0 ? Math.min(100, Math.round((current / g.target) * 100)) : 0;
  return { current, pct };
};
