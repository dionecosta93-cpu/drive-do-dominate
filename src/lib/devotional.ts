export type DevotionalTheme = "Produtividade" | "Mentalidade" | "Negócios" | "Disciplina" | "Liderança";

export interface Devotional {
  id: string;
  theme: DevotionalTheme;
  book: string;
  author: string;
  excerpt: string;
  reflection: string;
  action: string;
}

export const devotionals: Devotional[] = [
  {
    id: "d1",
    theme: "Produtividade",
    book: "A Única Coisa",
    author: "Gary Keller",
    excerpt:
      "Qual é a única coisa que eu posso fazer, de tal forma que, ao fazê-la, tudo o mais se tornará mais fácil ou desnecessário?",
    reflection:
      "Dispersão é a forma mais educada de procrastinação. Fazer dez coisas medianas parece produtivo, mas é fuga da tarefa que realmente dói.",
    action: "Escolha hoje UMA tarefa que destrava as outras e execute-a antes de qualquer coisa.",
  },
  {
    id: "d2",
    theme: "Produtividade",
    book: "Trabalho Focado (Deep Work)",
    author: "Cal Newport",
    excerpt:
      "A capacidade de realizar trabalho profundo está se tornando cada vez mais rara e, ao mesmo tempo, cada vez mais valiosa na economia atual.",
    reflection:
      "Quem consegue ficar 90 minutos sem tocar no celular já está à frente de 95% das pessoas. Foco virou vantagem competitiva.",
    action: "Bloqueie um período de 90 minutos sem notificações e trabalhe na sua tarefa mais difícil.",
  },
  {
    id: "d3",
    theme: "Produtividade",
    book: "Hábitos Atômicos",
    author: "James Clear",
    excerpt:
      "Você não sobe ao nível dos seus objetivos. Você cai ao nível dos seus sistemas.",
    reflection:
      "Motivação some. Sistema permanece. Se sua rotina não sustenta a meta, a meta é apenas um desejo com data.",
    action: "Transforme uma meta sua em um hábito diário de no máximo 15 minutos.",
  },
  {
    id: "d4",
    theme: "Produtividade",
    book: "A Arte de Fazer Acontecer",
    author: "David Allen",
    excerpt: "Sua mente foi feita para ter ideias, não para guardá-las.",
    reflection:
      "Tarefa não anotada vira peso mental. O cansaço do fim do dia muitas vezes não vem do que você fez, mas do que ficou girando na cabeça.",
    action: "Tire tudo da cabeça: registre agora todas as pendências do dia no aplicativo.",
  },
  {
    id: "d5",
    theme: "Mentalidade",
    book: "Mindset",
    author: "Carol Dweck",
    excerpt:
      "O que os grandes fazem no fracasso não é desistir: é aprender, ajustar e tentar de novo.",
    reflection:
      "Talento é ponto de partida, não destino. Quem encara dificuldade como treino evolui; quem encara como sentença estagna.",
    action: "Anote no Cofre algo que você errou esta semana e a lição extraída disso.",
  },
  {
    id: "d6",
    theme: "Mentalidade",
    book: "O Obstáculo é o Caminho",
    author: "Ryan Holiday",
    excerpt: "O impedimento à ação avança a ação. O que está no caminho torna-se o caminho.",
    reflection:
      "Aquilo que você está evitando é exatamente o que vai te fazer crescer. Fuja do obstáculo e você foge do seu próprio desenvolvimento.",
    action: "Identifique a tarefa que você mais adiou e comece por ela hoje.",
  },
  {
    id: "d7",
    theme: "Mentalidade",
    book: "Meditações",
    author: "Marco Aurélio",
    excerpt:
      "Você tem poder sobre a sua mente, não sobre os eventos externos. Perceba isso e encontrará força.",
    reflection:
      "Reclamar do cenário consome a mesma energia necessária para mudá-lo. Disciplina é escolher onde essa energia vai.",
    action: "Escreva uma coisa que está fora do seu controle e decida deliberadamente parar de gastar energia com ela.",
  },
  {
    id: "d8",
    theme: "Mentalidade",
    book: "Comece pelo Porquê",
    author: "Simon Sinek",
    excerpt: "As pessoas não compram o que você faz, compram o porquê de você fazer.",
    reflection:
      "O mesmo vale para você mesmo. Sem um porquê forte, qualquer desculpa ganha a discussão às 6 da manhã.",
    action: "Releia a motivação de uma das suas Metas de Vida antes de iniciar a próxima tarefa.",
  },
  {
    id: "d9",
    theme: "Mentalidade",
    book: "Antifrágil",
    author: "Nassim Taleb",
    excerpt: "O vento apaga a vela e alimenta o fogo.",
    reflection:
      "Pressão revela o que você construiu. Rotinas frágeis quebram no primeiro imprevisto; rotinas antifrágeis usam o caos como combustível.",
    action: "Defina hoje a versão mínima da sua rotina — o que você cumpre mesmo em um dia caótico.",
  },
  {
    id: "d10",
    theme: "Disciplina",
    book: "Disciplina é Liberdade",
    author: "Jocko Willink",
    excerpt: "A disciplina equivale à liberdade. Quanto mais disciplina você tem, mais liberdade conquista.",
    reflection:
      "Quem não se comanda é comandado pelo impulso. Cada decisão adiada entrega um pedaço da sua autonomia.",
    action: "Cumpra hoje, sem negociar, a tarefa que você menos tem vontade de fazer.",
  },
  {
    id: "d11",
    theme: "Disciplina",
    book: "Faça a Cama",
    author: "William H. McRaven",
    excerpt: "Se você quer mudar o mundo, comece arrumando sua cama.",
    reflection:
      "Pequenas vitórias logo cedo criam identidade de quem termina o que começa. O dia inteiro segue esse tom.",
    action: "Cumpra uma micro-tarefa de 2 minutos nos primeiros 10 minutos do seu dia.",
  },
  {
    id: "d12",
    theme: "Disciplina",
    book: "Coragem para Ser Imperfeito",
    author: "Brené Brown",
    excerpt: "O perfeccionismo não é busca por excelência: é medo de julgamento com roupa de virtude.",
    reflection:
      "Muita procrastinação é perfeccionismo disfarçado. Entregar imperfeito e corrigir vence esperar o momento ideal.",
    action: "Entregue hoje algo em versão 80% em vez de adiar buscando o 100%.",
  },
  {
    id: "d13",
    theme: "Negócios",
    book: "A Startup Enxuta",
    author: "Eric Ries",
    excerpt: "Se você não sabe quem é o cliente, não sabe o que é qualidade.",
    reflection:
      "Trabalho sem validação é hobby caro. Antes de aperfeiçoar, descubra se alguém realmente quer aquilo.",
    action: "Fale hoje com uma pessoa real do seu público antes de continuar construindo.",
  },
  {
    id: "d14",
    theme: "Negócios",
    book: "De Zero a Um",
    author: "Peter Thiel",
    excerpt: "Toda grande empresa é construída sobre um segredo que os outros ainda não enxergam.",
    reflection:
      "Copiar entrega sobrevivência. Enxergar o que ninguém vê entrega vantagem. Isso exige tempo de pensamento, não só de execução.",
    action: "Reserve 20 minutos hoje para pensar estrategicamente, sem executar nada.",
  },
  {
    id: "d15",
    theme: "Negócios",
    book: "Os Axiomas de Zurique",
    author: "Max Gunther",
    excerpt: "A preocupação não é doença, é sinal de saúde. Se você não está preocupado, não está arriscando o suficiente.",
    reflection:
      "Conforto e crescimento raramente moram no mesmo lugar. O desconforto calculado é o preço da evolução patrimonial.",
    action: "Liste um risco pequeno e reversível que você pode assumir esta semana.",
  },
  {
    id: "d16",
    theme: "Negócios",
    book: "Pai Rico, Pai Pobre",
    author: "Robert Kiyosaki",
    excerpt: "Não é quanto dinheiro você ganha, mas quanto dinheiro você mantém e quanto ele trabalha para você.",
    reflection:
      "Renda alta com hábitos fracos é só uma esteira mais rápida. Liberdade financeira é comportamento, depois planilha.",
    action: "Separe hoje um percentual fixo da sua renda antes de qualquer gasto.",
  },
  {
    id: "d17",
    theme: "Negócios",
    book: "Traction",
    author: "Gabriel Weinberg",
    excerpt: "Quase todas as empresas que falham têm produto. Poucas têm distribuição.",
    reflection:
      "Construir é a parte confortável. Vender expõe. Por isso tanta gente se esconde no operacional.",
    action: "Dedique um bloco de tempo hoje exclusivamente a vender ou divulgar.",
  },
  {
    id: "d18",
    theme: "Liderança",
    book: "Os 7 Hábitos das Pessoas Altamente Eficazes",
    author: "Stephen Covey",
    excerpt: "A chave não é priorizar o que está na sua agenda, mas agendar suas prioridades.",
    reflection:
      "Se o importante não tem horário marcado, o urgente ocupa o lugar dele todos os dias.",
    action: "Coloque na agenda de hoje um horário fixo para algo importante e não urgente.",
  },
  {
    id: "d19",
    theme: "Liderança",
    book: "Extreme Ownership",
    author: "Jocko Willink & Leif Babin",
    excerpt: "Não existem times ruins, apenas líderes ruins. A responsabilidade é sempre sua.",
    reflection:
      "Culpar circunstância alivia por cinco minutos e paralisa por meses. Assumir devolve o controle.",
    action: "Assuma responsabilidade total por um resultado ruim recente e defina o próximo passo.",
  },
  {
    id: "d20",
    theme: "Liderança",
    book: "Essencialismo",
    author: "Greg McKeown",
    excerpt: "Se não é um sim claro, então é um não claro.",
    reflection:
      "Cada sim automático é um não silencioso para sua família, saúde ou meta. Dizer não é ato de disciplina.",
    action: "Diga não hoje a um compromisso que não serve às suas metas.",
  },
  {
    id: "d21",
    theme: "Produtividade",
    book: "A Semana de 4 Horas",
    author: "Tim Ferriss",
    excerpt: "Estar ocupado é uma forma de preguiça: pensamento preguiçoso e ação indiscriminada.",
    reflection:
      "Ocupação não é progresso. Métrica de esforço engana; métrica de resultado corrige.",
    action: "Elimine ou delegue hoje uma atividade que consome tempo e não gera resultado.",
  },
  {
    id: "d22",
    theme: "Mentalidade",
    book: "Homem em Busca de Sentido",
    author: "Viktor Frankl",
    excerpt:
      "Entre o estímulo e a resposta existe um espaço. Nesse espaço está o nosso poder de escolher a resposta.",
    reflection:
      "A vontade de desistir vai aparecer. Ela não decide nada — você decide no segundo seguinte.",
    action: "Na próxima vontade de parar, respire e continue por mais 5 minutos.",
  },
];

export const devotionalThemes: DevotionalTheme[] = [
  "Produtividade",
  "Mentalidade",
  "Negócios",
  "Disciplina",
  "Liderança",
];

export function devotionalOfTheDay(date = new Date()): Devotional {
  const seed = date.getFullYear() * 1000 + date.getMonth() * 40 + date.getDate();
  return devotionals[seed % devotionals.length];
}
