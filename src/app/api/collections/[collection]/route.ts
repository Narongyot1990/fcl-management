import { NextRequest, NextResponse } from "next/server";
import type { Sort } from "mongodb";
import { getCollection, DEDUP_KEYS, ALLOWED, MongoServerError } from "@/lib/mongodb";

const CONTROL_PARAMS = new Set([
  "page",
  "limit",
  "date_from",
  "date_to",
  "no_container",
  "booking_nos",
  "workflow",
]);

function routeError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("MONGODB_URI") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
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
      if (value && !CONTROL_PARAMS.has(key)) {
        filter[key] = { $regex: escapeRegex(value), $options: "i" };
      }
    }

    if (collection === "bookings") {
      const dateRange: Record<string, string> = {};
      if (search.date_from) dateRange.$gte = search.date_from;
      if (search.date_to) dateRange.$lte = `${search.date_to}T23:59:59.999Z`;
      if (Object.keys(dateRange).length > 0) {
        filter.booking_date = dateRange;
      }

      if (search.no_container === "true") {
        filter.$or = [
          { container_no: { $exists: false } },
          { container_no: null },
          { container_no: "" },
        ];
      }

      if (search.workflow === "no_truck") {
        filter.$or = [
          { truck_plate: { $exists: false } },
          { truck_plate: null },
          { truck_plate: "" },
        ];
      } else if (search.workflow === "no_container") {
        filter.$or = [
          { container_no: { $exists: false } },
          { container_no: null },
          { container_no: "" },
        ];
      } else if (search.workflow === "loading_pending") {
        filter.loaded_at = { $in: [null, ""] };
        filter.truck_plate = { $nin: [null, ""] };
        filter.container_no = { $nin: [null, ""] };
      } else if (search.workflow === "loaded") {
        filter.loaded_at = { $nin: [null, ""] };
      } else if (search.workflow === "return_pending") {
        filter.loaded_at = { $nin: [null, ""] };
        filter.return_completed = { $ne: true };
        filter.return_date = { $in: [null, ""] };
      }

      if (search.booking_nos) {
        const bookingNos = search.booking_nos
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        if (bookingNos.length > 0) {
          filter.booking_no = { $in: bookingNos };
        }
      }
    }

    const page = toPositiveInt(req.nextUrl.searchParams.get("page"));
    const rawLimit = toPositiveInt(req.nextUrl.searchParams.get("limit"));
    const limit = rawLimit ? Math.min(rawLimit, 200) : null;
    const shouldPaginate = page !== null || limit !== null;
    const currentPage = page ?? 1;
    const pageLimit = limit ?? 50;
    const sort: Sort = collection === "bookings"
      ? { booking_date: -1, created_at: -1 }
      : { created_at: -1 };

    const cursor = col.find(filter).sort(sort);
    if (shouldPaginate) {
      cursor.skip((currentPage - 1) * pageLimit).limit(pageLimit);
    }

    const [records, total] = await Promise.all([
      cursor.toArray(),
      shouldPaginate ? col.countDocuments(filter) : Promise.resolve(null),
    ]);
    const mapped = records.map(
      (record: Record<string, unknown> & { _id: { toString(): string } }) => ({
        ...record,
        _id: record._id.toString(),
      })
    );

    return NextResponse.json({
      count: mapped.length,
      records: mapped,
      ...(shouldPaginate
        ? {
            page: currentPage,
            limit: pageLimit,
            total,
            totalPages: Math.max(1, Math.ceil((total ?? 0) / pageLimit)),
          }
        : {}),
    });
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
    let result;
    try {
      result = await col.insertOne(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return NextResponse.json(
          { error: "Record already exists (duplicate)" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      created: true,
      record: { ...doc, _id: result.insertedId.toString() },
    });
  } catch (error) {
    return routeError(error);
  }
}
