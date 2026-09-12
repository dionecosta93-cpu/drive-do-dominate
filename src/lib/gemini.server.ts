/**
 * Chamadas de baixo nível pra Gemini API (generateContent) usadas pelas 4 rotas
 * de IA. Server-only — nunca importe isto do lado cliente.
 */
import type { AiGateway } from "@/lib/ai-gateway";

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };
export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** JSON Schema (subset já usado no projeto) -> formato de schema da Gemini. */
interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: readonly string[];
}

export function toGeminiSchema(schema: JsonSchema): unknown {
  switch (schema.type) {
    case "object": {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        properties[key] = toGeminiSchema(value);
      }
      return { type: "OBJECT", properties, required: schema.required };
    }
    case "array":
      return { type: "ARRAY", items: toGeminiSchema(schema.items ?? { type: "string" }) };
    case "number":
      return { type: "NUMBER" };
    case "boolean":
      return { type: "BOOLEAN" };
    case "string":
    default:
      return { type: "STRING", ...(schema.enum ? { enum: schema.enum } : {}) };
  }
}

async function callGenerateContent(
  ai: AiGateway,
  model: string,
  body: Record<string, unknown>,
): Promise<{
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        audioTranscription?: { text?: string };
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
}> {
  const res = await fetch(`${ai.base}/models/${model}:generateContent?key=${ai.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`gemini_${res.status}: ${detail.slice(0, 400)}`);
  }
  return res.json();
}

/** Geração com saída JSON validada por schema (assistente, busca de livro). */
export async function geminiGenerateJson(
  ai: AiGateway,
  model: string,
  systemInstruction: string,
  contents: GeminiContent[],
  schema: unknown,
): Promise<string> {
  const json = await callGenerateContent(ai, model, {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: schema },
  });
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("gemini_empty_response");
  return text;
}

/** Transcrição de áudio (voz -> texto) via modelo multimodal. */
export async function geminiTranscribe(ai: AiGateway, model: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "audio/webm";
  const json = await callGenerateContent(ai, model, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcreva o áudio a seguir em português do Brasil. Responda só com o texto transcrito, sem comentários nem pontuação extra.",
          },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
  });
  const part = json.candidates?.[0]?.content?.parts?.[0];
  return (part?.audioTranscription?.text ?? part?.text ?? "").trim();
}

/** Texto -> fala (retorna um WAV pronto pra tocar). */
export async function geminiSynthesizeSpeech(
  ai: AiGateway,
  model: string,
  text: string,
  instructions: string,
  voiceName = "Charon",
): Promise<Buffer> {
  const json = await callGenerateContent(ai, model, {
    contents: [{ role: "user", parts: [{ text: `${instructions}\n\nTexto: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const part = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error("gemini_empty_audio");
  const pcm = Buffer.from(part.data, "base64");
  const rateMatch = part.mimeType?.match(/rate=(\d+)/);
  const rate = rateMatch ? Number(rateMatch[1]) : 24000;
  return pcmToWav(pcm, rate);
}

function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
