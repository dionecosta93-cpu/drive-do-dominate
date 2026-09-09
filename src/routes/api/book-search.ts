import { createFileRoute } from "@tanstack/react-router";
import { guardApiRequest } from "@/lib/api-guard";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "subtitle",
          "author",
          "category",
          "genre",
          "publisher",
          "publishedYear",
          "language",
          "isbn",
          "synopsis",
          "totalPages",
          "totalChapters",
          "averageRating",
          "estimatedMinutes",
          "tags",
        ],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          author: { type: "string" },
          category: { type: "string" },
          genre: { type: "string" },
          publisher: { type: "string" },
          publishedYear: { type: "number" },
          language: { type: "string" },
          isbn: { type: "string" },
          synopsis: { type: "string" },
          totalPages: { type: "number" },
          totalChapters: { type: "number" },
          averageRating: { type: "number" },
          estimatedMinutes: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const SYSTEM = `Você é um catalogador de livros. Dado o nome (e opcionalmente autor) de um livro,
retorne até 4 edições/candidatos reais em português do Brasil quando existirem.
Preencha todos os campos com o melhor conhecimento disponível. Use "" para textos desconhecidos e 0 para números desconhecidos.
Nunca invente ISBNs improváveis: se não souber, use "".
A sinopse deve ter 2 a 4 frases. estimatedMinutes = páginas * 1.8 (arredondado).
category é uma categoria simples do app (ex.: Produtividade, Negócios, Mentalidade, Espiritualidade, Ficção).`;

type Candidate = { title?: string; author?: string; isbn?: string; cover?: string };

async function attachCovers(results: Candidate[]) {
  await Promise.all(
    results.map(async (r) => {
      try {
        if (r.isbn) {
          r.cover = `https://covers.openlibrary.org/b/isbn/${r.isbn.replace(/[^0-9Xx]/g, "")}-L.jpg`;
          return;
        }
        const q = encodeURIComponent(`${r.title ?? ""} ${r.author ?? ""}`.trim());
        const res = await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1`);
        const json = (await res.json()) as { docs?: { cover_i?: number }[] };
        const id = json.docs?.[0]?.cover_i;
        if (id) r.cover = `https://covers.openlibrary.org/b/id/${id}-L.jpg`;
      } catch {
        /* capa opcional */
      }
    }),
  );
}

export const Route = createFileRoute("/api/book-search")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const blocked = guardApiRequest(request);
        if (blocked) return blocked;
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "missing_key" }, { status: 500 });

        let query = "";
        try {
          const body = (await request.json()) as { query?: string };
          query = (body.query ?? "").trim();
        } catch {
          return Response.json({ error: "bad_body" }, { status: 400 });
        }
        if (!query) return Response.json({ error: "empty" }, { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            input: [
              { role: "developer", content: [{ type: "input_text", text: SYSTEM }] },
              { role: "user", content: [{ type: "input_text", text: `Livro: ${query}` }] },
            ],
            stream: true,
            store: false,
            reasoning: { effort: "low" },
            text: { format: { type: "json_schema", name: "livros", strict: true, schema: SCHEMA } },
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return Response.json({ error: "ai_failed", detail }, { status: upstream.status || 500 });
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const evt = JSON.parse(raw) as {
                type?: string;
                delta?: string;
                response?: { output_text?: string };
              };
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string")
                text += evt.delta;
              else if (evt.type === "response.completed" && evt.response?.output_text && !text)
                text = evt.response.output_text;
            } catch {
              /* ignora evento malformado */
            }
          }
        }

        try {
          const parsed = JSON.parse(text || "{}") as { results?: Candidate[] };
          const results = Array.isArray(parsed.results) ? parsed.results.slice(0, 4) : [];
          await attachCovers(results);
          return Response.json({ results });
        } catch {
          return Response.json({ results: [] });
        }
      },
    },
  },
});
