# INFORMAÇÕES PENDENTES

Registro do que ainda depende de você. Nada aqui bloqueia o app de funcionar hoje —
os itens usam configuração provisória segura (placeholder vazio = recurso desligado).

---

## BLOQUEANTES

Nenhum. O app builda, roda e todas as funcionalidades existentes seguem operando.

---

## NÃO BLOQUEANTES

### 1. Cadastro por e-mail para usuários finais

- **Onde:** Supabase Auth (painel do projeto `jpghzjjpqiirsaznxdyo`).
- **Situação:** o projeto exige confirmação de e-mail e não tem SMTP configurado,
  então os e-mails de confirmação não chegam. Login por Google já funciona.
- **Ação sua (uma das duas):**
  - Desligar _Authentication → Providers → Email → "Confirm email"_ (acesso imediato,
    e-mail não verificado), **ou**
  - Configurar SMTP em _Authentication → Emails → SMTP Settings_ (ex.: Resend).
- **Formato esperado:** alteração no painel; nada muda no código.

### 2. Analytics central

- **Onde:** `.env` → `VITE_APP_ID`, `VITE_ANALYTICS_API_URL`. Camada em `src/lib/track.ts`.
- **Situação:** sem esses valores a camada fica desligada (nenhum evento é enviado).
- **Formato esperado:**
  - `VITE_APP_ID` = string curta identificando o app (ex.: `forja`)
  - `VITE_ANALYTICS_API_URL` = URL base do ingest (ex.: `https://analytics.seudominio.com`);
    os eventos vão para `<URL>/events` via POST JSON.
- **Contrato do evento enviado:**
  `{ app_id, event, ts, session_id, user_id, props }` — sem dados pessoais.
  Se o seu ingest espera outro formato/rota/autenticação (ex.: header `x-ingest-key`),
  me diga o contrato e eu adapto `track.ts`.

### 3. IA (assistente, voz, busca de livros) — DESLIGADA de propósito

- **Onde:** rotas `src/routes/api/*.ts` + `src/lib/ai-gateway.ts`.
- **Situação:** decoplada da Lovable e **desligada** — sem `AI_API_KEY` no ambiente, as 4
  rotas respondem `503` e a UI mostra "em breve". Nada quebra.
- **Para reativar (quando quiser):** defina no ambiente do servidor
  `AI_API_KEY=...` e, se não for um gateway compatível com OpenAI, também
  `AI_GATEWAY_URL=...`. Nenhuma mudança de código necessária.

### 4. Pagamentos (planos PRO/PREMIUM) — modo demo REMOVIDO

- **Onde:** `src/lib/plans.ts`, `public.user_plans` (Supabase), rota `/plans`.
  Detalhe completo em `.claude/rules/planos-e-acesso.md`.
- **Situação:** plano real por usuário, controle de acesso central (`RequireFeature` /
  `checkAiAccess`), IA com cota diária por plano. Sem gateway de pagamento ainda —
  liberação é manual via `node scripts/set-plan.mjs <email> <plano>`.
- **Ação futura:** integrar um gateway (Stripe / Pix / etc.) cujo webhook faça o mesmo
  `upsert` em `user_plans` que o script faz hoje (`source: 'pagamento'`).

### 5. Migração para Expo / React Native (item do prompt de criação)

- **Decisão tomada:** **não migrado.** O app é TanStack Start (web SSR) + Capacitor para
  Android — migrar para Expo/RN seria recriar o projeto do zero, o que o próprio prompt
  proíbe ("não recrie", "não faça migração destrutiva", "adapte só o necessário") e
  destruiria features que funcionam (SSR, rotas `/api`, PWA, empacotamento Android atual).
- **Se você realmente quer Expo/RN:** confirme explicitamente que aceita um rewrite e o
  descarte da arquitetura web atual — aí planejamos a migração como projeto à parte.

### 6. Independência do Lovable — CONCLUÍDO

- Removidos: `@lovable.dev/cloud-auth-js`, `@lovable.dev/vite-tanstack-config`,
  `src/integrations/lovable/`, `.lovable/`, hardcode do `ai.gateway.lovable.dev`,
  `reportLovableError` (→ `src/lib/error-reporting.ts` neutro).
- `vite.config.ts` reescrito com plugins padrão; Nitro preset `node-server`
  (build → `.output/server/index.mjs`, roda com `node`).
- Login Google agora é OAuth **nativo do Supabase** (`supabase.auth.signInWithOAuth`).
- **Pendência real:** no painel do Supabase, garanta que o provedor Google tem
  Client ID/Secret e que as **Redirect URLs** incluem a origem local
  (`http://localhost:8080`) e a URL de produção. Sem isso, o botão Google falha.
- `capacitor.config.ts` → `server.url` lê `APP_PUBLIC_URL` (fallback: a URL antiga
  `drive-do-dominate.lovable.app`). Aponte para o seu domínio ao publicar.

### 7. Onde hospedar o app (deploy) — ALVO DEFINIDO: Vercel

- **Config pronta:** `vercel.json` (`NITRO_PRESET=vercel npm run build`, saída
  `.vercel/output`). Passo a passo completo em **`DEPLOY.md`**.
- **Ação sua:**
  1. Importar o repo na Vercel e setar as env vars (lista em `DEPLOY.md` §1.3).
  2. Anotar a URL publicada e adicioná-la no Supabase (Auth → Site/Redirect URLs).
  3. No GitHub, cadastrar os Secrets `VITE_SUPABASE_*` e a Variable `APP_PUBLIC_URL`
     (a URL da Vercel), depois rodar o workflow **Android APK** para baixar o `.apk`.
- Outros hosts Node continuam possíveis (Render, Railway, Fly, Cloudflare com
  `NITRO_PRESET=cloudflare-module`) — basta trocar o preset e as env vars.
