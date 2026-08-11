// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        // O registro é feito apenas pelo wrapper guardado (src/lib/pwa.ts).
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        filename: "sw.js",
        outDir: "dist/client",
        manifest: false, // manifest estático em public/manifest.webmanifest
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
  },
});
