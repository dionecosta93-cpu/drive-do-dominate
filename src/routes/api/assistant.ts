import { createFileRoute } from "@tanstack/react-router";

const ACTION_TYPES = [
  "criar_tarefa",
  "atualizar_tarefa",
  "excluir_tarefa",
  "mover_tarefa",
  "concluir_tarefa",
  "registrar_transacao",
  "excluir_transacao",
  "criar_meta",
] as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "actions"],
  properties: {
    reply: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "label", "payload"],
        properties: {
          type: { type: "string", enum: ACTION_TYPES as unknown as string[] },
          label: { type: "string" },
          payload: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM = `Você é o assistente pessoal do app "Disciplina Absoluta", em português do Brasil.
Você conversa de forma direta, motivadora e objetiva, e ajuda o usuário a:
- gerenciar tarefas, agenda e lembretes;
- controlar finanças (gastos e receitas), responder dúvidas financeiras e gerar relatórios;
- analisar rotina, disciplina, metas e sugerir melhorias.

Use o CONTEXTO ATUAL enviado para responder com números reais (nunca invente dados).
Quando o usuário pedir uma alteração no app, devolva ações em "actions"; elas só serão aplicadas
após o usuário autorizar na interface. Se for só conversa/relatório, "actions" deve ser [].

Cada ação tem "type", "label" (texto curto em português descrevendo o que será feito) e
"payload" (STRING contendo JSON válido). Formatos de payload:

criar_tarefa: {"name","description"?,"category":"treino|trabalho|estudo|vida|negocios|saude|familia|espiritual","priority":"baixa|media|alta","time":"HH:MM","endTime"?,"estimatedMinutes","maxMinutes","difficulty":1-10,"repetition":"nenhuma|diaria|semanal|dias-uteis|fim-de-semana|dias-especificos|quinzenal|mensal|anual","weekdays"?:[0-6],"scheduledDate":"YYYY-MM-DD","alarmMinutesBefore"?:5|10|15|30|60,"motivation"?,"notes"?}
atualizar_tarefa: {"id","patch":{...campos da tarefa}}
excluir_tarefa: {"id"}
mover_tarefa: {"id","date":"YYYY-MM-DD","time"?:"HH:MM"}
concluir_tarefa: {"id","date":"YYYY-MM-DD"}
registrar_transacao: {"kind":"receita|despesa","amount":number,"category":"alimentacao|transporte|moradia|saude|educacao|lazer|investimento|salario|outros","description"?,"date":"YYYY-MM-DD"}
excluir_transacao: {"id"}
criar_meta: {"name","description"?,"deadline"?:"YYYY-MM-DD"}

Regras: weekdays 0=domingo..6=sábado. Só use "id" que exista no contexto.
Responda sempre em português, curto e prático. Formate valores como R$ 0,00.`;

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return Response.json({ error: "missing_key" }, { status: 500 });

        let messages: Msg[] = [];
        let context = "";
        try {
          const body = (await request.json()) as { messages?: Msg[]; context?: string };
          messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
          context = (body.context ?? "").toString().slice(0, 12000);
        } catch {
          return Response.json({ error: "bad_body" }, { status: 400 });
        }
        if (!messages.length) return Response.json({ error: "empty" }, { status: 400 });

        const today = new Date().toISOString().slice(0, 10);
        const input = [
          {
            role: "developer",
            content: [{ type: "input_text", text: `${SYSTEM}\n\nHoje é ${today}.` }],
          },
          ...messages.map((m) =>
            m.role === "assistant"
              ? { role: "assistant", content: [{ type: "output_text", text: m.content }] }
              : { role: "user", content: [{ type: "input_text", text: m.content }] },
          ),
          {
            role: "user",
            content: [{ type: "input_text", text: `CONTEXTO ATUAL (JSON):\n${context}` }],
          },
        ];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            input,
            stream: true,
            store: false,
            reasoning: { effort: "low" },
            text: { format: { type: "json_schema", name: "resposta", strict: true, schema: SCHEMA } },
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          return Response.json(
            { error: "ai_failed", status: upstream.status, detail },
            { status: upstream.status || 500 },
          );
        }

        // Consume the SSE stream and accumulate the final JSON text.
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
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
                text += evt.delta;
              } else if (evt.type === "response.completed" && evt.response?.output_text) {
                if (!text) text = evt.response.output_text;
              }
            } catch {
              /* ignore malformed event */
            }
          }
        }

        try {
          const parsed = JSON.parse(text || "{}") as { reply?: string; actions?: unknown[] };
          return Response.json({
            reply: parsed.reply ?? "Não consegui formular uma resposta agora.",
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          });
        } catch {
          return Response.json({ reply: text || "Não consegui responder agora.", actions: [] });
        }
      },
    },
  },
});
