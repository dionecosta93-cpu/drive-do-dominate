// Gera os sons de alarme embutidos no app (sem depender de internet/licenças externas).
// Rode uma vez (node scripts/gen-alarm-sounds.mjs) sempre que quiser regenerar/ajustar.
// Saída: public/sounds/*.wav (preview no app) e android/app/src/main/res/raw/*.wav (canal nativo).
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RATE = 22050;

function tone(freqHz, durationSec, amplitude = 0.5) {
  const n = Math.round(RATE * durationSec);
  const out = new Int16Array(n);
  const attack = Math.min(0.02, durationSec / 4);
  const release = Math.min(0.05, durationSec / 4);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let env = 1;
    if (t < attack) env = t / attack;
    else if (t > durationSec - release) env = Math.max(0, (durationSec - t) / release);
    out[i] = Math.round(Math.sin(2 * Math.PI * freqHz * t) * amplitude * env * 32767);
  }
  return out;
}

function silence(durationSec) {
  return new Int16Array(Math.round(RATE * durationSec));
}

function concat(parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Int16Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function toWav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(samples[i], 44 + i * 2);
  return buf;
}

const sounds = {
  // Duas notas suaves e curtas, sem pressa.
  alarm_suave: concat([tone(660, 0.35, 0.35), silence(0.12), tone(880, 0.45, 0.35)]),
  // Três bipes clássicos de despertador, espaçados.
  alarm_classico: concat([
    tone(800, 0.18, 0.5),
    silence(0.12),
    tone(800, 0.18, 0.5),
    silence(0.12),
    tone(800, 0.18, 0.5),
  ]),
  // Bipes rápidos e agudos, sensação de urgência.
  alarm_urgente: concat([
    tone(1200, 0.1, 0.6),
    silence(0.06),
    tone(1200, 0.1, 0.6),
    silence(0.06),
    tone(1200, 0.1, 0.6),
    silence(0.06),
    tone(1400, 0.14, 0.6),
  ]),
};

const webDir = join("public", "sounds");
const nativeDir = join("android", "app", "src", "main", "res", "raw");
mkdirSync(webDir, { recursive: true });
mkdirSync(nativeDir, { recursive: true });

for (const [name, samples] of Object.entries(sounds)) {
  const wav = toWav(samples);
  writeFileSync(join(webDir, `${name}.wav`), wav);
  writeFileSync(join(nativeDir, `${name}.wav`), wav);
  console.log(`gerado: ${name}.wav (${(wav.length / 1024).toFixed(1)} KB)`);
}
