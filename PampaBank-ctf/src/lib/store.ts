// In-memory store for the PampaBank CTF.
//
// IMPORTANT — educational disclaimer:
// This is a fully fictional fintech used as a teaching environment.
// We do NOT persist real user data. Everything lives in memory and resets
// when the server restarts (and per serverless instance on Vercel).
//
// We keep a per-session "user" object plus a list of audit events.
// Sessions are identified by a cookie value (see session.ts).

export type CtfUser = {
  id: number;
  name: string;
  email: string;
  accountType: "basic" | "premium";
  isPremium: boolean;
};

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
  userAgent?: string;
  language?: string;
  ipApprox?: string;
  referer?: string;
  origin?: string;
  fieldsSent?: string[];
  suspicious: boolean;
  note?: string;
};

export type SessionState = {
  sessionId: string;
  createdAt: string;
  user: CtfUser;
  events: AuditEvent[];
};

// Default profile shape — every new session starts here.
export function freshUser(): CtfUser {
  return {
    id: 1,
    name: "Aluno CTF",
    email: "aluno@pampabank.ctf",
    accountType: "basic",
    isPremium: false,
  };
}

// Keep the store on globalThis so Next.js dev mode hot-reload preserves it.
type Store = Map<string, SessionState>;
const globalForStore = globalThis as unknown as { __pampabankStore?: Store };
export const store: Store = globalForStore.__pampabankStore ?? new Map();
if (!globalForStore.__pampabankStore) globalForStore.__pampabankStore = store;

export function getOrCreateSession(sessionId: string): SessionState {
  let s = store.get(sessionId);
  if (!s) {
    s = {
      sessionId,
      createdAt: new Date().toISOString(),
      user: freshUser(),
      events: [],
    };
    store.set(sessionId, s);
  }
  return s;
}

// Crude risk score — purely didactic. Real systems blend signals,
// time windows, baseline behavior, etc. Here we just count suspicion.
export function computeRiskScore(events: AuditEvent[]): number {
  if (events.length === 0) return 0;
  const suspiciousCount = events.filter((e) => e.suspicious).length;
  const flagSuccess = events.some((e) => e.type === "FLAG_SUCCESS");
  const sensitiveTouched = events.some(
    (e) => e.fieldsSent?.includes("isPremium") || e.fieldsSent?.includes("accountType"),
  );

  let score = Math.min(20 + suspiciousCount * 18, 90);
  if (sensitiveTouched) score += 5;
  if (flagSuccess) score += 5;
  return Math.min(score, 99);
}

export function sensitiveFieldsTouched(events: AuditEvent[]): string[] {
  const set = new Set<string>();
  for (const e of events) {
    for (const f of e.fieldsSent ?? []) {
      if (["isPremium", "accountType", "id", "email"].includes(f)) set.add(f);
    }
  }
  return Array.from(set);
}
