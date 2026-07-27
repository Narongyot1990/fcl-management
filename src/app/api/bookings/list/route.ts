import { NextRequest, NextResponse } from "next/server";
import type { Document } from "mongodb";
import { getCollection } from "@/lib/mongodb";
import { buildGroupedWorkflowMatch } from "@/lib/bookingWorkflow";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("MONGODB_URI") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const bookings = await getCollection("bookings");
    // Ensure the shipments collection's indexes get created too, even though
    // we query it here only via the bookings collection's $lookup below.
    await getCollection("shipments");

    const match: Record<string, unknown> = {};
    const bookingNo = search.get("booking_no");
    if (bookingNo) {
      match.booking_no = { $regex: escapeRegex(bookingNo), $options: "i" };
    }
    const dateFrom = search.get("date_from");
    const dateTo = search.get("date_to");
    if (dateFrom || dateTo) {
      const range: Record<string, string> = {};
      if (dateFrom) range.$gte = dateFrom;
      if (dateTo) range.$lte = `${dateTo}T23:59:59.999Z`;
      match.booking_date = range;
    }

    const page = toPositiveInt(search.get("page"));
    const rawLimit = toPositiveInt(search.get("limit"));
    const limit = rawLimit ? Math.min(rawLimit, 200) : null;
    const shouldPaginate = page !== null || limit !== null;
    const currentPage = page ?? 1;
    const pageLimit = limit ?? 50;

    const pipeline: Document[] = [
      { $match: match },
      {
        $lookup: {
          from: "shipments",
          let: { bookingNo: "$booking_no" },
          pipeline: [
            { $match: { $expr: { $eq: ["$booking_no", "$$bookingNo"] } } },
            { $sort: { shipment_no: 1 } },
          ],
          as: "shipments",
        },
      },
    ];

    const workflow = search.get("workflow");
    if (workflow) {
      const workflowMatch = buildGroupedWorkflowMatch(workflow);
      if (workflowMatch) pipeline.push({ $match: workflowMatch });
    }

    pipeline.push({ $sort: { booking_date: -1, created_at: -1 } });

    if (shouldPaginate) {
      pipeline.push({
        $facet: {
          data: [{ $skip: (currentPage - 1) * pageLimit }, { $limit: pageLimit }],
          totalCount: [{ $count: "count" }],
        },
      });
    }

    const result = await bookings.aggregate(pipeline).toArray();

    let records: Document[];
    let total: number | null = null;
    if (shouldPaginate) {
      records = (result[0]?.data as Document[]) ?? [];
      total = (result[0]?.totalCount?.[0]?.count as number | undefined) ?? 0;
    } else {
      records = result;
    }

    const mapped = records.map((record) => ({
      ...record,
      _id: record._id.toString(),
      shipments: ((record.shipments as Document[]) ?? []).map((s) => ({
        ...s,
        _id: s._id.toString(),
      })),
    }));

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
