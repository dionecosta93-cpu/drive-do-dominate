import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Forja — configuração Android (Capacitor).
 *
 * O app é um projeto TanStack Start com rotas de servidor (Assistente IA,
 * transcrição de voz, busca de livros). Por isso o WebView carrega a versão
 * publicada em vez de arquivos estáticos: assim a IA, o login e o banco de
 * dados continuam funcionando exatamente como na web.
 */
const config: CapacitorConfig = {
  appId: "com.forja.app",
  appName: "Forja",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: "https://drive-do-dominate.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
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
