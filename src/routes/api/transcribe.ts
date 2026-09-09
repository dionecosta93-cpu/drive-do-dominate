import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "missing_key" }, { status: 500 });

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

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
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
