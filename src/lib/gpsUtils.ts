// ── GPS Utility Functions ─────────────────────────────────────────────────────

export interface GpsRealtimeResult {
  lat: string;
  lon: string;
  speed?: string;
  time?: string;
  location?: string;
}

export interface GpsStation {
  // /getStationToStationReport response fields (doc section 3.9)
  truck_name?: string;
  startion_f?: string;   // departure station (typo in DTC doc)
  start_date?: string;
  start_time?: string;
  startion_n?: string;   // arrival station (typo in DTC doc)
  end_date?: string;
  end_time?: string;
  distance?: string;
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
