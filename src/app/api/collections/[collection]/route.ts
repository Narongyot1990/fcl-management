import { NextRequest, NextResponse } from "next/server";
import { getCollection, DEDUP_KEYS, ALLOWED } from "@/lib/mongodb";

function routeError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("MONGODB_URI") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    if (!(ALLOWED as readonly string[]).includes(collection)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const col = await getCollection(collection);
    const search = Object.fromEntries(req.nextUrl.searchParams.entries());
    const filter: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(search)) {
      if (value) {
        filter[key] = { $regex: value, $options: "i" };
      }
    }

    const records = await col.find(filter).sort({ created_at: -1 }).toArray();
    const mapped = records.map(
      (record: Record<string, unknown> & { _id: { toString(): string } }) => ({
        ...record,
        _id: record._id.toString(),
      })
    );

    return NextResponse.json({ count: mapped.length, records: mapped });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    if (!(ALLOWED as readonly string[]).includes(collection)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await req.json();
    const col = await getCollection(collection);
    const dedupKeys = DEDUP_KEYS[collection] || [];

    if (dedupKeys.length > 0) {
      const dedupFilter: Record<string, unknown> = {};
      for (const key of dedupKeys) {
        if (data[key]) {
          dedupFilter[key] = data[key];
        }
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
  } catch (error) {
    return routeError(error);
  }
}
