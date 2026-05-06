import { NextRequest, NextResponse } from "next/server";
import { readState, writeState } from "@/lib/state";
import { logEvent } from "@/lib/audit";

// GET /api/profile — retorna o perfil do usuário fictício da sessão.
export async function GET(_req: NextRequest) {
  const state = await readState();

  logEvent(state, {
    type: "PROFILE_VIEW",
    method: "GET",
    path: "/api/profile",
    suspicious: false,
  });

  await writeState(state);
  return NextResponse.json(state.user);
}

// PATCH /api/profile
//
// 🚨 VULNERABILIDADE PROPOSITAL: Mass Assignment 🚨
//
// O frontend só envia { "name": "Novo Nome" }, mas o backend faz
//   user = { ...user, ...body }
// e portanto aceita qualquer campo do JSON, inclusive
//   { "isPremium": true }
// que deveria ser controlado apenas pelo servidor.
//
// CORREÇÃO SEGURA (ver /learn e README):
//   const safe = { name: typeof body.name === "string" ? body.name : user.name };
//   user = { ...user, ...safe };
//
// Mantemos a versão insegura aqui de propósito, com este aviso visível,
// porque o objetivo do CTF é ensinar o aluno a encontrar exatamente isto.
export async function PATCH(req: NextRequest) {
  const state = await readState();

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const fieldsSent = Object.keys(body);
  const sensitive = fieldsSent.some((f) =>
    ["isPremium", "accountType", "id", "email"].includes(f),
  );

  // ⚠️ Linha vulnerável de propósito — espelha o erro real "mass assignment".
  state.user = { ...state.user, ...(body as any) };

  // Coerção mínima para manter o tipo coerente (não é uma "correção", apenas
  // evita que o front quebre se o aluno enviar tipos errados).
  if (typeof state.user.isPremium !== "boolean") {
    state.user.isPremium = Boolean(state.user.isPremium);
  }
  if (state.user.isPremium) state.user.accountType = "premium";

  logEvent(state, {
    type: "PROFILE_UPDATE",
    method: "PATCH",
    path: "/api/profile",
    fieldsSent,
    suspicious: sensitive,
    note: sensitive
      ? "Campo sensível enviado pelo cliente"
      : "Atualização comum de perfil",
  });

  await writeState(state);
  return NextResponse.json({ ok: true, user: state.user });
}
