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

    // DTC API — station-to-station report (doc section 3.9: /getStationToStationReport)
    const API_URL = "https://gps.dtc.co.th:8099/getStationToStationReport";
    const API_TOKEN = "E4QHL821CUE8ZF52VJWA176XLPAYUKJ7QBHFG3B3SWRTRDYN9TCZPN9DSVXKMG6M";

    // Fixed time range: 0:00 - 23:59 as per requirement
    const start_period = `${date} 00:00:00`;
    const end_period = `${date} 23:59:59`;

    const payload = {
      api_token_key: API_TOKEN,
      start_period,
      end_period,
      gps_list: [gps_id],   // doc requires array
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("DTC GPS non-JSON response:", text);
      return NextResponse.json(
        { error: `DTC API returned invalid response: ${text.slice(0, 100)}` },
        { status: 502 }
      );
    }

    if (data.error || (data.status && data.status !== "200")) {
      return NextResponse.json(
        { error: data.message || "DTC API Error" },
        { status: parseInt(data.status) || 500 }
      );
    }

    // Log first item to inspect actual field names from DTC API
    if (data.data?.length > 0) {
      console.log("DTC StationToStation first item keys:", Object.keys(data.data[0]));
      console.log("DTC StationToStation first item:", JSON.stringify(data.data[0]));
    }

    return NextResponse.json({
      stations: data.data || [],
      date,
      gps_id,
      truck_name: data.truck_name || "",
      count: data.count || 0,
    });
  } catch (error: any) {
    console.error("GPS History API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
