import { NextResponse, type NextRequest } from "next/server";
import { getCollection, ObjectId } from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { isPermission, isRole } from "@/lib/auth/permissions";

export const runtime = "nodejs";

function cleanPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter(isPermission))];
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "users:manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const users = await getCollection("users");
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (body.role !== undefined) {
    if (!isRole(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    patch.role = body.role;
  }
  if (body.permissions !== undefined) patch.permissions = cleanPermissions(body.permissions);
  if (body.active !== undefined) patch.active = Boolean(body.active);

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    patch.password = await hashPassword(body.password);
  }

  // Guard against locking yourself out of admin.
  if (auth.user.id === id) {
    if (patch.active === false) {
      return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
    }
    if (patch.role !== undefined && patch.role !== "admin" && auth.user.role === "admin") {
      return NextResponse.json({ error: "You cannot demote your own admin account" }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await users.updateOne({ _id: oid }, { $set: patch });
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ updated: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "users:manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (auth.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const users = await getCollection("users");
  const result = await users.deleteOne({ _id: oid });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
