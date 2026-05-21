const DEFAULT_DTC_GPS_API_BASE_URL = "https://gps.dtc.co.th:8099";

interface DtcEnvelope<T> {
  error?: boolean;
  status?: string;
  message?: string;
  count?: number;
  data?: T[];
  gps_id?: string;
  truck_name?: string;
}

export interface DtcRealtimePoint {
  gps_id?: string;
  lat?: number;
  lon?: number;
  gps_speed?: number;
  time?: string;
  station_name?: string;
  sub_district_th?: string;
}

export interface DtcHistoryPoint {
  time?: string;
  lat?: number;
  lon?: number;
  gps_speed?: number;
  status_name_th?: string;
  station_name?: string;
  station_id?: string;
  sub_district_th?: string;
  district_th?: string;
  province_th?: string;
}

export interface DtcStationReport {
  station_f?: string;
  station_n?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  distance?: string | number;
}

function getDtcConfig() {
  const token = process.env.DTC_GPS_API_TOKEN;
  if (!token) {
    throw new Error("Missing DTC_GPS_API_TOKEN environment variable");
  }

  const baseUrl = (process.env.DTC_GPS_API_BASE_URL || DEFAULT_DTC_GPS_API_BASE_URL).replace(/\/$/, "");
  return { baseUrl, token };
}

async function postDtc<T>(path: string, payload: Record<string, unknown>): Promise<DtcEnvelope<T>> {
  const { baseUrl, token } = getDtcConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      api_token_key: token,
      ...payload,
    }),
  });

  const text = await response.text();
  let data: DtcEnvelope<T>;
  try {
    data = JSON.parse(text) as DtcEnvelope<T>;
  } catch {
    throw new Error(`DTC API returned invalid response: ${text.slice(0, 100)}`);
  }

  if (data.error || (data.status && data.status !== "200")) {
    throw new Error(data.message || "DTC API Error");
  }

  return data;
}

export function fetchDtcRealtime(gpsId: string) {
  return postDtc<DtcRealtimePoint>("/getRealtimeData", { gps_list: [gpsId] });
}

export function fetchDtcStationReport(gpsId: string, date: string) {
  return postDtc<DtcStationReport>("/getStationToStationReport", {
    start_period: `${date} 00:00:00`,
    end_period: `${date} 23:59:59`,
    gps_list: [gpsId],
  });
}

export function fetchDtcHistory(gpsId: string, date: string) {
  return postDtc<DtcHistoryPoint>("/getHistory", {
    gps_id: gpsId,
    start_period: `${date} 00:00:00`,
    end_period: `${date} 23:59:59`,
  });
}
