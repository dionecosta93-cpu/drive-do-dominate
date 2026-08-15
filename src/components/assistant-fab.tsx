import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { applyAssistantAction, buildAssistantContext, type AssistantAction } from "@/lib/assistant-actions";
import { WavRecorder } from "@/lib/wav-recorder";
import { Bot, Mic, Send, Square, X, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<AssistantAction[]>([]);
  const recorder = useRef<WavRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useStore((s) => s.assistantMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChat = useStore((s) => s.clearChat);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages.length, busy]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    addChatMessage({ role: "user", content: clean });
    setBusy(true);
    setPending([]);
    try {
      const history = useStore
        .getState()
        .assistantMessages.slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context: buildAssistantContext() }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error("Muitas solicitações. Tente em instantes.");
        if (res.status === 402) throw new Error("Créditos de IA esgotados.");
        throw new Error((detail as { error?: string }).error ?? "Falha na IA");
      }
      const data = (await res.json()) as { reply: string; actions?: AssistantAction[] };
      addChatMessage({ role: "assistant", content: data.reply });
      setPending(Array.isArray(data.actions) ? data.actions : []);
    } catch (e) {
      addChatMessage({
        role: "assistant",
        content: `Não consegui responder agora. ${e instanceof Error ? e.message : ""}`.trim(),
      });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const toggleMic = async () => {
    if (busy) return;
    if (recording) {
      setRecording(false);
      try {
        const { blob, filename } = await recorder.current!.stop();
        recorder.current = null;
        if (blob.size < 1024) return toast.error("Gravação vazia. Fale mais perto do microfone.");
        setBusy(true);
        const form = new FormData();
        form.append("file", blob, filename);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        setBusy(false);
        if (!res.ok) return toast.error("Não consegui entender o áudio.");
        const { text } = (await res.json()) as { text: string };
        if (!text.trim()) return toast.error("Nada foi captado.");
        void send(text);
      } catch {
        setBusy(false);
        toast.error("Erro ao processar o áudio.");
      }

      return;
    }
    try {
      recorder.current = new WavRecorder();
      await recorder.current.start();
      setRecording(true);
    } catch {
      toast.error("Permita o acesso ao microfone.");
    }
  };

  const applyAll = () => {
    const results = pending.map((a) => applyAssistantAction(a));
    setPending([]);
    toast.success(results[0] ?? "Ações aplicadas.");
    addChatMessage({ role: "assistant", content: `✅ ${results.join(" · ")}` });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente de IA"
        className="fixed right-4 bottom-20 z-50 size-14 rounded-full bg-discipline text-black shadow-[0_0_24px_rgba(34,197,94,0.45)] flex items-center justify-center active:scale-95 transition"
      >
        <Bot className="size-7" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col">
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-discipline/15 border border-discipline/30 flex items-center justify-center">
                <Bot className="size-4 text-discipline" />
              </span>
              <div>
                <h2 className="font-heading font-extrabold uppercase text-sm leading-none">Assistente</h2>
                <p className="text-[10px] text-muted-foreground">Tarefas · Agenda · Finanças</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { clearChat(); setPending([]); }} className="p-2 text-muted-foreground" aria-label="Limpar conversa">
                <Trash2 className="size-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 text-muted-foreground" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-3 pt-6">
                <p className="font-heading font-bold text-foreground uppercase">Fale comigo.</p>
                <p>Exemplos:</p>
                <ul className="space-y-1 text-xs">
                  <li>• “Criar treino de força amanhã às 6h com alarme 15 min antes”</li>
                  <li>• “Gastei 45 reais no almoço hoje”</li>
                  <li>• “Como estão minhas finanças este mês?”</li>
                  <li>• “Reorganize minha agenda de hoje”</li>
                </ul>
              </div>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ) : (
                <p key={m.id} className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </p>
              ),
            )}
            {busy && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Pensando...
              </p>
            )}

            {pending.length > 0 && (
              <div className="bg-surface border border-discipline/30 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-discipline">
                  Autorizar ações
                </span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {pending.map((a, i) => (
                    <li key={i}>• {a.label}</li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-1">
                  <button onClick={applyAll} className="flex-1 flex items-center justify-center gap-1 bg-discipline text-black rounded-xl py-2 text-xs font-bold uppercase">
                    <Check className="size-4" /> Autorizar
                  </button>
                  <button onClick={() => setPending([])} className="px-4 rounded-xl border border-border text-xs font-bold uppercase text-muted-foreground">
                    Descartar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={recording ? "Gravando..." : "Escreva ou fale..."}
              className="flex-1 resize-none bg-surface border border-border rounded-2xl px-4 py-3 text-sm max-h-32 focus:outline-none focus:border-discipline"
            />
            <button
              onClick={() => void toggleMic()}
              aria-label={recording ? "Parar gravação" : "Gravar áudio"}
              className={`size-11 shrink-0 rounded-2xl flex items-center justify-center border ${
                recording ? "bg-struggle text-white border-struggle animate-pulse" : "bg-surface border-border text-muted-foreground"
              }`}
            >
              {recording ? <Square className="size-4" /> : <Mic className="size-5" />}
            </button>
            <button
              onClick={() => void send(input)}
              disabled={busy || !input.trim()}
              aria-label="Enviar"
              className="size-11 shrink-0 rounded-2xl bg-discipline text-black flex items-center justify-center disabled:opacity-40"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
