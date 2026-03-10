// ── GPS Utility Functions ─────────────────────────────────────────────────────

export interface GpsRealtimeResult {
  lat: string;
  lon: string;
  speed?: string;
  time?: string;
  location?: string;
}

export interface GpsStation {
  station_name?: string;
  arrive_time?: string;
  depart_time?: string;
  duration?: string;
  lat?: string;
  lon?: string;
  sub_district_th?: string;
  district_th?: string;
  province_th?: string;
  [key: string]: unknown;
}

export interface GpsHistoryResult {
  stations: GpsStation[];
  date: string;
  gps_id: string;
}

/** Fetch current GPS position and open Google Maps */
export async function fetchGpsRealtime(gpsId: string): Promise<GpsRealtimeResult> {
  const response = await fetch("/api/gps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gps_id: gpsId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch GPS data");
  if (!data.lat || !data.lon) throw new Error("No coordinate data found");
  return data;
}

/** Fetch station-to-station history for a given date (time fixed 0:00–23:59) */
export async function fetchGpsHistory(gpsId: string, date: string): Promise<GpsHistoryResult> {
  const response = await fetch("/api/gps/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gps_id: gpsId, date }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch GPS history");
  return data;
}

/** Get today's date as YYYY-MM-DD */
export function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
