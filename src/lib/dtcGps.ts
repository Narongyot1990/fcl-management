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
  mileage?: number | string;
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
  const token = process.env.DTC_GPS_API_TOKEN || "E4QHL821CUE8ZF52VJWA176XLPAYUKJ7QBHFG3B3SWRTRDYN9TCZPN9DSVXKMG6M";
  const baseUrl = (process.env.DTC_GPS_API_BASE_URL || DEFAULT_DTC_GPS_API_BASE_URL).replace(/\/$/, "");
  return { baseUrl, token };
}

const HARDCODED_FALLBACK_TOKEN = "E4QHL821CUE8ZF52VJWA176XLPAYUKJ7QBHFG3B3SWRTRDYN9TCZPN9DSVXKMG6M";

async function postDtc<T>(path: string, payload: Record<string, unknown>, useFallbackToken = false): Promise<DtcEnvelope<T>> {
  const { baseUrl, token: configToken } = getDtcConfig();
  const token = useFallbackToken ? HARDCODED_FALLBACK_TOKEN : configToken;

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
    const errorMsg = data.message || "DTC API Error";

    // If the token was wrong and we haven't tried the fallback token yet, retry with the fallback token!
    if (!useFallbackToken && (errorMsg.toLowerCase().includes("token") || errorMsg.toLowerCase().includes("api key"))) {
      console.warn("DTC API returned token error. Retrying with hardcoded fallback token...");
      return postDtc<T>(path, payload, true);
    }

    throw new Error(errorMsg);
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

/**
 * Aggregates raw DTC history points into Station-to-Station report rows (v2)
 */
export function processHistoryToStationReport(points: DtcHistoryPoint[]): DtcStationReport[] {
  if (!points || points.length === 0) return [];

  const legs: DtcStationReport[] = [];
  let currentStation: string | null = null;
  let currentStationDepTime: string | null = null;
  let currentStationDepMileage = 0;
  let hasLeftCurrentStation = false;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const sName = (pt.station_name || "").trim();
    const mileage = typeof pt.mileage === "number" ? pt.mileage : parseFloat(pt.mileage || "0");

    if (sName) {
      if (!currentStation) {
        currentStation = sName;
        currentStationDepTime = pt.time || null;
        currentStationDepMileage = mileage;
        hasLeftCurrentStation = false;
      } else if (sName !== currentStation || hasLeftCurrentStation) {
        const arrTime = pt.time || "";
        const distNum = mileage - currentStationDepMileage;
        const distStr = distNum > 0 ? distNum.toFixed(2) : "0.00";

        const [depDate = "", depT = ""] = (currentStationDepTime || "").split(" ");
        const [arrDate = "", arrT = ""] = arrTime.split(" ");

        legs.push({
          station_f: currentStation,
          start_date: depDate,
          start_time: depT,
          station_n: sName,
          end_date: arrDate,
          end_time: arrT,
          distance: distStr,
        });

        currentStation = sName;
        currentStationDepTime = pt.time || null;
        currentStationDepMileage = mileage;
        hasLeftCurrentStation = false;
      } else {
        // Same station continuously -> update departure timestamp
        currentStationDepTime = pt.time || null;
      }
    } else {
      if (currentStation) {
        hasLeftCurrentStation = true;
      }
    }
  }

  return legs;
}

