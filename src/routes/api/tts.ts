import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";
import { getAiGateway, aiDisabledResponse } from "@/lib/ai-gateway";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
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

        const upstream = await fetch(`${ai.base}/v1/audio/speech`, {
          method: "POST",
          headers: {
            ...ai.authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: "onyx",
            response_format: "mp3",
            instructions:
              "Fale em português brasileiro com voz masculina firme, grave, intensa e impactante — como um treinador militar motivando o atleta a não parar. Ritmo confiante, tom decisivo, sem gritar.",
          }),
        });

        if (!upstream.ok) {
          const errText = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: "tts_failed", status: upstream.status, detail: errText }),
            { status: upstream.status, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
