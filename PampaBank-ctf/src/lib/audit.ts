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
import type { AuditEvent, SessionState } from "./store";

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
  // IPv4: keep first three octets, mask last as xxx
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  // IPv6 or unknown: keep prefix only
  return ip.slice(0, 8) + "::xxxx";
}

export type LogInput = {
  type: AuditEvent["type"];
  method: string;
  path: string;
  hints: RequestHints;
  fieldsSent?: string[];
  suspicious?: boolean;
  note?: string;
};

const MAX_EVENTS = 50;

export function logEvent(session: SessionState, input: LogInput): AuditEvent {
  const event: AuditEvent = {
    type: input.type,
    method: input.method,
    path: input.path,
    time: new Date().toISOString(),
    userAgent: input.hints.userAgent,
    language: input.hints.language,
    ipApprox: input.hints.ipApprox,
    referer: input.hints.referer,
    origin: input.hints.origin,
    fieldsSent: input.fieldsSent,
    suspicious: input.suspicious ?? false,
    note: input.note,
  };
  session.events.push(event);
  if (session.events.length > MAX_EVENTS) {
    session.events.splice(0, session.events.length - MAX_EVENTS);
  }
  return event;
}
