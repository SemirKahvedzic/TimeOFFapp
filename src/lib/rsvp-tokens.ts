import crypto from "crypto";

/**
 * Stateless HMAC-signed RSVP tokens. The token encodes meeting + user + action
 * and is signed with NEXTAUTH_SECRET. No DB row to track, but expires after
 * 30 days to limit replay risk.
 *
 * Format: <base64url(payload)>.<base64url(signature)>
 * Payload JSON: { m: meetingId, u: userId, a: "accepted"|"declined", e: expiryEpochMs }
 */

const SECRET =
  process.env.NEXTAUTH_SECRET ?? "fallback-dev-secret-do-not-use-in-prod";

export type RsvpAction = "accepted" | "declined";

interface RsvpPayload {
  m: string;
  u: string;
  a: RsvpAction;
  e: number;
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60_000;

export function signRsvpToken(
  meetingId: string,
  userId: string,
  action: RsvpAction,
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const payload: RsvpPayload = { m: meetingId, u: userId, a: action, e: Date.now() + ttlMs };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sigB64  = crypto.createHmac("sha256", SECRET).update(dataB64).digest("base64url");
  return `${dataB64}.${sigB64}`;
}

export function verifyRsvpToken(token: string): RsvpPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Malformed token");
  const [dataB64, sigB64] = parts;

  const expected = crypto.createHmac("sha256", SECRET).update(dataB64).digest();
  const actual   = Buffer.from(sigB64, "base64url");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Invalid signature");
  }

  let payload: RsvpPayload;
  try {
    payload = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf-8")) as RsvpPayload;
  } catch {
    throw new Error("Malformed payload");
  }

  if (payload.e < Date.now()) throw new Error("Token expired");
  if (payload.a !== "accepted" && payload.a !== "declined") throw new Error("Invalid action");
  if (typeof payload.m !== "string" || typeof payload.u !== "string") throw new Error("Invalid payload");
  return payload;
}
