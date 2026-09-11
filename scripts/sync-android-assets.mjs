// cap sync pula a cópia de web assets quando server.url está configurado
// (nosso caso — ver capacitor.config.ts), então a pasta android/app/src/main/assets/public
// pode nem existir. Isso copia só o que o app nativo precisa ler localmente:
// a tela offline (ver OfflineWebViewClient.java).
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const dest = join("android", "app", "src", "main", "assets", "public");
mkdirSync(dest, { recursive: true });
copyFileSync(join("public", "offline-app.html"), join(dest, "offline-app.html"));
console.log(`[android] offline-app.html copiado para ${dest}`);
