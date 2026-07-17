import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Priority = "baixa" | "media" | "alta";
export type Category = "treino" | "trabalho" | "estudo" | "vida" | "negocios" | "saude";
export type Repetition = "nenhuma" | "diaria" | "semanal" | "dias-uteis";

export interface Task {
  id: string;
  name: string;
  category: Category;
  priority: Priority;
  time: string; // HH:MM
  estimatedMinutes: number;
  maxMinutes: number;
  repetition: Repetition;
  difficulty: number; // 1-10
  reward: string;
  consequence: string;
  createdAt: number;
  scheduledDate: string; // YYYY-MM-DD — for non-repeating; rolled over if not done
  lastCompletedDate?: string; // YYYY-MM-DD — last time it was completed (any repetition)
}

export const todaysTasks = (tasks: Task[], today: string): Task[] => {
  const d = new Date(today + "T00:00:00");
  const dow = d.getDay(); // 0=Sun..6=Sat
  return tasks.filter((t) => {
    if (t.repetition === "diaria") return true;
    if (t.repetition === "dias-uteis") return dow >= 1 && dow <= 5;
    if (t.repetition === "semanal") {
      const created = new Date(t.createdAt);
      return created.getDay() === dow;
    }
    // nenhuma
    return t.scheduledDate === today;
  });
};

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
  reflection?: string; // vault entry
  feeling?: string;
}

export interface Achievement {
  id: string;
  unlockedAt: number;
}

export interface WeeklyGoal {
  weekStart: number; // ms
  goal: string;
  targetSessions: number;
}

interface State {
  userName: string;
  tasks: Task[];
  completedToday: string[]; // task ids completed today
  sessions: CompletedSession[];
  xp: number;
  streak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  longestStreak: number;
  achievements: Achievement[];
  weeklyGoal: WeeklyGoal | null;
  dailyMissionCompleted: string | null; // YYYY-MM-DD
  onboarded: boolean;

  setUserName: (n: string) => void;
  setOnboarded: (b: boolean) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "scheduledDate"> & { scheduledDate?: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
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
  // 100, 300, 600, 1000, 1500... quadratic-ish
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

      addTask: (t) =>
        set((s) => ({
          tasks: [...s.tasks, { ...t, id: genId(), createdAt: Date.now() }],
        })),

      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

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
        // check achievements
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
        if (state.lastActiveDay && state.lastActiveDay !== today) {
          // check if yesterday was active
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
          if (state.lastActiveDay !== yKey) {
            // broke streak
            set({ streak: 0, completedToday: [] });
          } else {
            set({ completedToday: [] });
          }
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
