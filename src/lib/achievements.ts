// Catálogo de placas digitais (conquistas). Puro — sem dependência de store em runtime.

export type Rarity = "comum" | "raro" | "epico" | "lendario";

export interface AchievementStats {
  sessions: number;
  streak: number;
  longestStreak: number;
  discipline: number;
  xp: number;
  level: number;
  totalHours: number;
  hoursByCategory: Record<string, number>;
  readingHours: number;
  noPauseSession: boolean;
  earlyFinish: boolean;
  perfectDays: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: Rarity;
  test: (s: AchievementStats) => boolean;
}

export const rarityStyle: Record<Rarity, { label: string; className: string; ring: string }> = {
  comum: { label: "Comum", className: "text-muted-foreground", ring: "border-border" },
  raro: { label: "Raro", className: "text-info", ring: "border-info/40" },
  epico: { label: "Épico", className: "text-warning", ring: "border-warning/40" },
  lendario: { label: "Lendário", className: "text-discipline", ring: "border-discipline/50" },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_task",
    name: "Primeira Tarefa",
    desc: "Comece. É sempre o mais difícil.",
    icon: "🥇",
    rarity: "comum",
    test: (s) => s.sessions >= 1,
  },
  {
    id: "first_week",
    name: "Primeira Semana",
    desc: "7 dias em sequência.",
    icon: "📅",
    rarity: "comum",
    test: (s) => s.longestStreak >= 7,
  },
  {
    id: "thirty_days",
    name: "30 Dias Seguidos",
    desc: "Hábito instalado.",
    icon: "🔥",
    rarity: "raro",
    test: (s) => s.longestStreak >= 30,
  },
  {
    id: "hundred_days",
    name: "100 Dias Seguidos",
    desc: "Você virou outra pessoa.",
    icon: "🌋",
    rarity: "lendario",
    test: (s) => s.longestStreak >= 100,
  },
  {
    id: "hundred_tasks",
    name: "Centurião",
    desc: "100 tarefas concluídas.",
    icon: "💯",
    rarity: "raro",
    test: (s) => s.sessions >= 100,
  },
  {
    id: "five_hundred_tasks",
    name: "Executor",
    desc: "500 tarefas concluídas.",
    icon: "⚔️",
    rarity: "epico",
    test: (s) => s.sessions >= 500,
  },
  {
    id: "thousand_tasks",
    name: "Máquina",
    desc: "1000 tarefas concluídas.",
    icon: "🤖",
    rarity: "lendario",
    test: (s) => s.sessions >= 1000,
  },
  {
    id: "hundred_hours",
    name: "100 Horas de Foco",
    desc: "O tempo é sua moeda.",
    icon: "⏳",
    rarity: "raro",
    test: (s) => s.totalHours >= 100,
  },
  {
    id: "study_100h",
    name: "100 Horas de Estudo",
    desc: "Conhecimento acumulado.",
    icon: "📚",
    rarity: "epico",
    test: (s) => (s.hoursByCategory["estudo"] ?? 0) >= 100,
  },
  {
    id: "sport_100h",
    name: "100 Horas de Esporte",
    desc: "Corpo forjado.",
    icon: "🥊",
    rarity: "epico",
    test: (s) => (s.hoursByCategory["treino"] ?? 0) + (s.hoursByCategory["saude"] ?? 0) >= 100,
  },
  {
    id: "reading_100h",
    name: "100 Horas de Leitura",
    desc: "Mente expandida.",
    icon: "📖",
    rarity: "epico",
    test: (s) => s.readingHours >= 100,
  },
  {
    id: "no_pauses",
    name: "Zero Pausas",
    desc: "Uma tarefa sem interrupção.",
    icon: "🎯",
    rarity: "comum",
    test: (s) => s.noPauseSession,
  },
  {
    id: "finished_early",
    name: "Antes do Tempo",
    desc: "Terminou antes do previsto.",
    icon: "⚡",
    rarity: "comum",
    test: (s) => s.earlyFinish,
  },
  {
    id: "perfect_day",
    name: "Dia Perfeito",
    desc: "Todas as tarefas do dia concluídas.",
    icon: "✅",
    rarity: "raro",
    test: (s) => s.perfectDays >= 1,
  },
  {
    id: "perfect_10",
    name: "10 Dias Perfeitos",
    desc: "Consistência absoluta.",
    icon: "🏆",
    rarity: "epico",
    test: (s) => s.perfectDays >= 10,
  },
  {
    id: "disc_bronze",
    name: "Disciplina Bronze",
    desc: "250 pontos de disciplina.",
    icon: "🥉",
    rarity: "comum",
    test: (s) => s.discipline >= 250,
  },
  {
    id: "disc_prata",
    name: "Disciplina Prata",
    desc: "500 pontos de disciplina.",
    icon: "🥈",
    rarity: "raro",
    test: (s) => s.discipline >= 500,
  },
  {
    id: "disc_ouro",
    name: "Disciplina Ouro",
    desc: "750 pontos de disciplina.",
    icon: "🏅",
    rarity: "epico",
    test: (s) => s.discipline >= 750,
  },
  {
    id: "disc_diamante",
    name: "Disciplina Diamante",
    desc: "1000 pontos — o topo.",
    icon: "💎",
    rarity: "lendario",
    test: (s) => s.discipline >= 1000,
  },
  {
    id: "level_10",
    name: "Nível 10",
    desc: "A jornada começou de verdade.",
    icon: "🔟",
    rarity: "comum",
    test: (s) => s.level >= 10,
  },
  {
    id: "level_25",
    name: "Nível 25",
    desc: "Veterano da rotina.",
    icon: "🛡️",
    rarity: "raro",
    test: (s) => s.level >= 25,
  },
  {
    id: "level_50",
    name: "Nível 50",
    desc: "Metade do caminho até 100.",
    icon: "👑",
    rarity: "epico",
    test: (s) => s.level >= 50,
  },
  {
    id: "level_100",
    name: "Nível 100",
    desc: "Domínio absoluto.",
    icon: "🌟",
    rarity: "lendario",
    test: (s) => s.level >= 100,
  },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

export const evaluateAchievements = (stats: AchievementStats, unlocked: string[]): string[] =>
  ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.test(stats)).map((a) => a.id);
