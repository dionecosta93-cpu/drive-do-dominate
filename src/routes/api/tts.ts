import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";
import { getAiGateway, aiDisabledResponse } from "@/lib/ai-gateway";

const GEMINI_MODEL = "gemini-2.5-flash-preview-tts";
const VOICE_INSTRUCTIONS =
  "Fale em português brasileiro com voz masculina firme, grave, intensa e impactante — como um treinador militar motivando o atleta a não parar. Ritmo confiante, tom decisivo, sem gritar.";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
        const { checkAiAccess } = await import("@/lib/ai-access.server");
        const access = await checkAiAccess(request, "voice_coach");
        if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
        const ai = getAiGateway();
        if (!ai) return aiDisabledResponse();
        let text = "";
        try {
          const body = (await request.json()) as { text?: string };
          text = (body.text ?? "").toString().slice(0, 500);
        } catch {
          return new Response(JSON.stringify({ error: "bad_body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!text.trim()) {
          return new Response(JSON.stringify({ error: "empty" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { geminiSynthesizeSpeech } = await import("@/lib/gemini.server");
        try {
          const wav = await geminiSynthesizeSpeech(ai, GEMINI_MODEL, text, VOICE_INSTRUCTIONS);
          return new Response(new Uint8Array(wav), {
            headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
          });
        } catch (e) {
          console.error("[tts] gemini failed", e);
          return new Response(JSON.stringify({ error: "tts_failed" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
