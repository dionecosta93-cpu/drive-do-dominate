import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";
import { getAiGateway, aiDisabledResponse } from "@/lib/ai-gateway";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
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

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        upstream.append("language", "pt");
        upstream.append("file", file, file.name || "recording.webm");

        const res = await fetch(`${ai.base}/v1/audio/transcriptions`, {
          method: "POST",
          headers: ai.authHeaders,
          body: upstream,
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return Response.json({ error: "stt_failed", detail }, { status: res.status });
        }
        const data = (await res.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
