import { NextResponse } from "next/server";
import { fetchDtcStationReport } from "@/lib/dtcGps";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { gps_id?: string; date?: string };
    const { gps_id, date } = body;

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const data = await fetchDtcStationReport(gps_id, date);

    return NextResponse.json({
      stations: data.data || [],
      date,
      gps_id,
      truck_name: data.truck_name || "",
      count: data.count || 0,
    });
  } catch (error: unknown) {
    console.error("GPS History API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("DTC_GPS_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
