import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Priority = "baixa" | "media" | "alta";
export type Category = "treino" | "trabalho" | "estudo" | "vida" | "negocios" | "saude";
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
export type TaskStatus =
  | "nao-iniciada"
  | "em-andamento"
  | "concluida"
  | "adiada"
  | "cancelada";

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
  archived?: boolean;
  editCount?: number;
  createdAt: number;
  scheduledDate: string;
  startDate?: string;
  endDate?: string;
  weekdays?: number[]; // 0=Sun..6=Sat, for dias-especificos
  lastCompletedDate?: string;
  rolloverCount?: number;
}

const parseDate = (s: string) => new Date(s + "T00:00:00");

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

interface State {
  userName: string;
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

  setUserName: (n: string) => void;
  setOnboarded: (b: boolean) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "scheduledDate"> & { scheduledDate?: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  duplicateTask: (id: string, newDate?: string) => void;
  duplicateTaskToDates: (id: string, dates: string[]) => void;
  moveTask: (id: string, newDate: string, newTime?: string) => void;
  archiveTask: (id: string) => void;
  restoreTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  reopenTask: (id: string) => void;
  completeSession: (s: Omit<CompletedSession, "id" | "completedAt" | "hourOfDay" | "xp">) => CompletedSession;
  addReflection: (sessionId: string, feeling: string, reflection: string) => void;
  markDailyMission: () => void;
  setWeeklyGoal: (g: WeeklyGoal) => void;
  tickDay: () => void;
  reset: () => void;
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const calcXp = (difficulty: number, estimatedMinutes: number, spentSeconds: number) => {
  const base = difficulty * 20;
  const timeBonus = Math.min(estimatedMinutes, 120) * 1.5;
  const efficiencyMult = estimatedMinutes > 0
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

      setUserName: (userName) => set({ userName }),
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

      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

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
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, status: "nao-iniciada", lastCompletedDate: undefined } : t,
          ),
          completedToday: s.completedToday.filter((tid) => tid !== id),
          sessions: s.sessions.filter((sess) => !(sess.taskId === id && new Date(sess.completedAt).toISOString().slice(0, 10) === today)),
        }));
      },

      completeSession: (partial) => {
        const xp = calcXp(partial.difficulty, partial.estimatedMinutes, partial.spentSeconds);
        const session: CompletedSession = {
          ...partial,
          id: genId(),
          completedAt: Date.now(),
          hourOfDay: new Date().getHours(),
          xp,
        };
        const today = todayKey();
        const state = get();
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
        const focusHours = (state.sessions.reduce((a, b) => a + b.spentSeconds, 0) + session.spentSeconds) / 3600;
        if (focusHours >= 100) unlock("hundred_hours");

        set({
          sessions: [...state.sessions, session],
          completedToday: state.lastActiveDay === today ? [...state.completedToday, session.taskId] : [session.taskId],
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
                  status: "concluida",
                  actualMinutes: (t.actualMinutes ?? 0) + Math.round(session.spentSeconds / 60),
                }
              : t,
          ),
        });
        return session;
      },

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
        const rolledTasks = state.tasks.map((t) =>
          t.repetition === "nenhuma" &&
          !t.archived &&
          t.status !== "cancelada" &&
          t.scheduledDate < today &&
          t.lastCompletedDate !== t.scheduledDate
            ? {
                ...t,
                scheduledDate: today,
                rolloverCount: (t.rolloverCount ?? 0) + 1,
                status: "adiada" as TaskStatus,
              }
            : t,
        );
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
      },

      reset: () =>
        set({
          userName: "",
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
      .filter((s) => s.completedAt >= dayStart && s.completedAt < dayEnd)
      .map((s) => s.taskId),
  );
  // Also count tasks marked concluida for this date via lastCompletedDate
  for (const t of list) if (t.lastCompletedDate === date) doneIds.add(t.id);
  const done = list.filter((t) => doneIds.has(t.id)).length;
  const pending = Math.max(total - done, 0);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pending, pct };
};
