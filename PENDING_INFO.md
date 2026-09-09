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

### 3. IA (assistente, voz, busca de livros)

- **Onde:** rotas `src/routes/api/*.ts`, variável `LOVABLE_API_KEY` (server-side).
- **Situação:** hoje usa o gateway de IA da Lovable. Funciona no deploy da Lovable.
  Rodando 100% fora da Lovable, o `LOVABLE_API_KEY` precisa existir no ambiente de deploy,
  ou essas 4 rotas devem apontar para outro provedor (ex.: OpenAI direto).
- **Formato esperado:** decisão de produto + chave do provedor escolhido (server-side).

### 4. Pagamentos (planos PRO/PREMIUM)

- **Onde:** `src/lib/plans.ts` (`DEMO_MODE`), rota `/plans`.
- **Situação:** modo demonstração — telas existem, acesso 100%, R$ 0,00, sem gateway.
- **Ação futura:** definir gateway (Stripe / Pix / etc.), setar `DEMO_MODE = false` e
  ligar `getUserPlan()` ao plano real do usuário.

### 5. Migração para Expo / React Native (item do prompt de criação)

- **Decisão tomada:** **não migrado.** O app é TanStack Start (web SSR) + Capacitor para
  Android — migrar para Expo/RN seria recriar o projeto do zero, o que o próprio prompt
  proíbe ("não recrie", "não faça migração destrutiva", "adapte só o necessário") e
  destruiria features que funcionam (SSR, rotas `/api`, PWA, empacotamento Android atual).
- **Se você realmente quer Expo/RN:** confirme explicitamente que aceita um rewrite e o
  descarte da arquitetura web atual — aí planejamos a migração como projeto à parte.

### 6. Independência do Lovable

- **Restam dependências de runtime da Lovable:** `@lovable.dev/cloud-auth-js` (login Google
  em `src/integrations/lovable`), `@lovable.dev/vite-tanstack-config` (config do Vite),
  gateway de IA (`ai.gateway.lovable.dev`), `reportLovableError`.
- **Situação:** removê-las agora quebraria login Google, build e IA. São substituíveis
  (OAuth direto do Supabase, config Vite manual, provedor de IA próprio), mas é trabalho
  dedicado e arriscado — fora do escopo "faça só o que falta". Registrado para decisão futura.
