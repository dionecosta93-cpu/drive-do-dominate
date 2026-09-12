import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";
import { getAiGateway, aiDisabledResponse } from "@/lib/ai-gateway";

const GEMINI_MODEL = "gemini-3.5-transcribe";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
        const { checkAiAccess } = await import("@/lib/ai-access.server");
        const access = await checkAiAccess(request, "ai_assistant");
        if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
        const ai = getAiGateway();
        if (!ai) return aiDisabledResponse();

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          if (f instanceof File) file = f;
        } catch {
          return Response.json({ error: "bad_body" }, { status: 400 });
        }
        if (!file || file.size < 1024)
          return Response.json({ error: "empty_audio" }, { status: 400 });
        if (file.size > 20 * 1024 * 1024)
          return Response.json({ error: "too_large" }, { status: 413 });

        const { geminiTranscribe } = await import("@/lib/gemini.server");
        try {
          const text = await geminiTranscribe(ai, GEMINI_MODEL, file);
          return Response.json({ text });
        } catch (e) {
          console.error("[transcribe] gemini failed", e);
          return Response.json({ error: "stt_failed" }, { status: 502 });
        }
      },
    },
  },
});
