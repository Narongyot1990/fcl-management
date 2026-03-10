import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gps_id } = body;

    if (!gps_id) {
      return NextResponse.json({ error: "gps_id is required" }, { status: 400 });
    }

    // According to DTC API Documentation (_gps.txt)
    const API_URL = "https://gps.dtc.co.th:8099/getRealtimeData";
    const API_TOKEN = "E4QHL821CUE8ZF52VJWA176XLPAYUKJ7QBHFG3B3SWRTRDYN9TCZPN9DSVXKMG6M";

    const payload = {
      api_token_key: API_TOKEN,
      gps_list: [gps_id]
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.error || data.status !== "200") {
      return NextResponse.json({ error: data.message || "DTC API Error" }, { status: parseInt(data.status) || 500 });
    }

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({ error: "No GPS data found for this ID" }, { status: 404 });
    }

    const gpsData = data.data[0];
    
    // Return only the necessary coordinates
    return NextResponse.json({ 
      lat: gpsData.lat, 
      lon: gpsData.lon,
      speed: gpsData.gps_speed,
      time: gpsData.time,
      location: gpsData.station_name || gpsData.sub_district_th || "Unknown Location"
    });

  } catch (error: any) {
    console.error("GPS API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
