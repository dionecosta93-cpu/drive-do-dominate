import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

// Config standalone (independente da Lovable). Preset do Nitro: node-server —
// o build gera um servidor Node em .output/server/index.mjs, publicável em
// qualquer host Node (Render, Railway, Fly, VPS...). Ajuste `NITRO_PRESET`
// se for publicar em outro alvo (ex.: `cloudflare-module`, `vercel`).

export default defineConfig(({ mode }) => {
  // Injeta VITE_* também em contextos SSR/edge (não só no cliente).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) define[`import.meta.env.${k}`] = JSON.stringify(v);

  return {
    define,
    server: { host: "::", port: 8080 },
    preview: { host: "::", port: 8080 },
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    plugins: [
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        // Redireciona a entrada de servidor do TanStack Start para src/server.ts
        // (nosso wrapper de erro SSR). O nitro/vite builda a partir disso.
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      nitro({ preset: process.env.NITRO_PRESET || "node-server" }),
      viteReact(),
      VitePWA({
        // O registro é feito apenas pelo wrapper guardado (src/lib/pwa.ts).
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false, // manifesto estático em public/manifest.webmanifest
        workbox: {
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico,webmanifest}"],
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML sempre tenta a rede primeiro; offline usa a última versão vista.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "forja-html",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
                sameOrigin && ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "forja-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
              },
            },
          ],
        },
      }),
    ],
  };
});
