import { NextRequest, NextResponse } from "next/server";
import { getCollection, MongoServerError } from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/guard";

export const runtime = "nodejs";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

interface ParsedInput {
  booking_no: string;
  shipment_no?: number;
}

/** "BKK0001" -> {booking_no:"BKK0001"} ; "BKK0001 #2" -> {booking_no:"BKK0001", shipment_no:2} */
function parseBookingInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.*\S)\s*#\s*(\d+)\s*$/);
  if (match) {
    const n = Number.parseInt(match[2], 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return { booking_no: match[1].trim(), shipment_no: n };
  }
  return { booking_no: trimmed };
}

function conflict(error: string, field?: string) {
  return NextResponse.json({ error, field }, { status: 409 });
}

function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = message.includes("MONGODB_URI") ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "bookings:write");
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { input, confirmed, booking_date, job_type, customer_code, vendor_code, ...shipmentFields } = body ?? {};

    const parsed = parseBookingInput(typeof input === "string" ? input : "");
    if (!parsed) {
      return NextResponse.json({ error: "Booking No. is required" }, { status: 400 });
    }

    const bookings = await getCollection("bookings");
    const shipments = await getCollection("shipments");

    let booking = await bookings.findOne({
      booking_no: { $regex: `^${escapeRegex(parsed.booking_no)}$`, $options: "i" },
    });

    if (!booking) {
      const bookingDoc = {
        booking_no: parsed.booking_no,
        booking_date: booking_date ?? "",
        job_type: job_type ?? "Export",
        customer_code: customer_code ?? "",
        vendor_code: vendor_code ?? "",
        created_at: new Date().toISOString(),
      };
      try {
        const result = await bookings.insertOne(bookingDoc);
        booking = { ...bookingDoc, _id: result.insertedId };
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          // Race: someone else just created this booking_no — re-fetch and fall through.
          booking = await bookings.findOne({
            booking_no: { $regex: `^${escapeRegex(parsed.booking_no)}$`, $options: "i" },
          });
        } else {
          throw error;
        }
      }
    }

    if (!booking) {
      return routeError(new Error("Failed to resolve booking"));
    }

    const bookingNo = booking.booking_no as string;

    if (parsed.shipment_no !== undefined) {
      const existing = await shipments.findOne({ booking_no: bookingNo, shipment_no: parsed.shipment_no });
      if (existing) {
        return conflict(`Shipment #${parsed.shipment_no} already exists for booking ${bookingNo}`, "shipment_no");
      }

      const shipmentDoc = {
        ...shipmentFields,
        booking_no: bookingNo,
        shipment_no: parsed.shipment_no,
        created_at: new Date().toISOString(),
      };
      try {
        const result = await shipments.insertOne(shipmentDoc);
        return NextResponse.json({
          created: true,
          booking: { ...booking, _id: booking._id.toString() },
          shipment: { ...shipmentDoc, _id: result.insertedId.toString() },
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return conflict(`Shipment #${parsed.shipment_no} already exists for booking ${bookingNo}`, "shipment_no");
        }
        throw error;
      }
    }

    // No explicit shipment_no: ambiguous if the booking already has shipments.
    const existingShipments = await shipments
      .find({ booking_no: bookingNo })
      .sort({ shipment_no: -1 })
      .limit(1)
      .toArray();
    const existingShipmentCount = await shipments.countDocuments({ booking_no: bookingNo });
    const nextShipmentNo = (existingShipments[0]?.shipment_no as number | undefined ?? 0) + 1;

    if (existingShipmentCount > 0 && confirmed !== true) {
      return NextResponse.json({
        needsConfirmation: true,
        booking_no: bookingNo,
        existingShipmentCount,
        nextShipmentNo,
      });
    }

    const shipmentDoc = {
      ...shipmentFields,
      booking_no: bookingNo,
      shipment_no: nextShipmentNo,
      created_at: new Date().toISOString(),
    };
    try {
      const result = await shipments.insertOne(shipmentDoc);
      return NextResponse.json({
        created: true,
        booking: { ...booking, _id: booking._id.toString() },
        shipment: { ...shipmentDoc, _id: result.insertedId.toString() },
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return conflict(`Shipment #${nextShipmentNo} already exists for booking ${bookingNo} (someone else just added one — please retry)`, "shipment_no");
      }
      throw error;
    }
  } catch (error) {
    return routeError(error);
  }
}
