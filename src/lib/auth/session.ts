/**
 * Stateless session: a signed JWT (HS256) carried in an httpOnly cookie.
 *
 * Edge-safe — depends only on `jose`, never on `node:crypto` or `mongodb`, so
 * it can be imported from `src/middleware.ts` as well as from Node route
 * handlers.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "./permissions";

export const SESSION_COOKIE = "fcl_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours (seconds)

export interface SessionPayload {
  /** Mongo user _id (hex string). */
  sub: string;
  username: string;
  name: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or too short (need >= 32 characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return toSessionPayload(payload);
  } catch {
    return null;
  }
}

function toSessionPayload(payload: JWTPayload): SessionPayload | null {
  const { sub, username, name, role } = payload as JWTPayload & {
    username?: unknown;
    name?: unknown;
    role?: unknown;
  };
  if (typeof sub !== "string" || typeof username !== "string" || typeof role !== "string") {
    return null;
  }
  return {
    sub,
    username,
    name: typeof name === "string" ? name : username,
    role: role as Role,
  };
}

/** Options object shared by every place that writes the session cookie. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
