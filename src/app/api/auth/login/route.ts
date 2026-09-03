import { NextResponse, type NextRequest } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { effectivePermissions, isRole, type Role } from "@/lib/auth/permissions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let username: string;
  let password: string;
  try {
    const body = await req.json();
    username = String(body?.username ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const users = await getCollection("users");
  const doc = await users.findOne({
    username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  // Generic message — do not reveal whether the username exists.
  const invalid = () => NextResponse.json({ error: "Invalid username or password" }, { status: 401 });

  if (!doc) {
    // Still spend time hashing to blunt user-enumeration timing.
    await verifyPassword(password, "scrypt$16384$00$00");
    return invalid();
  }
  if (doc.active === false) {
    return NextResponse.json({ error: "This account is disabled" }, { status: 403 });
  }

  const ok = await verifyPassword(password, doc.password);
  if (!ok) return invalid();

  const role: Role = isRole(doc.role) ? doc.role : "viewer";
  const userId = doc._id.toString();

  const token = await signSession({
    sub: userId,
    username: String(doc.username),
    name: String(doc.name ?? doc.username),
    role,
  });

  await users.updateOne({ _id: doc._id }, { $set: { last_login_at: new Date().toISOString() } });

  const res = NextResponse.json({
    user: {
      id: userId,
      username: String(doc.username),
      name: String(doc.name ?? doc.username),
      role,
      permissions: [
        ...effectivePermissions({
          role,
          permissions: Array.isArray(doc.permissions) ? doc.permissions.map(String) : [],
        }),
      ],
    },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
