import { NextRequest, NextResponse } from "next/server";
import { getCollection, ObjectId, ALLOWED } from "@/lib/mongodb";

function checkAuth(req: NextRequest): boolean {
  void req;
  // Authentication temporarily disabled
  return true;
}

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function routeError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("MONGODB_URI") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    if (!checkAuth(req)) return authError();
    const { collection, id } = await params;
    if (!(ALLOWED as readonly string[]).includes(collection)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await req.json();
    const { _id, created_at, ...patch } = data;
    void _id;
    void created_at;

    const col = await getCollection(collection);
    const result = await col.updateOne({ _id: oid }, { $set: patch });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    if (!checkAuth(req)) return authError();
    const { collection, id } = await params;
    if (!(ALLOWED as readonly string[]).includes(collection)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let oid: ObjectId;
    try {
      oid = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const col = await getCollection(collection);
    const result = await col.deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return routeError(error);
  }
}
