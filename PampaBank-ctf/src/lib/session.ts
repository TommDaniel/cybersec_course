// Tiny cookie-based session helper.
//
// We do NOT use real JWTs, signed cookies or password hashing here on purpose:
// the CTF is meant to be poked at with DevTools and Burp. The session id is
// just an opaque random string used as a key in the in-memory store.

import { cookies } from "next/headers";
import { getOrCreateSession, type SessionState } from "./store";

const COOKIE_NAME = "pampabank_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

function randomId(): string {
  // Random hex via Web Crypto — available on Vercel / Node 20+.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function readSessionId(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function ensureSession(): SessionState {
  const existing = readSessionId();
  if (existing) return getOrCreateSession(existing);

  const id = randomId();
  cookies().set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return getOrCreateSession(id);
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}
