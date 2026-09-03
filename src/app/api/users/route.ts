import { NextResponse, type NextRequest } from "next/server";
import { getCollection, MongoServerError } from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { isPermission, isRole } from "@/lib/auth/permissions";

export const runtime = "nodejs";

interface UserDoc {
  _id: { toString(): string };
  username: string;
  name?: string;
  role?: string;
  permissions?: unknown;
  active?: boolean;
  last_login_at?: string;
  created_at?: string;
}

function sanitize(doc: UserDoc) {
  return {
    _id: doc._id.toString(),
    username: doc.username,
    name: doc.name ?? doc.username,
    role: doc.role ?? "viewer",
    permissions: Array.isArray(doc.permissions) ? doc.permissions.map(String) : [],
    active: doc.active !== false,
    last_login_at: doc.last_login_at ?? null,
    created_at: doc.created_at ?? null,
  };
}

function cleanPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter(isPermission))];
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "users:manage");
  if (!auth.ok) return auth.response;

  const users = await getCollection("users");
  const docs = (await users.find({}, { projection: { password: 0 } }).sort({ created_at: -1 }).toArray()) as unknown as UserDoc[];
  const records = docs.map(sanitize);
  return NextResponse.json({ count: records.length, records });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "users:manage");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const name = String(body.name ?? "").trim() || username;
  const password = String(body.password ?? "");
  const role = body.role;

  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const users = await getCollection("users");
  const existing = await users.findOne({
    username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });
  if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 409 });

  const doc = {
    username,
    name,
    role,
    permissions: cleanPermissions(body.permissions),
    active: body.active !== false,
    password: await hashPassword(password),
    created_at: new Date().toISOString(),
  };

  try {
    const result = await users.insertOne(doc);
    return NextResponse.json({ created: true, record: sanitize({ ...doc, _id: result.insertedId }) });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    throw error;
  }
}
