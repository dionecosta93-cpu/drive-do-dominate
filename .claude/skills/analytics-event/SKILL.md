---
name: analytics-event
description: Emitir um evento para o Analytics central a partir de uma ação real do usuário. Use ao adicionar uma funcionalidade que valha a pena medir (criação de conteúdo, uso de recurso, compartilhamento, etc.).
---

# Emitir um evento de analytics

Camada desacoplada em `src/lib/track.ts`. Fica **desligada** se `VITE_APP_ID` e
`VITE_ANALYTICS_API_URL` não estiverem configurados (ver `.env.example`).

## Como usar

```ts
import { track, trackFeature, trackCreated } from "@/lib/track";

track("login", { method: "email" });
trackCreated("goal", { category: "saude" });      // -> content_created
trackFeature("focus_completed", { pauses: 0 });   // -> feature_used
```

- Eventos válidos: o union `AnalyticsEvent` (`app_open`, `sign_up`, `login`, `logout`,
  `onboarding_completed`, `feature_used`, `content_created`, `content_shared`,
  `invite_sent`, `subscription_started`, `subscription_cancelled`).
- Para variações, use `feature_used` com `{ feature: "nome_curto" }` em vez de criar
  eventos novos.

## Regras
- **Nunca** passe dados pessoais: e-mail, senha, token, CPF, cartão, texto livre do usuário.
  `sanitize()` remove chaves suspeitas, mas não conte com isso — só passe o necessário.
- Dispare no ponto onde a ação **de fato** aconteceu (após sucesso da chamada), não no clique.
- `track` é fire-and-forget e nunca lança — não precisa de try/catch nem await.
- `setAnalyticsUser(userId)` já é chamado no `__root.tsx` ao logar/deslogar.

## Onde já há eventos
`app_open` (`__root.tsx`), `sign_up`/`login` (`auth.tsx`),
`onboarding_completed` (`_authenticated/index.tsx`),
`content_created` (`tasks.new.tsx`), `feature_used` (`focus.$taskId.tsx`, `plans.tsx`).
Não duplique.
