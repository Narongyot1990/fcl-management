import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gps_id, date } = body; // date = "YYYY-MM-DD"

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    // DTC API — station-to-station history
    const API_URL = "https://gps.dtc.co.th:8099/getStationToStation";
    const API_TOKEN = "E4QHL821CUE8ZF52VJWA176XLPAYUKJ7QBHFG3B3SWRTRDYN9TCZPN9DSVXKMG6M";

    // Fixed time range: 0:00 - 23:59 as per requirement
    const start_time = `${date} 00:00:00`;
    const end_time = `${date} 23:59:59`;

    const payload = {
      api_token_key: API_TOKEN,
      gps_id: gps_id,
      start_time,
      end_time,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error || (data.status && data.status !== "200")) {
      return NextResponse.json(
        { error: data.message || "DTC API Error" },
        { status: parseInt(data.status) || 500 }
      );
    }

    // Return station-to-station data
    // Typical DTC response: { status: "200", data: [ { station_name, arrive_time, depart_time, duration, lat, lon, ... } ] }
    return NextResponse.json({
      stations: data.data || [],
      date,
      gps_id,
    });
  } catch (error: any) {
    console.error("GPS History API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
