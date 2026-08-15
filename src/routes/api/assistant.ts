import { createFileRoute } from "@tanstack/react-router";

const ACTION_TYPES = [
  "criar_tarefa",
  "atualizar_tarefa",
  "excluir_tarefa",
  "duplicar_tarefa",
  "mover_tarefa",
  "concluir_tarefa",
  "reabrir_tarefa",
  "arquivar_tarefa",
  "lembrete_tarefa",
  "registrar_transacao",
  "atualizar_transacao",
  "excluir_transacao",
  "criar_meta",
  "atualizar_meta",
  "excluir_meta",
  "criar_objetivo",
  "concluir_objetivo",
  "criar_livro",
  "atualizar_livro",
  "excluir_livro",
  "progresso_leitura",
  "status_livro",
  "sessao_leitura",
  "criar_habito",
  "concluir_habito",
  "excluir_habito",
  "definir_minimo_diario",
  "anotacao_leitura",
  "arquivar_livro",
  "reiniciar_livro",
  "criar_lista_compras",
  "adicionar_item_compras",
  "atualizar_item_compras",
  "remover_item_compras",
  "marcar_item_comprado",
  "duplicar_lista_compras",
  "finalizar_lista_compras",
  "excluir_lista_compras",
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

const SYSTEM = `Você é o assistente pessoal e CENTRO DE CONTROLE do app "Disciplina Absoluta", em português do Brasil.
Você tem exatamente as mesmas permissões do usuário: tudo que pode ser feito pelas telas pode ser feito por você
(tarefas, agenda, lembretes, hábitos, metas, leitura, financeiro, disciplina, XP, conquistas, configurações).

O CONTEXTO ATUAL enviado a cada mensagem é o banco de dados oficial do app (tarefas, livros, hábitos, metas,
finanças completas por mês/categoria, conquistas). SEMPRE consulte esse contexto antes de responder.
NUNCA diga que não há dados sem antes procurar no contexto. Nunca invente números.

Quando o usuário pedir uma alteração, devolva ações em "actions"; elas só são aplicadas após ele autorizar na
interface — por isso, sempre apresente no "reply" um resumo claro do que será criado/alterado/excluído.
Se for só conversa/consulta/relatório, "actions" deve ser [].

Cada ação tem "type", "label" (texto curto em português) e "payload" (STRING com JSON válido). Formatos:

criar_tarefa: {"name","description"?,"category":"treino|trabalho|estudo|vida|negocios|saude|familia|espiritual","priority":"baixa|media|alta","time":"HH:MM","endTime"?,"estimatedMinutes","maxMinutes","difficulty":1-10,"repetition":"nenhuma|diaria|semanal|dias-uteis|fim-de-semana|dias-especificos|quinzenal|mensal|anual","weekdays"?:[0-6],"scheduledDate":"YYYY-MM-DD","startDate"?,"endDate"?,"alarmMinutesBefore"?:0|5|10|15|30|60|1440,"motivation"?,"notes"?}
atualizar_tarefa: {"id","patch":{...campos da tarefa}}
lembrete_tarefa: {"id"|"name","minutesBefore": 0|5|10|15|30|60|1440|null}  // null = desativar lembrete; reagenda a notificação nativa
excluir_tarefa: {"id"} | duplicar_tarefa: {"id","date"?|"dates":[...]} | mover_tarefa: {"id","date","time"?}
concluir_tarefa: {"id","date"} | reabrir_tarefa: {"id","date"?} | arquivar_tarefa: {"id","restore"?:true}
registrar_transacao: {"kind":"receita|despesa","amount":number,"category":"alimentacao|transporte|moradia|saude|educacao|lazer|investimento|salario|outros","description"?,"paymentMethod"?,"notes"?,"date":"YYYY-MM-DD"}
atualizar_transacao: {"id","patch":{...}} | excluir_transacao: {"id"}
criar_meta: {"name","description"?,"deadline"?} | atualizar_meta: {"id","patch":{...}} | excluir_meta: {"id"}
criar_objetivo: {"goalId","name"} | concluir_objetivo: {"goalId","objectiveId"}
criar_livro: {"title","author"?,"category"?,"totalPages"?,"currentPage"?,"status":"quero-ler|lendo|concluido","startDate"?,"endDate"?,"comments"?,"quotes"?}
atualizar_livro: {"id"|"title","patch":{"title"?,"author"?,"category"?,"totalPages"?,"currentPage"?,"startDate"?,"endDate"?,"comments"?,"quotes"?,"rating"?,"summary"?,"learnings"?}}
excluir_livro: {"id"|"title"} | progresso_leitura: {"id"|"title","page":number} | status_livro: {"id"|"title","status":"quero-ler|lendo|concluido"}
sessao_leitura: {"id"|"title","minutes":number,"pagesRead"?,"date"?}
criar_habito: {"name","kind"?,"target"?,"deadline"?} | concluir_habito: {"id"} | excluir_habito: {"id"}
definir_minimo_diario: {"value":number}

LISTA DE COMPRAS (categorias: mercado|higiene|limpeza|bebidas|alimentacao|farmacia|casa|eletronicos|roupas|outros):
criar_lista_compras: {"name","date"?,"financeCategory"?,"items":[{"name","quantity"?,"unit"?,"estimatedPrice"?,"category"?,"notes"?}]}
adicionar_item_compras: {"listId"?|"list"?,"items":[{"name","quantity"?,"unit"?,"estimatedPrice"?,"category"?}]}   // sem listId usa a lista ativa
atualizar_item_compras: {"listId"?,"itemId"?|"item":"nome","patch":{"quantity"?,"unit"?,"estimatedPrice"?,"category"?,"name"?,"notes"?}}
remover_item_compras: {"listId"?,"itemId"?|"item":"nome"}
marcar_item_comprado: {"listId"?,"itemId"?|"item":"nome","purchased"?:true|false,"paidPrice"?:number}  // com paidPrice lança a despesa no financeiro automaticamente, sem duplicar
duplicar_lista_compras: {"listId"?,"name"?,"date"?} | finalizar_lista_compras: {"listId"?,"reabrir"?:true} | excluir_lista_compras: {"listId"}

REGRAS DE COMPRAS:
- "Cria uma lista com arroz, feijão..." -> UMA ação criar_lista_compras com todos os itens, cada um com categoria adequada.
- "Adiciona X na lista" sem citar lista -> adicionar_item_compras sem listId (usa a ativa). Se não existir lista nenhuma, crie uma antes.
- "Comprei arroz por R$ 25" -> marcar_item_comprado com paidPrice 25 (nunca use registrar_transacao junto: geraria duplicidade).
- Perguntas sobre a compra ("quanto já gastei", "o que falta") são respondidas com os dados de "compras" no contexto, sem ações.
- Para tarefa de compras, use criar_tarefa com nome "🛒 Fazer compras" e alarmMinutesBefore conforme pedido.

REGRA CRÍTICA DE DIAS DA SEMANA (nunca erre isso):
- weekdays usa 0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado.
- Se o usuário citar dia(s) da semana, use repetition "dias-especificos" com EXATAMENTE esses weekdays.
  "sábado às 9h" -> weekdays [6], time "09:00". "segunda, quarta e sexta" -> weekdays [1,3,5].
- Nunca coloque a tarefa em dias que o usuário não mencionou, e nunca use a data de hoje nesse caso.
- Se a frase tiver várias atividades, crie UMA ação criar_tarefa por atividade, sem misturar horários/dias.

Só use "id" que exista no contexto. Antes de excluir algo, confirme no "reply" o que será removido.
Responda em português, curto e prático. Formate valores como R$ 0,00.`;


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
