import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

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
      viteReact(),
      // O service worker (offline/PWA) é um arquivo estático em public/sw.js,
      // não gerado pelo vite-plugin-pwa: no pipeline nitro/vite (build multi-ambiente),
      // o generateSW do plugin escreve num diretório intermediário que o nitro já
      // esvaziou antes — o sw.js nunca chegava no site publicado (offline não
      // funcionava). Arquivo estático em public/ é copiado de forma confiável pelo
      // nitro em qualquer preset. Ver src/lib/pwa.ts (registro) e public/sw.js.
      nitro({ preset: process.env.NITRO_PRESET || "node-server" }),
    ],
  };
});
