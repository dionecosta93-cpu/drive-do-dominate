import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Forja — configuração Android (Capacitor).
 *
 * O app é um projeto TanStack Start com rotas de servidor (Assistente IA,
 * transcrição de voz, busca de livros). Por isso o WebView carrega a versão
 * publicada em vez de arquivos estáticos: assim a IA, o login e o banco de
 * dados continuam funcionando exatamente como na web.
 *
 * Defina `APP_PUBLIC_URL` (ex.: https://seu-app.vercel.app) no ambiente antes de
 * rodar `cap sync` / o workflow de APK. Sem essa variável o app cai no bundle
 * local `dist/client` (sem SSR nem rotas /api) — serve só para testes offline.
 */
const publicUrl = process.env.APP_PUBLIC_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.forja.app",
  appName: "Forja",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  ...(publicUrl
    ? {
        server: {
          // URL pública onde o app web está publicado. O WebView Android carrega
          // daqui (o app usa rotas de servidor + Supabase, não arquivos estáticos).
          url: publicUrl,
          cleartext: false,
          androidScheme: "https",
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#050505",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_forja",
      iconColor: "#22c55e",
    },
  },
};

export default config;
