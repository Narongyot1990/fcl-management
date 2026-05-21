import { NextResponse } from "next/server";
import { fetchDtcRealtime } from "@/lib/dtcGps";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { gps_id?: string };
    const { gps_id } = body;

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }

    const data = await fetchDtcRealtime(gps_id);

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: "No GPS data found for this ID" }, { status: 404 });
    }

    const gpsData = data.data[0];

    return NextResponse.json({
      lat: gpsData.lat,
      lon: gpsData.lon,
      speed: gpsData.gps_speed,
      time: gpsData.time,
      location: gpsData.station_name || gpsData.sub_district_th || "Unknown Location",
    });
  } catch (error: unknown) {
    console.error("GPS API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("DTC_GPS_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
