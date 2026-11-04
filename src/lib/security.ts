import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db, serverlessHost } from "./db";
import type { PublicUser } from "./types";
let ephemeralSecret: string | undefined;
export function siteUrl() {
  const configured = process.env.SITE_URL || process.env.URL;
  return (configured || "http://127.0.0.1:3100").replace(/\/$/, "");
}
function sessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (ephemeralSecret) return ephemeralSecret;
  if (process.env.DEMO_MODE === "true" || serverlessHost()) {
    const file = "/tmp/forme-session-secret";
    try {
      const existing = readFileSync(file, "utf8").trim();
      if (existing.length >= 32) {
        ephemeralSecret = existing;
        return existing;
      }
    } catch {
      /* The live instance has not created a demo secret yet. */
    }
    const created = randomBytes(48).toString("base64url");
    try {
      writeFileSync(file, created, { mode: 0o600 });
    } catch {
      /* Keep the secret in memory when the temp directory is unavailable. */
    }
    ephemeralSecret = created;
    return created;
  }
  throw new Error(
    "SESSION_SECRET must be configured with at least 32 random characters",
  );
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  return (
    !!key &&
    key.length === 128 &&
    timingSafeEqual(candidate, Buffer.from(key, "hex"))
  );
}
export type Session = {
  sid: string;
  userId?: string;
  version?: number;
  expires?: number;
};
export async function session() {
  return getIronSession<Session>(await cookies(), {
    password: sessionSecret(),
    cookieName: "forme_session",
    ttl: 8 * 60 * 60,
    cookieOptions: {
      httpOnly: true,
      secure: siteUrl().startsWith("https://"),
      sameSite: "lax",
      path: "/",
    },
  });
}
export async function identity() {
  const s = await session();
  const u = s.userId
    ? (db()
        .prepare(
          "SELECT id,name,email,role,session_version FROM users WHERE id=?",
        )
        .get(s.userId) as unknown as PublicUser)
    : undefined;
  return u && u.session_version === s.version && (s.expires || 0) > Date.now()
    ? u
    : null;
}
export async function requireAdmin(owner = false) {
  const u = await identity();
  if (!u) throw new HttpError(401, "Please sign in.");
  if (!["owner", "staff"].includes(u.role) || (owner && u.role !== "owner"))
    throw new HttpError(403, "You do not have permission to do this.");
  return u;
}
export function rateLimit(key: string, limit = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  db()
    .prepare(
      "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
    )
    .run(hash(key), now + windowMs, now, now);
  const r = db()
    .prepare("SELECT count FROM rate_limits WHERE key=?")
    .get(hash(key))!;
  if (Number(r.count) > limit)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export function sameOrigin(req: Request) {
  const allowed = new URL(siteUrl()).origin;
  const origin = req.headers.get("origin");
  if (origin !== allowed || req.headers.get("x-forme-request") !== "1")
    throw new HttpError(403, "Request origin could not be verified.");
}
