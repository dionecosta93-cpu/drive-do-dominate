# Planos e controle de acesso (permanente)

Sem modo demo — o plano de cada usuário é real, lido do banco.

## Onde vive o quê

- `src/lib/plans.ts` — fonte da verdade dos planos (`PLANS`, `Feature`, `FEATURE_LABEL`).
  Nunca redeclare planos/features em outro lugar.
- `public.user_plans` (Supabase) — plano atual por usuário. RLS: usuário só **lê** a
  própria linha; **escrita é só via service role** (o cliente não pode se auto-promover).
- `public.ai_usage` — contador diário de chamadas de IA por usuário (reseta por data).
- `src/lib/user-plan.ts` — `useUserPlan()` (hook) / `refreshUserPlan()` /
  `getCurrentPlan()`: plano do usuário logado, atualizado no login (`__root.tsx`).

## Regra de ouro

- **Nunca** cheque plano "na unha" numa tela. Use:
  - UI: `<RequireFeature feature="...">` (`src/components/require-feature.tsx`) —
    bloqueia visualmente e leva pra `/plans` se o usuário não tem a feature.
  - Servidor (rotas de IA / custo real): `checkAiAccess(request, feature)`
    (`src/lib/ai-access.server.ts`) — verifica o Bearer token, o plano E a cota
    diária antes de gastar a chamada de IA. Chame no início do handler, sempre.
- Toda rota `/api/*` que chama IA precisa: `guardApiRequest` (mesma origem + rate
  limit) **e** `checkAiAccess` (quem é, que plano, quanto já usou hoje). Uma sem a
  outra não é suficiente.
- No cliente, chame essas rotas com `apiFetch` (`src/lib/api-fetch.ts`), não `fetch`
  puro — é isso que anexa o token da sessão pro servidor saber quem está chamando.

## Liberar/trocar plano de alguém (sem gateway de pagamento ainda)

```bash
node scripts/set-plan.mjs <email> <free|pro|premium> [manual|trial|pagamento]
```

Sem tela de admin no app — é assim mesmo por decisão (menos superfície pra proteger,
enquanto for só o dono do produto liberando teste manualmente). Se/quando entrar um
gateway de pagamento de verdade, o ponto de integração é o mesmo `user_plans`: o
webhook do gateway faz o mesmo `upsert` que o script faz hoje, com `source: 'pagamento'`.

## Ao adicionar uma funcionalidade nova que deveria ser paga

1. Adicione a chave em `Feature` (`plans.ts`) e em qual(is) plano(s) ela entra.
2. Envolva a tela/rota com `<RequireFeature feature="sua_feature">`.
3. Se for uma rota de IA/custo real, adicione `checkAiAccess` no handler e o limite
   diário em `DAILY_LIMIT` (`ai-access.server.ts`).
