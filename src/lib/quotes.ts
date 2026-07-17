export const startQuotes = [
  "Você nunca se arrepende de terminar uma tarefa. Apenas de adiá-la.",
  "Os próximos 30 minutos podem mudar sua vida.",
  "Disciplina constrói a vida que motivação nunca conseguiu.",
  "Seu concorrente provavelmente já começou.",
  "Comece cansado, mas termine orgulhoso.",
  "Seu eu de amanhã agradecerá.",
  "Ação vence dúvida. Sempre.",
  "O tempo passa. A pergunta é: com você ou sem você?",
  "Cada minuto adiado é uma dívida com o seu futuro.",
  "Vitórias silenciosas constroem impérios.",
];

export const library: Record<string, string[]> = {
  Disciplina: [
    "A disciplina é escolher entre o que você quer agora e o que você quer mais.",
    "Motivação te tira da cama. Disciplina te faz treinar mesmo cansado.",
    "Ser disciplinado é ser livre do que você sente.",
  ],
  Negócios: [
    "Enquanto você hesita, alguém executa.",
    "Consistência supera talento.",
    "Foco é o novo QI.",
  ],
  Treino: [
    "O corpo escuta o que a mente ordena.",
    "Sem dor, sem transformação.",
    "Cada repetição é um voto por quem você quer ser.",
  ],
  Estudo: [
    "O que você lê hoje decide o que você discute em cinco anos.",
    "Uma página por dia. Trezentas e sessenta e cinco por ano.",
    "Conhecimento composto rende mais que dinheiro composto.",
  ],
  Vida: [
    "Você é a soma dos hábitos que ninguém vê.",
    "Faça hoje o que você agradecerá em um ano.",
    "Seu tempo é a única moeda que não volta.",
  ],
  Persistência: [
    "Quem não desiste, vence por eliminação.",
    "A pedra é quebrada pelo golpe cento e um.",
    "Persistência é talento em câmera lenta.",
  ],
};

export const dailyMissions = [
  "Organize sua mesa por 10 minutos.",
  "Beba 2 litros de água hoje.",
  "Leia 10 páginas de um livro.",
  "Faça 20 minutos de exercício.",
  "Desinstale um app que rouba seu tempo.",
  "Escreva 3 metas para o mês.",
  "Fique 1 hora sem redes sociais.",
  "Ligue para alguém que você ama.",
  "Arrume sua cama antes das 8h.",
  "Anote uma vitória do dia.",
];

export function pickDaily<T>(arr: T[]): T {
  const d = new Date();
  const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
  return arr[seed % arr.length];
}

export function randomStartQuote(): string {
  return startQuotes[Math.floor(Math.random() * startQuotes.length)];
}
