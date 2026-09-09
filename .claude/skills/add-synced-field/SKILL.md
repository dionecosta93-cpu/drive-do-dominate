---
name: add-synced-field
description: Adicionar um novo campo persistido ao store Zustand de forma que ele seja salvo em localStorage E sincronizado com a nuvem (Supabase user_data). Use sempre que criar um novo dado de domínio no app.
---

# Adicionar um campo sincronizado ao store

O estado do app é um único store Zustand (`src/lib/store.ts`) persistido em
`localStorage` (chave `kairos-store-v1`) e espelhado na nuvem por
`src/lib/cloud-sync.ts` (um blob JSON por usuário em `public.user_data`).

Um campo novo **não sincroniza sozinho** — ele precisa estar na lista `SYNC_KEYS`.

## Passos

1. **Tipo + estado inicial em `src/lib/store.ts`**
   - Adicione o campo à interface `State`.
   - Dê valor inicial no objeto passado a `persist((set, get) => ({ ... }))`.
   - Adicione as ações (`addX`, `updateX`, `removeX`) seguindo o padrão das vizinhas
     (imutável, `genId()` para ids, `Date.now()` para timestamps).
   - Se o campo deve zerar no logout, inclua-o em `reset()`.

2. **`SYNC_KEYS` em `src/lib/cloud-sync.ts`**
   - Acrescente a string exata do nome do campo ao array `SYNC_KEYS`.
   - Só campos que devem ir para a nuvem. Estado efêmero de UI (ex.: `recentUnlocks`)
     fica de fora de propósito.

3. **Migração / retrocompatibilidade**
   - A hidratação é `useStore.setState(cloudData)` (merge raso): usuários antigos sem
     o campo mantêm o valor inicial. Garanta que todo consumidor tolera o default
     (ex.: `x ?? []`).

4. **Validar**
   - `npx tsc --noEmit`
   - `npm run lint`
   - Fluxo manual: criar o dado → recarregar (persistiu) → (com login) conferir que
     `user_data.data` recebeu a chave.

## Anti-padrões
- Não criar tabela relacional nova só para isso — o modelo é blob por usuário.
- Não gravar `NaN`/`undefined` em campos numéricos vindos de inputs.
