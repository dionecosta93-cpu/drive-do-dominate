#!/usr/bin/env node
// Libera/troca o plano de um usuário manualmente (sem gateway de pagamento).
// Uso: node scripts/set-plan.mjs <email> <free|pro|premium> [manual|trial|pagamento]
//
// Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env (ou do ambiente).
// Só roda server-side / na sua máquina — nunca exponha a service role key ao cliente.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadDotEnv() {
  try {
    const content = readFileSync(".env", "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* sem .env local: segue só com o ambiente já exportado */
  }
}
loadDotEnv();

const [, , email, plan, source = "manual"] = process.argv;
const VALID_PLANS = ["free", "pro", "premium"];
const VALID_SOURCES = ["manual", "trial", "pagamento"];

if (!email || !VALID_PLANS.includes(plan)) {
  console.error(
    "Uso: node scripts/set-plan.mjs <email> <free|pro|premium> [manual|trial|pagamento]",
  );
  process.exit(1);
}
if (!VALID_SOURCES.includes(source)) {
  console.error(`origem inválida: ${source}. Use uma de: ${VALID_SOURCES.join(", ")}`);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env/ambiente.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) break;
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`Nenhum usuário encontrado com o e-mail ${email}.`);
  process.exit(1);
}

const { error } = await admin
  .from("user_plans")
  .upsert(
    { user_id: user.id, plan, source, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

if (error) {
  console.error("Falha ao atualizar o plano:", error.message);
  process.exit(1);
}

console.log(`OK: ${email} agora está no plano "${plan}" (origem: ${source}).`);
