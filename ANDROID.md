# Forja — Android (APK)

O app web continua igual. Esta pasta apenas empacota a Forja como aplicativo Android via Capacitor.

- **ID do app:** `com.forja.app`
- **Nome:** Forja
- **Orientação:** retrato
- **Plataforma:** Android (minSdk 24, target 36)

## Como o app carrega o conteúdo

A Forja usa rotas de servidor (Assistente IA, transcrição de voz, busca de livros) e login/banco na nuvem.
Por isso o app Android abre a versão publicada (`server.url` em `capacitor.config.ts`).
Assim login, banco de dados, IA e voz funcionam exatamente como no navegador.

Se você publicar em outro endereço (ou domínio próprio), altere `server.url` em `capacitor.config.ts` e rode a sincronização novamente.

## Pré-requisitos na sua máquina

1. **Java JDK 21** (ou 17)
2. **Android Studio** (inclui o Android SDK e as ferramentas de build)
3. Node/npm instalados e as dependências do projeto (`npm install`)

## Gerar o APK de teste (debug)

```bash
npm run android:apk
```

Arquivo gerado em:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Renomeie para `Forja.apk`, transfira para o celular e instale (permita "instalar de fontes desconhecidas").

Alternativa pela interface: `npm run android:open` e depois **Build > Build Bundle(s)/APK(s) > Build APK(s)** no Android Studio.

## Gerar novas versões

Sempre que mudar o app:

```bash
npm run android:apk
```

Isso faz: build web → `cap sync android` → build Android.

## Versão assinada (Google Play)

1. Crie a keystore (fora do repositório):

```bash
keytool -genkey -v -keystore forja-release.keystore -alias forja \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. Copie `android/keystore.properties.example` para `android/keystore.properties` e preencha os valores
   (esse arquivo está no `.gitignore` — **nunca** comite senhas ou a keystore).

3. Gere:

```bash
npm run android:apk:release   # APK assinado
npm run android:aab           # AAB assinado para a Play Store
```

Saídas:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

Antes de cada envio à Play Store, aumente `versionCode`/`versionName` em `android/app/build.gradle`.

## Permissões declaradas

| Permissão | Uso |
| --- | --- |
| `INTERNET`, `ACCESS_NETWORK_STATE` | banco de dados, login, IA e detecção de conexão |
| `POST_NOTIFICATIONS`, `VIBRATE`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` | despertadores e lembretes de tarefas |
| `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` | comandos de voz do Assistente IA |

Nenhuma outra permissão é solicitada. A permissão de notificação é pedida em tempo de execução
quando o usuário ativa um despertador; a de microfone, ao tocar no botão de gravar do Assistente.

## Offline

Sem internet o app mostra um aviso no topo e mantém a interface. Funções que dependem de rede
(IA, transcrição de voz, sincronização em nuvem) voltam sozinhas assim que a conexão retorna.
