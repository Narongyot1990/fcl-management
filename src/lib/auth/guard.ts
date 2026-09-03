/**
 * Route-handler guards. Node runtime — reads the session cookie, verifies the
 * JWT, then loads the *current* user record from MongoDB so role/permission
 * changes and deactivations take effect on the next request (the JWT itself
 * only carries identity, not the permission set).
 *
 * Usage inside a route:
 *
 *   const auth = await requirePermission(req, "bookings:write");
 *   if (!auth.ok) return auth.response;
 *   // auth.user is the authenticated AuthUser
 */
import { NextResponse } from "next/server";
import { getCollection, ObjectId } from "@/lib/mongodb";
import { SESSION_COOKIE, verifySession } from "./session";
import { can, effectivePermissions, isRole, type Permission, type Role } from "./permissions";

/** Works with both NextRequest (`.cookies`) and a plain Request (Cookie header). */
type CookieReq = { cookies?: { get(name: string): { value: string } | undefined }; headers: Headers };

function readSessionToken(req: CookieReq): string | undefined {
  const fromNext = req.cookies?.get(SESSION_COOKIE)?.value;
  if (fromNext) return fromNext;
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  permissions: string[];
  active: boolean;
}

type GuardOk = { ok: true; user: AuthUser };
type GuardFail = { ok: false; response: NextResponse };
export type GuardResult = GuardOk | GuardFail;

function unauthorized(): GuardFail {
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

function forbidden(permission: Permission): GuardFail {
  return {
    ok: false,
    response: NextResponse.json({ error: `Forbidden: missing "${permission}"` }, { status: 403 }),
  };
}

/** Resolve the authenticated user from the request cookie, or null. */
export async function getSessionUser(req: CookieReq): Promise<AuthUser | null> {
  const token = readSessionToken(req);
  const session = await verifySession(token);
  if (!session) return null;

  let oid: ObjectId;
  try {
    oid = new ObjectId(session.sub);
  } catch {
    return null;
  }

  const users = await getCollection("users");
  const doc = await users.findOne({ _id: oid });
  if (!doc) return null;
  if (doc.active === false) return null;

  const role: Role = isRole(doc.role) ? doc.role : "viewer";
  return {
    id: doc._id.toString(),
    username: String(doc.username ?? session.username),
    name: String(doc.name ?? session.name),
    role,
    permissions: Array.isArray(doc.permissions) ? doc.permissions.map(String) : [],
    active: doc.active !== false,
  };
}

export async function requireAuth(req: CookieReq): Promise<GuardResult> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  return { ok: true, user };
}

export async function requirePermission(req: CookieReq, permission: Permission): Promise<GuardResult> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  if (!can(user, permission)) return forbidden(permission);
  return { ok: true, user };
}

/** Flat list of every permission the user effectively holds (for `/api/auth/me`). */
export function listEffectivePermissions(user: AuthUser): string[] {
  return [...effectivePermissions(user)];
}
