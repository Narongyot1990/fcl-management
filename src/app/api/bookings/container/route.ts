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

// ISO 6346 letter values: A=10, B=12, C=13...Z=38 (skip 11, 20, 30)
const ISO6346_LETTER_MAP: Record<string, number> = {
  'A':10,'B':12,'C':13,'D':14,'E':15,'F':16,'G':17,'H':18,'I':19,'J':20,
  'K':21,'L':23,'M':24,'N':25,'O':26,'P':27,'Q':28,'R':29,'S':30,'T':31,
  'U':32,'V':34,'W':35,'X':36,'Y':37,'Z':38
};

function iso6346CheckDigit(owner: string, serial: string): number {
  const container = (owner + serial).toUpperCase();
  
  // Letter positions (0-3) use weights: [1,2,4,8]
  // Digit positions (4-9) use weights: [16,32,64,128,256,512]
  const letterWeights = [1, 2, 4, 8];
  const digitWeights = [16, 32, 64, 128, 256, 512];
  
  let total = 0;
  
  // Process letters (positions 0-3)
  for (let i = 0; i < 4; i++) {
    const ch = container[i];
    const v = ISO6346_LETTER_MAP[ch] || 0;
    total += v * letterWeights[i];
  }
  
  // Process digits (positions 4-9)
  for (let i = 0; i < 6; i++) {
    const ch = container[i + 4];
    const v = parseInt(ch) || 0;
    total += v * digitWeights[i];
  }
  
  // (total % 11) % 10
  const checkDigit = (total % 11) % 10;
  return checkDigit;
}

function validateISO6346(containerNo: string): { valid: boolean; error?: string } {
  const raw = containerNo.trim().toUpperCase().replace(/[\s-]/g, "");
  
  // Format validation (4 letters + 7 digits)
  if (!/^[A-Z]{4}\d{7}$/.test(raw)) {
    return {
      valid: false,
      error: `Container number must be 4 letters + 7 digits (e.g. MSCU1234567), got: '${containerNo}'`,
    };
  }
  
  // ISO 6346 check digit validation
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
