import type { TransactionKind } from "@/lib/store";

export const FINANCE_CATEGORIES = [
  "alimentacao",
  "mercado",
  "higiene",
  "limpeza",
  "bebidas",
  "farmacia",
  "casa",
  "eletronicos",
  "roupas",
  "transporte",
  "moradia",
  "saude",
  "educacao",
  "lazer",
  "investimento",
  "salario",
  "outros",
] as const;

export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];

export const financeCategoryLabel: Record<string, string> = {
  alimentacao: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  saude: "Saúde",
  educacao: "Educação",
  lazer: "Lazer",
  investimento: "Investimento",
  salario: "Salário",
  outros: "Outros",
};

export const financeCategoryColor: Record<string, string> = {
  alimentacao: "#f97316",
  transporte: "#3b82f6",
  moradia: "#a855f7",
  saude: "#ef4444",
  educacao: "#14b8a6",
  lazer: "#ec4899",
  investimento: "#22c55e",
  salario: "#eab308",
  outros: "#71717a",
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const kindSign = (kind: TransactionKind) => (kind === "receita" ? 1 : -1);
