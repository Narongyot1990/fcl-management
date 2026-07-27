import { NextResponse } from "next/server";
import { fetchDtcHistory, fetchDtcHistoryRange, processHistoryToStationReport } from "@/lib/dtcGps";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      gps_id?: string;
      date?: string;
      start_time?: string;
      end_time?: string;
      start_period?: string;
      end_period?: string;
    };
    const { gps_id, date, start_time = "00:00:00", end_time = "23:59:59", start_period, end_period } = body;

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }

    let rawData;
    if (start_period && end_period) {
      rawData = await fetchDtcHistoryRange(gps_id, start_period, end_period);
    } else if (date) {
      rawData = await fetchDtcHistory(gps_id, date, start_time, end_time);
    } else {
      return NextResponse.json({ error: "date or start_period/end_period is required" }, { status: 400 });
    }

    const points = rawData.data || [];
    const stations = processHistoryToStationReport(points);
    const latestGpsTime = points.length > 0 ? points[points.length - 1].time || null : null;

    return NextResponse.json({
      stations,
      date: date || (start_period ? start_period.split(" ")[0] : ""),
      gps_id,
      truck_name: rawData.truck_name || "",
      latest_gps_time: latestGpsTime,
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
