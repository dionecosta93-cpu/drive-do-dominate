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
  mercado: "Mercado",
  higiene: "Higiene",
  limpeza: "Limpeza",
  bebidas: "Bebidas",
  farmacia: "Farmácia",
  casa: "Casa",
  eletronicos: "Eletrônicos",
  roupas: "Roupas",
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
  mercado: "#f59e0b",
  higiene: "#06b6d4",
  limpeza: "#0ea5e9",
  bebidas: "#8b5cf6",
  farmacia: "#f43f5e",
  casa: "#84cc16",
  eletronicos: "#6366f1",
  roupas: "#d946ef",
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

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const kindSign = (kind: TransactionKind) => (kind === "receita" ? 1 : -1);
