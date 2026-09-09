# Regras de segurança (permanentes)

## Segredos

- Só `VITE_*` (públicas, protegidas por RLS) podem ir ao bundle do cliente.
- `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` e qualquer secret: **apenas server-side**
  (`*.server.ts`, `src/routes/api/*.ts`), lidos de `process.env`.
- `.env` está no `.gitignore`. Só `.env.example` (nomes + valores fictícios) é versionado.
- Nunca logar nem exibir na UI: senha, token, service key, client secret.

## Supabase

- RLS ligado em toda tabela de usuário; policy escopada a `auth.uid()`.
  Hoje: `profiles` e `user_data` (blob por usuário). Novas tabelas seguem o mesmo padrão.
- Operação administrativa (bypass de RLS) só via `supabaseAdmin` (`client.server.ts`),
  importado dinamicamente dentro do handler.
- Não confiar em `user_id`/identificador vindo do cliente sem validar contra a sessão.

## Rotas /api/*

- Validar corpo da requisição (tipo, tamanho — hoje `slice` defensivo em `assistant.ts`).
- Erro para o cliente é genérico; detalhe só no log do servidor.
- Chave de IA nunca vai na resposta.

## Analytics (`src/lib/track.ts`)

- Nunca enviar e-mail, senha, token, CPF, cartão. `sanitize()` derruba chaves suspeitas.
- Só identificadores técnicos (UUID de usuário, id de sessão) + props explícitas.
- Camada desligada se `VITE_APP_ID`/`VITE_ANALYTICS_API_URL` não estiverem setados.
