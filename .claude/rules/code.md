# Regras de código (permanentes)

## TypeScript

- `strict` ligado. Nada de `any` implícito ou explícito; use `unknown` + narrowing.
- Tipos e enums de domínio vivem em `src/lib/store.ts` — importe de lá, não redeclare.
- Funções puras de regra de negócio ficam em `src/lib/*.ts`, testáveis isoladamente.

## React

- Componentes de tela são finos: cálculo e mutação passam pelo store/`lib`.
- `useStore((s) => s.campo)` com seletor em código novo (evita re-render global).
- Ao adicionar campo persistido no store, adicione a chave em `SYNC_KEYS`
  (`src/lib/cloud-sync.ts`) — senão não sincroniza. Ver skill `add-synced-field`.
- Inputs `type="number"`: trate string vazia (`NaN`) antes de gravar no store.
- Nada de `<label>` embrulhando vários controles.

## Estados de UI

- Toda tela com dados assíncronos ou lista precisa de: loading, estado vazio e erro.
- Rotas sob `_authenticated` herdam `pendingComponent`/`errorComponent` de `route.tsx`.
- Nenhum botão sem ação real. Sem tela falsa (exceto `DEMO_MODE` de planos).

## Estilo

- Prettier é regra de lint (`printWidth: 100`, aspas duplas, ponto e vírgula, trailing comma).
  Rode `npm run format` antes de considerar o lint limpo.
- Não reescreva arquivo inteiro para uma mudança pontual.
- LF sempre (`.gitattributes`).
