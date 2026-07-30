"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2, RefreshCw, Sun, Moon, Clock, Satellite, Truck } from "lucide-react";
import TimelineVisualizer, { StationReportRow } from "@/components/TimelineVisualizer";
import { listRecords } from "@/lib/api";
import type { Vendor } from "@/lib/types";

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getShiftDefaults() {
  const now = new Date();
  const h = now.getHours();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  if (h >= 6 && h < 18) {
    return {
      type: "day" as const,
      date: todayStr,
      startTime: "06:00",
      endTime: "18:00",
      startPeriod: `${todayStr} 06:00:00`,
      endPeriod: `${todayStr} 18:00:00`,
    };
  }

  if (h >= 18) {
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    return {
      type: "night" as const,
      date: todayStr,
      startTime: "18:00",
      endTime: "06:00",
      startPeriod: `${todayStr} 18:00:00`,
      endPeriod: `${tomStr} 06:00:00`,
    };
  }

  const yesterday = new Date(now.getTime() - 86400000);
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  return {
    type: "night" as const,
    date: yestStr,
    startTime: "18:00",
    endTime: "06:00",
    startPeriod: `${yestStr} 18:00:00`,
    endPeriod: `${todayStr} 06:00:00`,
  };
}

export default function StandaloneStationRealtimePage({ params }: { params: Promise<{ plate: string }> }) {
  const resolvedParams = use(params);
  const rawPlate = decodeURIComponent(resolvedParams.plate);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [gpsId, setGpsId] = useState<string | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);

  // Shift & Filter States
  const defaults = getShiftDefaults();
  const [shiftType, setShiftType] = useState<"day" | "night" | "full">(defaults.type);
  const [selectedDate, setSelectedDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);

  // Station Data States
  const [stationData, setStationData] = useState<StationReportRow[]>([]);
  const [latestGpsTime, setLatestGpsTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");

  // Load Vendor and find truck gps_id
  useEffect(() => {
    async function loadVendorData() {
      setLoadingVendor(true);
      try {
        const res = await listRecords<Vendor>("vendors");
        let foundGpsId: string | null = null;
        let foundVendor: Vendor | null = null;

        for (const v of res.records) {
          if (v.trucks) {
            const t = v.trucks.find((trk) => trk.plate && trk.plate.trim() === rawPlate.trim());
            if (t) {
              foundVendor = v;
              foundGpsId = t.gps_id || null;
              break;
            }
          }
        }

        setVendor(foundVendor);
        setGpsId(foundGpsId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVendor(false);
      }
    }
    loadVendorData();
  }, [rawPlate]);

  // Fetch Station Realtime Data
  const fetchData = useCallback(
    async (targetGpsId: string, sDate: string, sTime: string, eTime: string, sType: string) => {
      setLoading(true);
      setError("");
      setStationData([]);
      setLatestGpsTime(null);

      try {
        let payload: Record<string, string>;

        if (sType === "night") {
          const dObj = new Date(sDate);
          const nextDay = new Date(dObj.getTime() + 86400000);
          const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;

          payload = {
            gps_id: targetGpsId,
            start_period: `${sDate} 18:00:00`,
            end_period: `${nextDayStr} 06:00:00`,
          };
        } else {
          payload = {
            gps_id: targetGpsId,
            date: sDate,
            start_time: sTime,
            end_time: eTime,
          };
        }

        const res = await fetch("/api/gps/station-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as {
          error?: string;
          stations?: StationReportRow[];
          latest_gps_time?: string;
        };

        if (!res.ok) throw new Error(json.error || "Failed to fetch station data");

        setStationData(json.stations || []);
        setLatestGpsTime(json.latest_gps_time || null);

        const now = new Date();
        setLastRefreshedAt(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load station data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (gpsId) {
      fetchData(gpsId, selectedDate, startTime, endTime, shiftType);
    }
  }, [gpsId, selectedDate, startTime, endTime, shiftType, fetchData]);

  // Handler to switch shift preset
  function selectShift(type: "day" | "night" | "full") {
    setShiftType(type);
    const todayStr = getTodayDate();

    if (type === "day") {
      setSelectedDate(todayStr);
      setStartTime("06:00");
      setEndTime("18:00");
    } else if (type === "night") {
      setSelectedDate(todayStr);
      setStartTime("18:00");
      setEndTime("06:00");
    } else if (type === "full") {
      setSelectedDate(todayStr);
      setStartTime("00:00");
      setEndTime("23:59");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-6">
      {/* Sleek Compact Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 font-bold">
              <Truck size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-mono font-bold text-base text-white tracking-tight truncate">{rawPlate}</h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                  <Satellite size={9} className="animate-pulse" /> LIVE
                </span>
              </div>
              {vendor && <p className="text-[10px] text-slate-400 truncate">{vendor.name}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastRefreshedAt && <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Updated: {lastRefreshedAt}</span>}
            <button
              type="button"
              onClick={() => gpsId && fetchData(gpsId, selectedDate, startTime, endTime, shiftType)}
              disabled={loading || !gpsId}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 border border-slate-700/60"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-amber-400" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Compact Layout) */}
      <main className="max-w-2xl mx-auto px-3 pt-3 space-y-2.5">
        {loadingVendor ? (
          <div className="bg-slate-900/60 rounded-xl p-6 text-center text-slate-400 text-xs border border-slate-800">
            Loading vehicle details…
          </div>
        ) : !gpsId ? (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl p-4 text-center text-xs">
            GPS telemetry is not available for truck <span className="font-mono font-bold text-white">{rawPlate}</span>.
          </div>
        ) : (
          <>
            {/* Inline Shift Pill Switcher */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-sm w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => selectShift("day")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    shiftType === "day"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sun size={12} /> Day Shift
                </button>

                <button
                  type="button"
                  onClick={() => selectShift("night")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    shiftType === "night"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Moon size={12} /> Night Shift
                </button>

                <button
                  type="button"
                  onClick={() => selectShift("full")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    shiftType === "full"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Clock size={12} /> 24 Hours
                </button>
              </div>

              {latestGpsTime && (
                <span className="font-mono text-[10px] text-slate-400 ml-auto">
                  GPS: {latestGpsTime.includes(" ") ? latestGpsTime.split(" ")[1] : latestGpsTime}
                </span>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl p-3 text-xs text-center">
                {error}
              </div>
            )}

            {/* Timeline Visualizer Component */}
            {loading ? (
              <div className="bg-slate-900/90 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-slate-800">
                <Loader2 size={20} className="animate-spin text-amber-500" />
                <span className="text-xs">Fetching Telemetry Data…</span>
              </div>
            ) : (
              <>
                <TimelineVisualizer
                  stations={stationData}
                  startTimeStr={startTime}
                  endTimeStr={endTime}
                  latestGpsTime={latestGpsTime}
                />

                {/* Ultra-Compact Station Legs Table */}
                <div className="bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-3 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>TRANSITIONS ({stationData.length})</span>
                  </div>

                  {stationData.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No transitions recorded for this shift.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-sans uppercase tracking-wider text-slate-400 bg-slate-950/40">
                            <th className="px-2.5 py-1.5 font-semibold">#</th>
                            <th className="px-2.5 py-1.5 font-semibold">Origin</th>
                            <th className="px-2.5 py-1.5 font-semibold">Depart</th>
                            <th className="px-2.5 py-1.5 font-semibold">Destination</th>
                            <th className="px-2.5 py-1.5 font-semibold">Arrive</th>
                            <th className="px-2.5 py-1.5 font-semibold text-right">km</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {stationData.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-2.5 py-1.5 text-slate-400 text-[11px]">{i + 1}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-blue-400 truncate max-w-[90px]">{s.station_f || "—"}</td>
                              <td className="px-2.5 py-1.5 text-slate-300 text-[11px]">{s.start_time || "—"}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-emerald-400 truncate max-w-[90px]">{s.station_n || "—"}</td>
                              <td className="px-2.5 py-1.5 text-slate-300 text-[11px]">{s.end_time || "—"}</td>
                              <td className="px-2.5 py-1.5 text-right font-bold text-amber-400 text-[11px]">{s.distance || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
