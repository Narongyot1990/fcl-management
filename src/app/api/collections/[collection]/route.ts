import { NextRequest, NextResponse } from "next/server";
import { getCollection, ObjectId, DEDUP_KEYS, ALLOWED } from "@/lib/mongodb";

function getKey(): string {
  return process.env.OCR_API_SECRET || "";
}

function authError() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key") || "";
  const secret = getKey();
  return !secret || key === secret;
}

// ── GET /api/collections/[collection] ────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!checkAuth(req)) return authError();
  const { collection } = await params;
  if (!(ALLOWED as readonly string[]).includes(collection))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const col = await getCollection(collection);
  const search = Object.fromEntries(req.nextUrl.searchParams.entries());

  // Build simple filter from query params
  const filter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(search)) {
    if (v) filter[k] = { $regex: v, $options: "i" };
  }

  const records = await col.find(filter).sort({ created_at: -1 }).toArray();
  const mapped = records.map((r: Record<string, unknown> & { _id: { toString(): string } }) => ({ ...r, _id: r._id.toString() }));
  return NextResponse.json({ count: mapped.length, records: mapped });
}

// ── POST /api/collections/[collection] ───────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!checkAuth(req)) return authError();
  const { collection } = await params;
  if (!(ALLOWED as readonly string[]).includes(collection))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await req.json();
  const col = await getCollection(collection);

  // Dedup check
  const dedupKeys = DEDUP_KEYS[collection] || [];
  if (dedupKeys.length > 0) {
    const dedupFilter: Record<string, unknown> = {};
    for (const k of dedupKeys) {
      if (data[k]) dedupFilter[k] = data[k];
    }
    if (Object.keys(dedupFilter).length === dedupKeys.length) {
      const existing = await col.findOne(dedupFilter);
      if (existing) {
        return NextResponse.json(
          { error: "Record already exists (duplicate)" },
          { status: 409 }
        );
      }
    }
  }

  const doc = { ...data, created_at: new Date().toISOString() };
  const result = await col.insertOne(doc);
  return NextResponse.json({
    created: true,
    record: { ...doc, _id: result.insertedId.toString() },
  });
}
