import { NextResponse } from "next/server";
import { fetchDtcHistory, processHistoryToStationReport } from "@/lib/dtcGps";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { gps_id?: string; date?: string; start_time?: string; end_time?: string };
    const { gps_id, date, start_time = "00:00:00", end_time = "23:59:59" } = body;

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const rawData = await fetchDtcHistory(gps_id, date, start_time, end_time);
    const points = rawData.data || [];
    const stations = processHistoryToStationReport(points);

    return NextResponse.json({
      stations,
      date,
      gps_id,
      truck_name: rawData.truck_name || "",
      raw_count: points.length,
      count: stations.length,
    });
  } catch (error: unknown) {
    console.error("GPS Station v2 API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = message.includes("DTC_GPS_API_TOKEN") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
