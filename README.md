# A Forja

Crie um aplicativo moderno focado em eliminar a procrastinação e aumentar a disciplina. O objetivo não é apenas organizar tarefas, mas fazer o usuário sentir vontade de começar imediatamente e experimentar satisfação ao concluir.

Tela Inicial

Mostrar:

Saudação personalizada.

Data.

Hora.

Barra de progresso do dia.

Mensagem:

"Seu futuro depende das decisões dos próximos minutos."

Botão grande:

COMEÇAR O DIA

Cadastro de tarefas

Cada tarefa deve possuir:

Nome

Categoria

Prioridade

Horário

Tempo estimado

Tempo máximo permitido

Repetição

Grau de dificuldade (1-10)

Recompensa definida pelo usuário

Consequência caso não conclua

Exemplo

Treino

Tempo previsto: 45 minutos

Recompensa: Assistir um episódio da série.

Consequência: Sem redes sociais hoje.

Antes de iniciar uma tarefa

Ao clicar em "Iniciar", o aplicativo entra em tela cheia.

Mostrar:

Nome da tarefa

Tempo previsto

Cronômetro

Respiração de 5 segundos

Depois aparecer uma frase diferente a cada tarefa.

Exemplos:

"Você nunca se arrepende de terminar uma tarefa. Apenas de adiá-la."

"Os próximos 30 minutos podem mudar sua vida."

"Disciplina constrói a vida que motivação nunca conseguiu."

"Seu concorrente provavelmente já começou."

"Comece cansado, mas termine orgulhoso."

"Seu eu de amanhã agradecerá."

Após 5 segundos aparece apenas:

COMEÇAR AGORA

Durante a tarefa

Cronômetro.

Barra de progresso.

Botão:

Concluir

Botão:

Pausar

Ao pausar perguntar:

"O motivo é realmente importante?"

Opções

Continuar

Pausar mesmo assim

O app registra quantas pausas o usuário faz.

Final da tarefa

Quando concluir:

Tela inteira.

Animação.

Som de vitória.

Mensagem:

"Parabéns. Você cumpriu sua palavra. Cada tarefa concluída fortalece sua disciplina."

Depois mostrar:

Tempo previsto

Tempo gasto

Eficiência

Pontuação

XP ganho

Sequência de dias

Sistema de níveis

Cada tarefa gera XP.

Exemplo

100 XP

Nível 2

300 XP

Nível 3

1000 XP

Nível 10

Quanto maior o nível:

Mais medalhas.

Mais desafios.

Mais frases desbloqueadas.

Sistema de sequência

Mostrar:

Você está há:

5 dias cumprindo tarefas.

Nunca quebrar a sequência.

Caso esteja prestes a perder:

"Falta apenas uma tarefa para manter sua sequência."

Estatísticas

Mostrar gráficos:

Horas produtivas.

Horas perdidas.

Tempo economizado.

Dias consecutivos.

Maior sequência.

Porcentagem de tarefas concluídas.

Média diária.

Inteligência Artificial

A IA analisa:

Quando o usuário procrastina.

Quais tarefas costuma abandonar.

Qual horário produz mais.

Quanto tempo realmente leva.

Depois sugere melhorias.

Exemplo:

"Você sempre procrastina tarefas difíceis após as 15h. Experimente fazê-las pela manhã."

Modo Foco

Ao iniciar:

Silenciar notificações (quando permitido).

Tela limpa.

Cronômetro.

Frases discretas.

Bloqueador de distrações (quando suportado pelo sistema).

Desafio dos 5 minutos

Se o usuário estiver enrolando:

Mostrar:

"Faça apenas cinco minutos. Depois você decide se continua."

Após cinco minutos:

Mostrar:

"Você já começou. Continue mais um pouco."

Cofre da Vitória

Cada tarefa concluída gera uma memória.

O usuário pode escrever:

Como se sentiu.

O que aprendeu.

No futuro o aplicativo mostra essas vitórias para aumentar a confiança.

Missão Diária

Todo dia:

Uma missão especial.

Exemplo

Organizar a mesa.

Treinar.

Ler 10 páginas.

Beber água.

Painel de Evolução

Mostrar:

Disciplina

Produtividade

Constância

Tempo economizado

Objetivos alcançados

XP total

Sistema de Conquistas

Primeira tarefa.

Primeira semana.

100 tarefas.

100 horas de foco.

30 dias consecutivos.

Sem pausas.

Terminou antes do tempo.

Biblioteca Motivacional

Centenas de frases.

Separadas por:

Disciplina.

Negócios.

Treino.

Estudo.

Vida.

Persistência.

Relatório semanal

Todo domingo:

Mostrar:

Tempo produtivo.

Tempo desperdiçado.

Maior conquista.

Maior dificuldade.

Sugestões da IA.

Sistema de Responsabilidade

O usuário escolhe uma meta semanal.

Caso não cumpra:

O aplicativo mostra exatamente quanto tempo foi desperdiçado e quais objetivos ficaram mais distantes.

Caso cumpra:

Animação especial.

Certificado semanal.

Recursos Premium

Backup em nuvem.

Sincronização entre celular e computador.

IA com coaching personalizado.

Metas anuais.

Relatórios em PDF.

Widgets para tela inicial.

Integração com calendário.

Integração com smartwatch.

Modo offline.

Temas claro, escuro e AMOLED.

Design

Interface minimalista e rápida.

Cores que mudam conforme o progresso (vermelho → amarelo → verde).

Botões grandes.

Fonte fácil de ler.

Poucas distrações.

Objetivo principal

O aplicativo deve transformar a conclusão de tarefas em uma experiência recompensadora. Deve utilizar princípios da psicologia comportamental, como reforço positivo imediato, formação de hábitos, gamificação, visualização do progresso e redução da resistência para iniciar tarefas. O foco é ajudar o usuário a agir, manter a consistência e construir disciplina ao longo do tempo, em vez de depender apenas de motivação momentânea.

## Stack

Projeto **independente** (não depende mais da Lovable). TanStack Start (SSR via Nitro) +
React 19 + Vite + Tailwind v4 + Supabase; empacotado para Android com Capacitor.
Arquitetura e comandos detalhados em [`CLAUDE.md`](./CLAUDE.md); pendências em
[`PENDING_INFO.md`](./PENDING_INFO.md).

## Desenvolvimento

Requer Node.js 20+ e npm.

```sh
git clone https://github.com/dionecosta93-cpu/drive-do-dominate.git
cd drive-do-dominate
cp .env.example .env   # preencha os valores do Supabase
npm i
npm run dev            # http://localhost:8080
```

## Build e deploy

```sh
npm run build          # gera .output/ (servidor Node — preset nitro "node-server")
node .output/server/index.mjs   # roda o servidor de produção
```

Publicável em qualquer host Node (Render, Railway, Fly, VPS...). Para outro alvo,
defina `NITRO_PRESET` (ex.: `cloudflare-module`, `vercel`) antes do build.
Android: veja [`ANDROID.md`](./ANDROID.md).
