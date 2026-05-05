import { NextRequest, NextResponse } from "next/server";
import { ensureSession } from "@/lib/session";
import {
  extractHints,
  logEvent,
} from "@/lib/audit";
import { computeRiskScore, sensitiveFieldsTouched } from "@/lib/store";

// GET /api/audit/me
// Resumo dos rastros que o aluno deixou na sessão atual.
// Usado tanto pela página /audit quanto como conteúdo educativo —
// mostrar exatamente o que um servidor "vê" sem nenhum truque adicional.
export async function GET(req: NextRequest) {
  const session = ensureSession();
  const hints = extractHints(req);

  logEvent(session, {
    type: "AUDIT_VIEW",
    method: "GET",
    path: "/api/audit/me",
    hints,
    suspicious: false,
  });

  const events = session.events;
  const riskScore = computeRiskScore(events);
  const sensitive = sensitiveFieldsTouched(events);
  const suspiciousEvents = events.filter((e) => e.suspicious).length;

  return NextResponse.json({
    sessionId: `sess_${session.sessionId.slice(0, 8)}`,
    riskScore,
    summary: {
      totalRequests: events.length,
      suspiciousEvents,
      sensitiveFieldsTouched: sensitive,
    },
    clientHints: {
      userAgent: hints.userAgent,
      language: hints.language,
      ipApprox: hints.ipApprox,
      referer: hints.referer,
      origin: hints.origin,
    },
    events: events.map((e) => ({
      type: e.type,
      method: e.method,
      path: e.path,
      time: e.time,
      fieldsSent: e.fieldsSent,
      suspicious: e.suspicious,
      note: e.note,
    })),
  });
}
