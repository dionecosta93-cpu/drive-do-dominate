# Forja — Android (APK/AAB), Offline e Notificações Nativas

O app web continua igual. Esta pasta empacota a Forja como aplicativo Android via Capacitor
e adiciona notificações nativas, cache offline (PWA) e sincronização automática.

- **ID do app:** `com.forja.app`
- **Nome:** Forja
- **Orientação:** retrato
- **Plataforma:** Android (minSdk 24, target 36)

## Como o app carrega o conteúdo

A Forja usa rotas de servidor (Assistente IA, transcrição de voz, busca de livros) e login/banco na nuvem.
Por isso o app Android abre a versão publicada (`server.url` em `capacitor.config.ts`) e usa um
**service worker** para guardar a interface no aparelho — assim a tela abre mesmo sem internet.

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

## Notificações nativas

- Plugin: `@capacitor/local-notifications` (AlarmManager do Android — funciona com o app fechado).
- Motor: `src/lib/notifications.ts`.
  - Calcula todas as ocorrências dos próximos **21 dias** usando as regras reais de repetição da tarefa
    (`taskAppearsOn`), respeitando dias da semana escolhidos — nunca o dia atual como substituto.
  - Agenda o **lembrete** em `horário − antecedência` (no horário, 5, 10, 15, 30, 60 min ou 1 dia).
  - Agenda uma **cobrança** depois do fim previsto, se a tarefa não estiver concluída.
  - IDs determinísticos (`tarefa|data|tipo`): ao alterar horário, dia, concluir, arquivar ou excluir,
    o agendamento antigo é cancelado e o novo criado no mesmo instante.
  - Horários usam `Date` local do aparelho (sem UTC).
- Canais criados: **Forja — Tarefas**, **Forja — Lembretes**, **Forja — Motivação**.
- Ações na notificação: **Concluir**, **Reagendar**, **Dispensar**. Tocar abre a tarefa.
- Reagendamento completo é executado ao abrir o app e ao voltar do segundo plano — isso restaura os
  lembretes após reiniciar o celular (junto com o receiver de boot do próprio plugin).
- Sem loops nem timers em segundo plano: só o agendador nativo do Android.

### Permissões declaradas

| Permissão | Uso |
| --- | --- |
| `INTERNET`, `ACCESS_NETWORK_STATE` | banco de dados, login, IA e detecção de conexão |
| `POST_NOTIFICATIONS`, `VIBRATE`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM` | despertadores e lembretes |
| `RECEIVE_BOOT_COMPLETED` | restaurar lembretes após reiniciar o aparelho |
| `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` | comandos de voz do Assistente IA |

A permissão de notificação (Android 13+) é pedida em tempo de execução, com explicação amigável, e pode
ser ativada depois pelo cartão "Notificações desativadas" na tela inicial.

## Offline e sincronização

- **PWA**: `public/manifest.webmanifest`, ícones (`icon-192/512`), `public/offline.html` e service worker
  gerado por `vite-plugin-pwa` (`generateSW`), registrado somente em produção pelo wrapper
  `src/lib/pwa.ts` (nunca em dev/preview; `?sw=off` desliga).
  - HTML: `NetworkFirst` (offline usa a última versão vista).
  - JS/CSS/fontes/imagens: `CacheFirst`.
- **Dados**: o estado do app (tarefas, hábitos, metas, leitura, finanças, XP, placas, histórico) já é
  persistido localmente pelo Zustand — offline você **vê e altera** normalmente.
- **Sincronização**: `src/lib/cloud-sync.ts` marca as alterações feitas offline como pendentes e envia
  automaticamente quando a internet volta (evento `online`), sempre para o mesmo banco oficial.
  Indicador: 📡 Offline → 🔄 Sincronizando... → 🟢 Conectado / ✓ Tudo sincronizado.
- Funções que exigem internet (IA, transcrição de voz, busca de livros) avisam quando estão indisponíveis.

## Limitações conhecidas

- O build Gradle **não roda no ambiente da Lovable** (sem Java/Android SDK). APK/AAB precisam ser gerados
  na sua máquina com os comandos acima.
- Como o WebView carrega a versão publicada, **publique antes de gerar o APK**; e a primeira abertura
  precisa de internet para o service worker guardar os arquivos.
- Notificações são pré-agendadas em uma janela de 21 dias (limite de alarmes do Android); a janela é
  renovada a cada abertura do app.
- Em fabricantes com economia de bateria agressiva (Xiaomi, Oppo, Samsung), pode ser necessário permitir
  "inicialização automática" / desativar otimização de bateria para a Forja.
