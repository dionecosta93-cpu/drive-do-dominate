/**
 * Proteção leve para as rotas /api/* que consomem a chave de IA (custo real).
 * Não substitui autenticação completa — barra abuso casual/cross-site e limita
 * a taxa por IP. Sem dependências, sem estado externo.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Retorna uma `Response` de erro se a requisição deve ser bloqueada, senão `null`. */
export function guardApiRequest(request: Request): Response | null {
  // 1. Mesma origem: se veio um Origin, precisa bater com o host do request.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return Response.json({ error: "forbidden_origin" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "bad_origin" }, { status: 400 });
    }
  }

  // 2. Rate limit por IP (janela fixa em memória).
  const ip = clientIp(request);
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (b.count >= MAX_PER_WINDOW) {
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } },
    );
  } else {
    b.count += 1;
  }

  // Limpeza oportunista para o Map não crescer sem limite.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }

  return null;
}
