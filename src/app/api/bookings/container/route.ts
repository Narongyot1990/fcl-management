import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

function getKey(): string {
  return process.env.OCR_API_SECRET || "";
}

function authError() {
  return NextResponse.json(
    { detail: "Invalid or missing X-API-Key" },
    { status: 401 }
  );
}

interface ContainerPayload {
  booking_no: string;
  container_no: string;
  seal_no?: string;
  container_size?: string;
  container_size_code?: string;
  tare_weight?: string;
}

const ISO6346_LETTER_MAP: Record<string, number> = {};
let n = 10;
for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  if (n % 10 === 0) n += 1;
  ISO6346_LETTER_MAP[c] = n;
  n += 1;
}

function iso6346CheckDigit(owner: string, serial: string): number {
  const chars = (owner + serial).toUpperCase();
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const v = /\d/.test(ch) ? parseInt(ch) : ISO6346_LETTER_MAP[ch] || 0;
    total += v * Math.pow(2, i);
  }
  const remainder = total % 11;
  return remainder === 10 ? 0 : remainder;
}

function validateISO6346(containerNo: string): { valid: boolean; error?: string } {
  const raw = containerNo.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z]{4}\d{7}$/.test(raw)) {
    return {
      valid: false,
      error: `Container number must be 4 letters + 7 digits (e.g. MSCU1234567), got: '${containerNo}'`,
    };
  }
  const owner = raw.slice(0, 4);
  const serial = raw.slice(4, 10);
  const givenCheck = parseInt(raw[10]);
  const expected = iso6346CheckDigit(owner, serial);
  if (givenCheck !== expected) {
    return {
      valid: false,
      error: `Invalid ISO 6346 check digit: expected ${expected}, got ${givenCheck}`,
    };
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const secret = getKey();

  if (!secret || !apiKey || apiKey.trim() !== secret) {
    return authError();
  }

  let payload: ContainerPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!payload.booking_no || !payload.container_no) {
    return NextResponse.json(
      { detail: "booking_no and container_no are required" },
      { status: 400 }
    );
  }

  const validation = validateISO6346(payload.container_no);
  if (!validation.valid) {
    return NextResponse.json(
      { field: "container_no", error: validation.error },
      { status: 422 }
    );
  }

  try {
    const bookings = await getCollection("bookings");
    const booking = await bookings.findOne({
      booking_no: {
        $regex: `^${payload.booking_no.trim()}$`,
        $options: "i",
      },
    });

    if (!booking) {
      return NextResponse.json(
        { detail: `Booking '${payload.booking_no}' not found in the system` },
        { status: 404 }
      );
    }

    const updateData: Record<string, string> = {
      container_no: payload.container_no.trim().toUpperCase(),
    };
    if (payload.seal_no) updateData.seal_no = payload.seal_no.trim();
    if (payload.container_size) updateData.container_size = payload.container_size.trim();
    if (payload.container_size_code) updateData.container_size_code = payload.container_size_code.trim();
    if (payload.tare_weight) updateData.tare_weight = payload.tare_weight.trim();

    await bookings.updateOne(
      { _id: booking._id },
      { $set: updateData }
    );

    const updated = await bookings.findOne({ _id: booking._id });
    const result = {
      ...updated,
      _id: updated?._id.toString(),
      created_at: updated?.created_at?.toISOString(),
    };

    return NextResponse.json(
      { updated: true, booking: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating booking container:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
