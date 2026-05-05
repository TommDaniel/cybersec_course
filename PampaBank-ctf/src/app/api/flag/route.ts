import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { extractHints, logEvent } from "@/lib/audit";

// GET /api/flag
// Só libera a flag se o usuário "for premium" — o que só acontece
// quando ele explora a falha de mass assignment no PATCH /api/profile.
export async function GET(req: NextRequest) {
  const session = ensureSession();
  const hints = extractHints(req);

  if (!session.user.isPremium) {
    logEvent(session, {
      type: "FLAG_ATTEMPT",
      method: "GET",
      path: "/api/flag",
      hints,
      suspicious: false,
      note: "Tentativa de pegar a flag sem ser premium",
    });
    return NextResponse.json(
      {
        error:
          "Acesso negado. Apenas clientes premium podem acessar esta área.",
      },
      { status: 403 },
    );
  }

  logEvent(session, {
    type: "FLAG_SUCCESS",
    method: "GET",
    path: "/api/flag",
    hints,
    suspicious: true,
    note: "Flag entregue após escalonamento de privilégio via mass assignment",
  });

  return NextResponse.json({
    flag: "CTF{never_trust_the_client}",
    message: "Parabéns, você concluiu a primeira etapa.",
  });
}
