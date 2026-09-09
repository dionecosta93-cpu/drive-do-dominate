import {
  dateKey,
  taskCompletedOn,
  todaysTasks,
  type CompletedSession,
  type Task,
} from "@/lib/store";

export type MissionKind = "diaria" | "semanal" | "mensal";

export interface Mission {
  id: string;
  kind: MissionKind;
  name: string;
  target: number;
  progress: number;
  xp: number;
  discipline: number;
}

const startOfWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return dateKey(d);
};

const sessionDate = (s: CompletedSession) => s.scheduledDate ?? dateKey(new Date(s.completedAt));

export const buildMissions = (tasks: Task[], sessions: CompletedSession[]): Mission[] => {
  const today = dateKey();
  const week = startOfWeek();
  const monthPrefix = today.slice(0, 7);

  const todaySessions = sessions.filter((s) => sessionDate(s) === today);
  const weekSessions = sessions.filter((s) => sessionDate(s) >= week);
  const monthSessions = sessions.filter((s) => sessionDate(s).startsWith(monthPrefix));

  const dayTasks = todaysTasks(tasks, today);
  const dayDone = dayTasks.filter((t) => taskCompletedOn(t.id, sessions, today)).length;

  const weekDays = new Set(weekSessions.map(sessionDate)).size;
  const monthDays = new Set(monthSessions.map(sessionDate)).size;

  return [
    {
      id: `d-3-${today}`,
      kind: "diaria",
      name: "Concluir 3 tarefas hoje",
      target: 3,
      progress: todaySessions.length,
      xp: 50,
      discipline: 5,
    },
    {
      id: `d-all-${today}`,
      kind: "diaria",
      name: "Zerar a agenda do dia",
      target: Math.max(dayTasks.length, 1),
      progress: dayDone,
      xp: 120,
      discipline: 15,
    },
    {
      id: `d-focus-${today}`,
      kind: "diaria",
      name: "60 minutos de foco",
      target: 60,
      progress: Math.round(todaySessions.reduce((a, s) => a + s.spentSeconds, 0) / 60),
      xp: 80,
      discipline: 10,
    },
    {
      id: `w-15-${week}`,
      kind: "semanal",
      name: "15 tarefas na semana",
      target: 15,
      progress: weekSessions.length,
      xp: 300,
      discipline: 25,
    },
    {
      id: `w-days-${week}`,
      kind: "semanal",
      name: "Cumprir 5 dias diferentes",
      target: 5,
      progress: weekDays,
      xp: 250,
      discipline: 20,
    },
    {
      id: `m-60-${monthPrefix}`,
      kind: "mensal",
      name: "60 tarefas no mês",
      target: 60,
      progress: monthSessions.length,
      xp: 900,
      discipline: 60,
    },
    {
      id: `m-days-${monthPrefix}`,
      kind: "mensal",
      name: "20 dias ativos no mês",
      target: 20,
      progress: monthDays,
      xp: 800,
      discipline: 50,
    },
  ];
};
