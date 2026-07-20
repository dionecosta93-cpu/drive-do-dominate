## Módulo de Calendário Inteligente

Vou entregar um calendário completo integrado à store atual (Zustand + sync na nuvem), sem quebrar o fluxo de foco/XP/streak que já existe.

### 1. Modelo de dados (src/lib/store.ts)

Estender `Task` com novos campos opcionais (retrocompatível — tarefas antigas continuam funcionando):

- `description?: string`
- `endTime?: string` (HH:MM)
- `actualMinutes?: number` (soma de tempo real gasto)
- `status?: "nao-iniciada" | "em-andamento" | "concluida" | "adiada" | "cancelada"`
- `color?: string` (hex)
- `icon?: string` (nome do ícone lucide)
- `notes?: string`
- `archived?: boolean`
- `editCount?: number`
- Novas repetições: `"quinzenal" | "mensal" | "anual" | "personalizada"`
- `customDates?: string[]` (para repetição personalizada)

Novas ações na store: `duplicateTask`, `duplicateTaskToDates(id, dates[])`, `moveTask(id, newDate, newTime?)`, `archiveTask`, `restoreTask`, `setTaskStatus`, `reopenTask`. `updateTask` incrementa `editCount`. Atualizar `todaysTasks` para suportar novas recorrências e ignorar arquivadas/canceladas.

### 2. Rotas novas (src/routes/_authenticated/)

- `calendar.tsx` — layout com `<Outlet />`, header com toggle Dia/Semana/Mês e busca global.
- `calendar.index.tsx` — visão Mês (padrão): grid 7×N, navegação mês/ano, destaque de hoje, indicadores por dia (contagem, barra de progresso, cor 🟢🟡🔴), toque abre `/calendar/$date`.
- `calendar.week.tsx` — visão Semana: 7 colunas com timeline de horários.
- `calendar.day.$date.tsx` — visão Dia: lista cronológica das atividades daquela data, botão grande "+ Nova atividade" quando vazia, ações rápidas (concluir, adiar, editar, duplicar, arquivar, mover).
- `calendar.search.tsx` — busca por nome/categoria/data/palavra-chave/status/prioridade.
- `calendar.history.tsx` — histórico das concluídas com tempo planejado × real, edits e observações.
- `calendar.archived.tsx` — arquivadas + restaurar.

Atualizar `tasks.new.tsx` para receber `?date=YYYY-MM-DD` via search params e aceitar os novos campos (descrição, término, cor, ícone, observações, repetições novas, "duplicar para vários dias").

Botão no dashboard e no bottom-nav para abrir o Calendário; toggle rápido "Calendário ↔ Lista".

### 3. Interações

- Tap em dia vazio → tela do dia com CTA "+ Nova atividade" (leva para `tasks.new?date=...`).
- Tap em dia com tarefas → abre a lista do dia direto.
- Long-press / menu de ação na tarefa: Concluir, Reabrir, Editar, Mover para outra data (date picker), Duplicar (1x, vários dias, semana, mês, ano), Arquivar, Excluir.
- Arrastar entre horários/dias na visão Semana usando HTML5 drag & drop nativo (mobile-friendly com fallback via menu "Mover").

### 4. Indicadores & cores

Helper `dayStats(date)` calcula: total, concluídas, pendentes, %. Cor da célula:
- 100% → `discipline` (verde)
- 1-99% → `warning` (amarelo)
- 0% com tarefas → `struggle` (vermelho)
- sem tarefas → neutro

### 5. Sync

Já coberto: `cloud-sync.ts` faz upsert do snapshot inteiro sempre que a store muda; nenhum trabalho extra.

### Detalhes técnicos

- Zero libs novas — usar `date-fns` (já presente) e componentes shadcn (Calendar, Popover, Dialog, DropdownMenu).
- Rotas seguem padrão TanStack file-based (`calendar.day.$date.tsx` → `/calendar/day/$date`).
- Search params validados com `zodValidator` em `calendar.search` e `tasks.new`.
- Toda alteração passa pelas actions da store → cloud sync automático.

Diz "vai" e eu implemento.
