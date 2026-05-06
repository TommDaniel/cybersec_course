import { NextRequest, NextResponse } from "next/server";
import { readState, writeState } from "@/lib/state";
import { logEvent } from "@/lib/audit";

// GET /api/flag
// Só libera a flag se o usuário "for premium" — o que só acontece
// quando ele explora a falha de mass assignment no PATCH /api/profile.
export async function GET(_req: NextRequest) {
  const state = await readState();

  if (!state.user.isPremium) {
    logEvent(state, {
      type: "FLAG_ATTEMPT",
      method: "GET",
      path: "/api/flag",
      suspicious: false,
      note: "Tentativa de pegar a flag sem ser premium",
    });
    await writeState(state);
    return NextResponse.json(
      {
        error:
          "Acesso negado. Apenas clientes premium podem acessar esta área.",
      },
      { status: 403 },
    );
  }

  logEvent(state, {
    type: "FLAG_SUCCESS",
    method: "GET",
    path: "/api/flag",
    suspicious: true,
    note: "Flag entregue após escalonamento de privilégio via mass assignment",
  });

  await writeState(state);
  return NextResponse.json({
    flag: "CTF{never_trust_the_client}",
    message: "Parabéns, você concluiu a primeira etapa.",
  });
}
