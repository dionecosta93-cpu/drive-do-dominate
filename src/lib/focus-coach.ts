// Impactful Portuguese motivational one-liners spoken by the AI coach during Focus mode.
export const focusCoachLines: string[] = [
  "Não perca o foco. Continue.",
  "Nada de distração. Volte para a missão agora.",
  "Você começou. Termine.",
  "Cada segundo aqui é disciplina sendo construída.",
  "Respira, foca, executa. Sem desculpa.",
  "A vontade de parar é o teste. Passe nele.",
  "O incômodo agora é o preço da vitória.",
  "Continue. Você é maior do que essa preguiça.",
  "Foco absoluto. Só existe essa tarefa.",
  "Não pare. Você prometeu isso a si mesmo.",
  "Aguenta mais um minuto. Depois mais um. Depois mais um.",
  "Disciplina é fazer mesmo quando não dá vontade. Faça.",
  "Ignore o celular. Ignore o cansaço. Continue.",
  "Você não veio até aqui para desistir agora.",
  "Cabeça na tarefa. Mão na tarefa. Sem parar.",
  "Toda distração que você vence te torna mais forte.",
  "Não negocie com a preguiça. Execute.",
  "Um passo. Depois o próximo. Não pare.",
  "Você é a versão que não desiste. Prove agora.",
  "Foco. Isso é o que separa você do resto.",
  "A vitória mora do outro lado desse esforço. Continue.",
  "Silêncio na mente. Ação nas mãos.",
  "Você está no controle. Continue.",
  "Cada minuto de foco é uma vitória silenciosa. Continue somando.",
  "Não olhe para o relógio. Olhe para a tarefa.",
];

export function pickFocusCoachLine(exclude?: string): string {
  const pool = exclude ? focusCoachLines.filter((line) => line !== exclude) : focusCoachLines;
  return pool[Math.floor(Math.random() * pool.length)];
}
