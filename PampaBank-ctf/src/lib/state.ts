// Signed-cookie state.
//
// Why this exists:
// In serverless (Vercel), each function instance has its own memory. If we
// stored the user's `isPremium` in a `Map` keyed by a session id, two
// requests from the same student could land on different instances and the
// second one would see a fresh basic profile — losing the CTF progress.
//
// Solution: put the entire state INSIDE the cookie, signed with HMAC so the
// student can't forge `isPremium: true` directly (that would skip the actual
// challenge). Mass assignment via PATCH /api/profile remains the intended
// path because the server still mutates the user object server-side and
// re-signs.

import { cookies } from "next/headers";
import type { AuditEvent } from "./audit";

const COOKIE_NAME = "pampabank_state";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h
const MAX_EVENTS = 15; // keeps cookie comfortably under 4KB
const STATE_VERSION = 1;

export type CtfUser = {
  id: number;
  name: string;
  email: string;
  accountType: "basic" | "premium";
  isPremium: boolean;
};

export type State = {
  v: number;
  sid: string;
  user: CtfUser;
  events: AuditEvent[];
};

export function freshUser(): CtfUser {
  return {
    id: 1,
    name: "Aluno CTF",
    email: "aluno@pampabank.ctf",
    accountType: "basic",
    isPremium: false,
  };
}

function freshState(): State {
  return {
    v: STATE_VERSION,
    sid: randomId(),
    user: freshUser(),
    events: [],
  };
}

function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// In a real app the secret would always come from env. The fallback exists
// only so the CTF runs out of the box in a fresh deploy or local clone.
// Anyone deploying for class use should set PAMPABANK_SECRET in Vercel.
const SECRET =
  process.env.PAMPABANK_SECRET ||
  "pampabank-ctf-default-secret-please-override-in-production";

const enc = new TextEncoder();
const dec = new TextDecoder();

let signingKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (signingKey) return signingKey;
  signingKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return signingKey;
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlFromBytes(new Uint8Array(sig));
}

async function verify(payload: string, signature: string): Promise<boolean> {
  try {
    const key = await getKey();
    return await crypto.subtle.verify(
      "HMAC",
      key,
      bytesFromB64url(signature),
      enc.encode(payload),
    );
  } catch {
    return false;
  }
}

async function encodeState(state: State): Promise<string> {
  const json = JSON.stringify(state);
  const payload = b64urlFromBytes(enc.encode(json));
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function decodeState(raw: string): Promise<State | null> {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  if (!(await verify(payload, signature))) return null;
  try {
    const json = dec.decode(bytesFromB64url(payload));
    const parsed = JSON.parse(json) as State;
    if (parsed.v !== STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Read state from the cookie. Returns a fresh state if missing or invalid.
// Note: this DOES NOT write the cookie back. Routes that mutate state must
// call writeState() at the end.
export async function readState(): Promise<State> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return freshState();
  const decoded = await decodeState(raw);
  return decoded ?? freshState();
}

export async function writeState(state: State): Promise<void> {
  // Trim events so the cookie never blows the 4KB browser limit.
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
  const value = await encodeState(state);
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

// Helpers used by /audit + summary card.
export function computeRiskScore(events: AuditEvent[]): number {
  if (events.length === 0) return 0;
  const suspiciousCount = events.filter((e) => e.suspicious).length;
  const flagSuccess = events.some((e) => e.type === "FLAG_SUCCESS");
  const sensitiveTouched = events.some(
    (e) =>
      e.fieldsSent?.includes("isPremium") ||
      e.fieldsSent?.includes("accountType"),
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
