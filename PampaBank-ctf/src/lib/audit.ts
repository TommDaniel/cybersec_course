// Audit log helper.
//
// Each API route calls logEvent() with metadata extracted from the request.
// We deliberately collect only what a normal HTTP server already sees:
//   - method + path
//   - user-agent, accept-language
//   - referer, origin
//   - approximate IP (last octet masked)
//
// We do NOT use device fingerprinting, geolocation APIs, canvas tricks
// or any invasive technique. The point is to show students that even
// "boring" request metadata already paints a recognisable trail.

import type { NextRequest } from "next/server";
import type { State } from "./state";

export type AuditEvent = {
  type:
    | "LOGIN"
    | "PROFILE_VIEW"
    | "PROFILE_UPDATE"
    | "FLAG_ATTEMPT"
    | "FLAG_SUCCESS"
    | "AUDIT_VIEW";
  method: string;
  path: string;
  time: string;
  fieldsSent?: string[];
  suspicious: boolean;
  note?: string;
};

export type RequestHints = {
  userAgent: string;
  language: string;
  ipApprox: string;
  referer: string;
  origin: string;
};

export function extractHints(req: NextRequest): RequestHints {
  const h = req.headers;
  const ua = h.get("user-agent") ?? "unknown";
  const lang = (h.get("accept-language") ?? "unknown").split(",")[0]!.trim();
  const referer = h.get("referer") ?? "";
  const origin = h.get("origin") ?? "";

  // Approximate IP: take the first one in x-forwarded-for, mask the last octet.
  // This is intentionally fuzzy — the lesson is "metadata is enough to profile",
  // not "let's geolocate the student precisely".
  const fwd = h.get("x-forwarded-for") ?? "";
  const rawIp = fwd.split(",")[0]?.trim() || "127.0.0.1";
  const ipApprox = maskIp(rawIp);

  return { userAgent: ua, language: lang, ipApprox, referer, origin };
}

function maskIp(ip: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return ip.slice(0, 8) + "::xxxx";
}

export type LogInput = {
  type: AuditEvent["type"];
  method: string;
  path: string;
  fieldsSent?: string[];
  suspicious?: boolean;
  note?: string;
};

export function logEvent(state: State, input: LogInput): AuditEvent {
  const event: AuditEvent = {
    type: input.type,
    method: input.method,
    path: input.path,
    time: new Date().toISOString(),
    fieldsSent: input.fieldsSent,
    suspicious: input.suspicious ?? false,
    note: input.note,
  };
  state.events.push(event);
  return event;
}
