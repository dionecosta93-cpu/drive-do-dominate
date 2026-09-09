export interface Recording {
  blob: Blob;
  filename: string;
}

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const extFor = (mime: string) =>
  mime.includes("webm")
    ? "webm"
    : mime.includes("mp4")
      ? "m4a"
      : mime.includes("ogg")
        ? "ogg"
        : "wav";

/**
 * Records microphone audio. Uses MediaRecorder when available (Android WebView,
 * mobile Safari 14.3+, Chrome) and falls back to a WAV encoder built on
 * ScriptProcessorNode for browsers without it.
 */
export class WavRecorder {
  private stream: MediaStream | null = null;
  private media: MediaRecorder | null = null;
  private mediaChunks: Blob[] = [];
  private mime = "";

  // WAV fallback
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Float32Array[] = [];

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("mic_unsupported");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    const supported =
      typeof MediaRecorder !== "undefined"
        ? MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m))
        : undefined;

    if (supported) {
      this.mime = supported;
      this.mediaChunks = [];
      this.media = new MediaRecorder(this.stream, { mimeType: supported });
      this.media.ondataavailable = (e) => {
        if (e.data.size > 0) this.mediaChunks.push(e.data);
      };
      this.media.start(250);
      return;
    }

    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.node.onaudioprocess = (e) => {
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    this.source.connect(this.node);
    this.node.connect(this.ctx.destination);
  }

  async stop(): Promise<Recording> {
    if (this.media) {
      const rec = this.media;
      const blob = await new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(this.mediaChunks, { type: this.mime }));
        if (rec.state !== "inactive") rec.stop();
        else resolve(new Blob(this.mediaChunks, { type: this.mime }));
      });
      this.stream?.getTracks().forEach((t) => t.stop());
      this.media = null;
      this.stream = null;
      this.mediaChunks = [];
      return { blob, filename: `recording.${extFor(this.mime)}` };
    }

    const rate = this.ctx?.sampleRate ?? 44100;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node?.disconnect();
    this.source?.disconnect();
    const data = this.chunks;
    this.chunks = [];
    await this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    return { blob: encodeWav(data, rate), filename: "recording.wav" };
  }
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) out[i] = input[Math.floor(i * ratio)] ?? 0;
  return out;
}

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const target = 16000;
  const samples = downsample(merged, sampleRate, target);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, target, true);
  view.setUint32(28, target * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let pos = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(pos, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    pos += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}
