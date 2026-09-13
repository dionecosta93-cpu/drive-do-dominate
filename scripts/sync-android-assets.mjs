// cap sync pula a cópia de web assets quando server.url está configurado
// (nosso caso — ver capacitor.config.ts), então a pasta android/app/src/main/assets/public
// nunca é criada por padrão.
//
// Esse app usa TanStack Start com SSR (Nitro/node-server): não existe um "dist/client"
// estático com index.html pronto — cada página é renderizada pelo servidor Node a cada
// request. Por isso não há um "app completo" pra empacotar localmente no Android.
//
// O que colocamos aqui é a página offline (public/offline-app.html) — que já sabe
// reconstruir a tela a partir do Cache Storage/localStorage do próprio WebView — também
// como index.html. Isso serve dois papéis:
//   1) OfflineWebViewClient.java: intercepta a navegação principal quando a internet cai
//      DEPOIS que o app já abriu, e devolve esse HTML sem trocar a URL/origem.
//   2) MainActivity.java: quando o app abre SEM internet (cold start), troca o CapConfig
//      pra não usar server.url — o Capacitor então serve o webDir local (assets/public)
//      sob o mesmo hostname/scheme do site real, e precisa achar um index.html ali.
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const dest = join("android", "app", "src", "main", "assets", "public");
const src = join("public", "offline-app.html");

mkdirSync(dest, { recursive: true });
copyFileSync(src, join(dest, "offline-app.html"));
copyFileSync(src, join(dest, "index.html"));
console.log(`[android] offline-app.html copiado para ${dest} (também como index.html)`);
