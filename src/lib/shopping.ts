import type { ShoppingItem, ShoppingList } from "@/lib/store";

/** Categorias padrão da lista de compras (também usadas no financeiro). */
export const SHOPPING_CATEGORIES = [
  "mercado",
  "higiene",
  "limpeza",
  "bebidas",
  "alimentacao",
  "farmacia",
  "casa",
  "eletronicos",
  "roupas",
  "outros",
] as const;

export const shoppingCategoryLabel: Record<string, string> = {
  mercado: "Mercado",
  higiene: "Higiene",
  limpeza: "Limpeza",
  bebidas: "Bebidas",
  alimentacao: "Alimentação",
  farmacia: "Farmácia",
  casa: "Casa",
  eletronicos: "Eletrônicos",
  roupas: "Roupas",
  outros: "Outros",
};

export const UNITS = ["un", "pacote", "kg", "g", "litro", "ml", "caixa", "dúzia", "fardo"];

/** Palpite de categoria a partir do nome do produto (usado pela IA e pela lista rápida). */
const GUESS: Array<[string, RegExp]> = [
  [
    "limpeza",
    /detergente|sabão|amaciante|desinfet|água sanit|esponja|vassoura|alvejante|multiuso/i,
  ],
  [
    "higiene",
    /papel higi|sabonete|shampoo|condicionador|pasta de dente|creme dental|desodorante|absorvente|fralda|escova de dente/i,
  ],
  ["bebidas", /refrigerante|cerveja|suco|água|vinho|energético|refresco|coca|guaraná/i],
  ["farmacia", /remédio|dipirona|paracetamol|ibuprofeno|vitamina|band-?aid|pomada|antial|xarope/i],
  ["eletronicos", /pilha|cabo|carregador|fone|lâmpada led|mouse|teclado/i],
  ["roupas", /camisa|calça|meia|cueca|blusa|tênis|short/i],
  ["casa", /pilha|vela|panela|toalha|lençol|cabide|pano de prato|lixeira/i],
  [
    "mercado",
    /arroz|feijão|carne|leite|ovo|pão|café|açúcar|óleo|macarrão|farinha|frango|queijo|manteiga|sal|molho|banana|maçã|tomate|batata|cebola|alho|iogurte|biscoito|presunto/i,
  ],
];

export function guessCategory(name: string): string {
  for (const [cat, re] of GUESS) if (re.test(name)) return cat;
  return "outros";
}

export interface ListTotals {
  estimated: number;
  paid: number;
  total: number;
  done: number;
  pct: number;
}

export function listTotals(list: ShoppingList): ListTotals {
  let estimated = 0;
  let paid = 0;
  let done = 0;
  for (const i of list.items) {
    estimated += (i.estimatedPrice ?? 0) * (i.quantity || 1);
    if (i.purchased) {
      done += 1;
      paid += i.paidPrice ?? (i.estimatedPrice ?? 0) * (i.quantity || 1);
    }
  }
  const total = list.items.length;
  return {
    estimated: Math.round(estimated * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}

export const itemLabel = (i: ShoppingItem) =>
  `${i.name}${i.quantity > 1 || i.unit !== "un" ? ` — ${i.quantity} ${i.unit}` : ""}`;

/**
 * Interpreta texto livre em itens ("2 pacotes de arroz, 3 litros de leite, detergente").
 * Usado na lista rápida por voz/texto.
 */
export function parseItemsText(
  text: string,
): Array<{ name: string; quantity: number; unit: string; category: string }> {
  const unitWords: Record<string, string> = {
    pacote: "pacote",
    pacotes: "pacote",
    kg: "kg",
    quilo: "kg",
    quilos: "kg",
    grama: "g",
    gramas: "g",
    litro: "litro",
    litros: "litro",
    ml: "ml",
    caixa: "caixa",
    caixas: "caixa",
    duzia: "dúzia",
    dúzia: "dúzia",
    dúzias: "dúzia",
    fardo: "fardo",
    fardos: "fardo",
    unidade: "un",
    unidades: "un",
  };
  return text
    .split(/,| e | \+ |;|\n/gi)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      let rest = raw.replace(/^(adiciona[r]?|coloca[r]?|põe|bota)\s+/i, "").trim();
      let quantity = 1;
      let unit = "un";
      const qtd = rest.match(/^(\d+(?:[.,]\d+)?)\s*/);
      if (qtd) {
        quantity = Number(qtd[1]!.replace(",", ".")) || 1;
        rest = rest.slice(qtd[0].length);
      }
      const uni = rest.match(/^([a-zçãáéíóúâêô]+)\s+(?:de\s+)?/i);
      if (uni && unitWords[uni[1]!.toLowerCase()]) {
        unit = unitWords[uni[1]!.toLowerCase()]!;
        rest = rest.slice(uni[0].length);
      }
      const name = rest.replace(/^de\s+/i, "").trim();
      return { name, quantity, unit, category: guessCategory(name) };
    })
    .filter((i) => i.name.length > 0);
}
