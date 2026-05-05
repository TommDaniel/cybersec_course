import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import { extractHints, logEvent } from "@/lib/audit";

// GET /api/profile — retorna o perfil do usuário fictício da sessão.
export async function GET(req: NextRequest) {
  const session = ensureSession();
  const hints = extractHints(req);

  logEvent(session, {
    type: "PROFILE_VIEW",
    method: "GET",
    path: "/api/profile",
    hints,
    suspicious: false,
  });

  return NextResponse.json(session.user);
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
  const session = ensureSession();
  const hints = extractHints(req);

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
  session.user = { ...session.user, ...(body as any) };

  // Coerção mínima para manter o tipo coerente (não é uma "correção", apenas
  // evita que o front quebre se o aluno enviar tipos errados).
  if (typeof session.user.isPremium !== "boolean") {
    session.user.isPremium = Boolean(session.user.isPremium);
  }
  if (session.user.isPremium) session.user.accountType = "premium";

  logEvent(session, {
    type: "PROFILE_UPDATE",
    method: "PATCH",
    path: "/api/profile",
    hints,
    fieldsSent,
    suspicious: sensitive,
    note: sensitive
      ? "Campo sensível enviado pelo cliente"
      : "Atualização comum de perfil",
  });

  return NextResponse.json({ ok: true, user: session.user });
}
