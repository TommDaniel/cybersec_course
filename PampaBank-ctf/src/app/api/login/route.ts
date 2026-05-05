import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { extractHints, logEvent } from "@/lib/audit";

// POST /api/login
// Login fictício: aceita apenas as credenciais de demonstração.
// Não há banco de dados; a sessão é apenas um cookie aleatório.

const DEMO_EMAIL = "aluno@pampabank.ctf";
const DEMO_PASSWORD = "ctf123";

export async function POST(req: NextRequest) {
  const session = ensureSession();
  const hints = extractHints(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = String(body?.email ?? "");
  const password = String(body?.password ?? "");
  const ok = email === DEMO_EMAIL && password === DEMO_PASSWORD;

  logEvent(session, {
    type: "LOGIN",
    method: "POST",
    path: "/api/login",
    hints,
    fieldsSent: Object.keys(body ?? {}),
    suspicious: !ok,
    note: ok ? "Login bem-sucedido" : "Credenciais inválidas",
  });

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
