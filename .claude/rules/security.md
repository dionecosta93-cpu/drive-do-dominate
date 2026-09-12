# Regras de segurança (permanentes)

## Segredos

- Só `VITE_*` (públicas, protegidas por RLS) podem ir ao bundle do cliente.
- `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` e qualquer secret: **apenas server-side**
  (`*.server.ts`, `src/routes/api/*.ts`), lidos de `process.env`.
- `.env` está no `.gitignore`. Só `.env.example` (nomes + valores fictícios) é versionado.
- Nunca logar nem exibir na UI: senha, token, service key, client secret.

## Supabase

- RLS ligado em toda tabela de usuário; policy escopada a `auth.uid()`.
  Hoje: `profiles`, `user_data` (blob por usuário), `user_plans`, `ai_usage`.
  Novas tabelas seguem o mesmo padrão.
- Campo que o próprio usuário não pode alterar (ex.: plano/assinatura, saldo, uso):
  **não** dê policy de INSERT/UPDATE para `authenticated` nessa tabela — só SELECT
  da própria linha. Escrita é sempre via service role, nunca client-writable
  (ver `user_plans`/`ai_usage` e `.claude/rules/planos-e-acesso.md`).
- Operação administrativa (bypass de RLS) só via `supabaseAdmin` (`client.server.ts`),
  importado dinamicamente dentro do handler.
- Não confiar em `user_id`/identificador vindo do cliente sem validar contra a sessão.

## Rotas /api/*

- Validar corpo da requisição (tipo, tamanho — hoje `slice` defensivo em `assistant.ts`).
- Erro para o cliente é genérico; detalhe só no log do servidor.
- Chave de IA nunca vai na resposta.
- Rota de IA (custo real por chamada): `guardApiRequest` (mesma origem + rate limit) **e**
  `checkAiAccess` (`src/lib/ai-access.server.ts` — quem é via Bearer token, plano libera a
  feature, cota diária não estourou). Cliente chama com `apiFetch` (`src/lib/api-fetch.ts`),
  que anexa o token da sessão — nunca `fetch` puro nessas rotas.

## Analytics (`src/lib/track.ts`)

- Nunca enviar e-mail, senha, token, CPF, cartão. `sanitize()` derruba chaves suspeitas.
- Só identificadores técnicos (UUID de usuário, id de sessão) + props explícitas.
- Camada desligada se `VITE_APP_ID`/`VITE_ANALYTICS_API_URL` não estiverem setados.
