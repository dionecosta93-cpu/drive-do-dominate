// Sistema de Disciplina (0–1000) — regras puras.

export const DISCIPLINE_MAX = 1000;

/** Pontos por dificuldade (1-10). */
export const disciplinePoints = (difficulty: number): number => {
  if (difficulty <= 3) return 5;
  if (difficulty <= 6) return 10;
  if (difficulty <= 8) return 20;
  return 30;
};

/** Penalidade por tarefa obrigatória não concluída. */
export const disciplinePenalty = (difficulty: number): number => {
  if (difficulty <= 3) return 5;
  if (difficulty <= 6) return 10;
  return 20;
};

/** Penalidade extra por dia totalmente sem conclusões. */
export const EMPTY_DAY_PENALTY = 15;

export const clampDiscipline = (v: number) => Math.max(0, Math.min(DISCIPLINE_MAX, Math.round(v)));

export type DisciplineTier = { name: string; color: string; min: number };

export const disciplineTiers: DisciplineTier[] = [
  { name: "Iniciante", color: "#71717a", min: 0 },
  { name: "Bronze", color: "#b45309", min: 250 },
  { name: "Prata", color: "#94a3b8", min: 500 },
  { name: "Ouro", color: "#eab308", min: 750 },
  { name: "Diamante", color: "#22d3ee", min: 1000 },
];

export const disciplineTier = (v: number): DisciplineTier =>
  [...disciplineTiers].reverse().find((t) => v >= t.min) ?? disciplineTiers[0]!;
