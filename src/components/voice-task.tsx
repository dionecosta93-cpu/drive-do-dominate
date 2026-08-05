import { useRef, useState } from "react";
import { Mic, Loader2, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface ParsedTask {
  intent?: "criar" | "atualizar" | "excluir" | "duplicar" | "pausar";
  confidence?: number;
  summary?: string;
  task?: Record<string, unknown>;
  changes?: { time?: string | null; date?: string | null; pauseDays?: number | null };
}

type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

const getRecognition = (): Recognizer | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

export function VoiceTask({ onApply }: { onApply: (parsed: ParsedTask) => void }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const recRef = useRef<Recognizer | null>(null);

  const startListening = () => {
    const rec = getRecognition();
    if (!rec) {
      toast.error("Seu navegador não suporta ditado. Digite o comando abaixo.");
      setOpen(true);
      return;
    }
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i]?.[0]?.transcript ?? "";
      setTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setTranscript("");
    setPreview(null);
    setOpen(true);
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const interpret = async () => {
    if (!transcript.trim()) {
      toast.error("Fale ou escreva o comando primeiro.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error === "ai_failed" ? "IA indisponível no momento." : "Não consegui interpretar.");
        return;
      }
      setPreview((await res.json()) as ParsedTask);
    } catch {
      toast.error("Falha de conexão com a IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={startListening}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-info/40 bg-info/10 text-info text-xs font-bold uppercase tracking-widest active:scale-[0.98] transition"
      >
        <Mic className="size-4" /> Criar por voz com IA
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-surface border border-border rounded-2xl p-5 max-h-[85vh] overflow-y-auto animate-rise">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-info" />
              <h3 className="font-heading font-black uppercase text-sm">Assistente de voz</h3>
            </div>

            <div className="grid place-items-center py-4">
              <button
                onClick={listening ? stopListening : startListening}
                className={`size-20 rounded-full grid place-items-center border-2 transition ${
                  listening
                    ? "border-struggle bg-struggle/15 text-struggle animate-pulse"
                    : "border-info bg-info/10 text-info"
                }`}
                aria-label={listening ? "Parar" : "Falar"}
              >
                {listening ? <Square className="size-7" fill="currentColor" /> : <Mic className="size-8" />}
              </button>
              <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-widest">
                {listening ? "Ouvindo..." : "Toque para falar"}
              </p>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder='Ex.: "Segunda, quarta e sexta às 19 horas treinar Muay Thai durante uma hora."'
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-info"
            />

            {preview && (
              <div className="mt-4 border border-discipline/30 bg-discipline/5 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-discipline mb-2">
                  Prévia — confirme antes de aplicar
                </p>
                {preview.summary && <p className="text-xs mb-2 text-pretty">{preview.summary}</p>}
                <div className="space-y-1 text-[11px] font-mono">
                  {Object.entries(preview.task ?? {})
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-right truncate">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                      </div>
                    ))}
                </div>
                {preview.intent && preview.intent !== "criar" && (
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-warning">
                    Comando detectado: {preview.intent}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { stopListening(); setOpen(false); }}
                className="flex-1 py-3 rounded-xl border border-border text-muted-foreground text-xs font-bold uppercase"
              >
                Fechar
              </button>
              {!preview ? (
                <button
                  onClick={interpret}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-info text-black text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Interpretar
                </button>
              ) : (
                <button
                  onClick={() => { onApply(preview); setOpen(false); setPreview(null); toast.success("Campos preenchidos pela IA."); }}
                  className="flex-1 py-3 rounded-xl bg-discipline text-black text-xs font-bold uppercase"
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
