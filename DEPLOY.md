# Publicar o app + gerar o APK

O app Android é uma "casca" que abre a versão web publicada. Então a ordem é:
**1) publicar na Vercel → 2) gerar o APK apontando para essa URL.**

Depois disso, mudança de código JS/UI chega ao celular só publicando de novo na
Vercel (o app recarrega e pega a versão nova). O APK só é refeito quando muda algo
nativo (permissões, plugins, ícone, `versionCode`) ou a própria `APP_PUBLIC_URL`.

---

## 1. Publicar o servidor na Vercel

O build usa Nitro com preset `vercel` (já configurado em `vercel.json` →
`NITRO_PRESET=vercel npm run build`, saída em `.vercel/output`).

1. Em <https://vercel.com> → **Add New… → Project** → importe o repositório
   `dionecosta93-cpu/drive-do-dominate`.
2. Framework Preset: **Other** (o `vercel.json` já define build e install).
3. **Environment Variables** — adicione (Production + Preview):

   | Nome                            | Valor                                      | De onde vem     |
   | ------------------------------- | ------------------------------------------ | --------------- |
   | `VITE_SUPABASE_URL`             | `https://sadvdavccdiznlcdoona.supabase.co` | seu `.env`      |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | a anon/publishable key                     | seu `.env`      |
   | `VITE_SUPABASE_PROJECT_ID`      | `sadvdavccdiznlcdoona`                     | seu `.env`      |
   | `SUPABASE_URL`                  | igual à `VITE_SUPABASE_URL`                | SSR             |
   | `SUPABASE_PUBLISHABLE_KEY`      | igual à publishable key                    | SSR             |
   | `SUPABASE_SERVICE_ROLE_KEY`     | service role key (secret)                  | painel Supabase |
   | `AI_API_KEY`                    | _(opcional)_ liga o assistente de IA       | seu provedor    |

   > As `VITE_*` são públicas (protegidas por RLS). `SUPABASE_SERVICE_ROLE_KEY`
   > e `AI_API_KEY` são secretas — só no ambiente da Vercel, nunca no cliente.

4. **Deploy.** Ao terminar, anote a URL (ex.: `https://forja-xxxx.vercel.app`).
5. No painel do **Supabase → Authentication → URL Configuration**, adicione essa
   URL em **Site URL** e em **Redirect URLs** (senão o login Google falha em
   produção).

---

## 2. Gerar o APK pelo GitHub Actions

Não precisa de Java nem Android SDK na sua máquina — roda tudo na nuvem.

### 2.1 Configurar uma vez (Settings do repositório no GitHub)

**Settings → Secrets and variables → Actions:**

- Aba **Secrets** → New repository secret:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
- Aba **Variables** → New repository variable:
  - `APP_PUBLIC_URL` = a URL da Vercel do passo 1 (ex.: `https://forja-xxxx.vercel.app`)

### 2.2 Rodar

**Actions → "Android APK" → Run workflow → branch `main` → Run.**

Ao terminar (~5–8 min), abra a execução → seção **Artifacts** → baixe
`forja-debug-apk` (um `.zip` com `app-debug.apk` dentro).

### 2.3 Instalar no celular

1. Transfira o `app-debug.apk` para o telefone.
2. Toque nele → permita **"instalar de fontes desconhecidas"** para o app que
   estiver abrindo o arquivo.
3. A primeira abertura precisa de internet (o service worker guarda a interface
   para as próximas).

> APK de debug é assinado com a chave de debug — serve para testar em qualquer
> aparelho, mas **não** para publicar na Play Store. Para a loja, use
> `npm run android:aab` com uma keystore própria (ver `ANDROID.md`).

---

## 3. Ciclo do dia a dia

| Você mudou…                                                                             | O que fazer                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Código JS/UI, telas, store, rotas `/api`                                                | `git push` → a Vercel republica sozinha → abrir/fechar o app no celular pega a versão nova |
| `capacitor.config.ts`, permissões, plugins, ícone, `versionCode`, ou a `APP_PUBLIC_URL` | rodar de novo o workflow **Android APK** e reinstalar o `.apk`                             |
