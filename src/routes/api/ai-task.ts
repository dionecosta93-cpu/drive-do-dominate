import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `Você é um assistente que converte fala em português brasileiro em tarefas estruturadas de um app de produtividade.
Responda SEMPRE apenas com JSON válido, sem markdown.

Formato:
{
  "intent": "criar" | "atualizar" | "excluir" | "duplicar" | "pausar",
  "confidence": 0..1,
  "summary": "resumo curto em português do que foi entendido",
  "task": {
    "name": string,
    "description": string | null,
    "category": "treino" | "trabalho" | "estudo" | "vida" | "negocios" | "saude" | "familia" | "espiritual",
    "priority": "baixa" | "media" | "alta",
    "time": "HH:MM",
    "endTime": "HH:MM" | null,
    "estimatedMinutes": number,
    "maxMinutes": number,
    "difficulty": number,
    "repetition": "nenhuma" | "diaria" | "semanal" | "dias-uteis" | "fim-de-semana" | "dias-especificos" | "quinzenal" | "mensal" | "anual",
    "weekdays": number[],
    "scheduledDate": "YYYY-MM-DD" | null,
    "startDate": "YYYY-MM-DD" | null,
    "endDate": "YYYY-MM-DD" | null,
    "alarmMinutesBefore": 5|10|15|30|60|null,
    "notes": string | null,
    "motivation": string | null,
    "color": "#22c55e"|"#ef4444"|"#eab308"|"#3b82f6"|"#a855f7"|"#ec4899"|"#14b8a6"|"#f97316"|null
  },
  "changes": { "time": "HH:MM" | null, "date": "YYYY-MM-DD" | null, "pauseDays": number | null }
}

Regras: weekdays usa 0=domingo..6=sábado. Se disser "segunda, quarta e sexta" use repetition "dias-especificos" e weekdays [1,3,5].
"todos os dias" => "diaria". Se houver hora de início e fim, calcule estimatedMinutes e maxMinutes pela duração.
Escolha a categoria mais provável (ex.: Muay Thai => treino, Bíblia => espiritual, marketing => estudo).
Nunca invente campos fora do formato. Use null quando não souber.`;

export const Route = createFileRoute("/api/ai-task")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "missing_key" }, { status: 500 });

        let transcript = "";
        try {
          const body = (await request.json()) as { transcript?: string };
          transcript = (body.transcript ?? "").toString().slice(0, 1200);
        } catch {
          return Response.json({ error: "bad_body" }, { status: 400 });
        }
        if (!transcript.trim()) return Response.json({ error: "empty" }, { status: 400 });

        const today = new Date().toISOString().slice(0, 10);
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `Hoje é ${today}. Fala do usuário: "${transcript}"` },
            ],
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          return Response.json({ error: "ai_failed", status: upstream.status, detail }, { status: upstream.status });
        }

        const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content ?? "{}";
        try {
          return Response.json(JSON.parse(content));
        } catch {
          return Response.json({ error: "bad_ai_json", raw: content }, { status: 502 });
        }
      },
    },
  },
});
