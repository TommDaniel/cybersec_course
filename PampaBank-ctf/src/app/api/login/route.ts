import { NextRequest, NextResponse } from "next/server";
import { readState, writeState } from "@/lib/state";
import { logEvent } from "@/lib/audit";

// POST /api/login
// Login fictício: aceita apenas as credenciais de demonstração.
// Não há banco de dados; o estado é uma cookie assinada (HMAC).

const DEMO_EMAIL = "aluno@pampabank.ctf";
const DEMO_PASSWORD = "ctf123";

export async function POST(req: NextRequest) {
  const state = await readState();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = String(body?.email ?? "");
  const password = String(body?.password ?? "");
  const ok = email === DEMO_EMAIL && password === DEMO_PASSWORD;

  logEvent(state, {
    type: "LOGIN",
    method: "POST",
    path: "/api/login",
    fieldsSent: Object.keys(body ?? {}),
    suspicious: !ok,
    note: ok ? "Login bem-sucedido" : "Credenciais inválidas",
  });

  await writeState(state);

  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Credenciais inválidas." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    token: "fake-training-token",
  });
}
