"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2, RefreshCw, Sun, Moon, Clock, Satellite, MapPin, Truck, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-white font-sans pb-12">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
              <Truck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-extrabold text-lg text-white tracking-tight truncate">{rawPlate}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <Satellite size={10} className="animate-pulse" /> LIVE
                </span>
              </div>
              {vendor && <p className="text-xs text-slate-400 truncate">{vendor.name}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => gpsId && fetchData(gpsId, selectedDate, startTime, endTime, shiftType)}
            disabled={loading || !gpsId}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 disabled:opacity-50 border border-slate-700/60"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-amber-400" : ""} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {loadingVendor ? (
          <div className="bg-slate-900/60 rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-800">
            Loading vehicle details…
          </div>
        ) : !gpsId ? (
          <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-2xl p-6 text-center text-sm">
            GPS telemetry is not available for truck <span className="font-mono font-bold text-white">{rawPlate}</span>.
          </div>
        ) : (
          <>
            {/* Shift Pill Selector */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-2.5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                <span className="font-semibold text-slate-300">SHIFT MONITORING</span>
                {lastRefreshedAt && <span className="text-[10px] font-mono text-slate-400">Updated: {lastRefreshedAt}</span>}
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => selectShift("day")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "day"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Sun size={13} /> Day Shift
                </button>

                <button
                  type="button"
                  onClick={() => selectShift("night")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "night"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Moon size={13} /> Night Shift
                </button>

                <button
                  type="button"
                  onClick={() => selectShift("full")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "full"
                      ? "bg-slate-800 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Clock size={13} /> 24 Hours
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950/40 border border-red-800/60 text-red-300 rounded-2xl p-4 text-xs text-center">
                {error}
              </div>
            )}

            {/* Timeline Visualizer Component */}
            {loading ? (
              <div className="bg-slate-900/90 rounded-2xl p-10 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-slate-800">
                <Loader2 size={24} className="animate-spin text-amber-500" />
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

                {/* Mobile Cards / List View */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400">
                    <span>STATION TRANSITIONS ({stationData.length})</span>
                    {latestGpsTime && (
                      <span className="font-mono text-[10px] text-slate-400">
                        GPS Time: {latestGpsTime.includes(" ") ? latestGpsTime.split(" ")[1] : latestGpsTime}
                      </span>
                    )}
                  </div>

                  {stationData.length === 0 ? (
                    <div className="bg-slate-900/60 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-800">
                      No station transitions recorded during this shift period.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {stationData.map((s, i) => (
                        <div
                          key={i}
                          className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-mono shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-blue-400 font-semibold truncate">{s.station_f || "—"}</span>
                              <ChevronRight size={12} className="text-slate-600 shrink-0" />
                              <span className="text-emerald-400 font-semibold truncate">{s.station_n || "—"}</span>
                            </div>
                            <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0 text-[11px]">
                              {s.distance || "0.00"} km
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 font-mono text-slate-400">
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-sans">Departed</span>
                              <span className="text-slate-200">{s.start_time || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-sans">Arrived</span>
                              <span className="text-slate-200">{s.end_time || "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-3xl mx-auto px-4 mt-8 text-center text-[10px] text-slate-400 font-mono">
        FCL Realtime Fleet Monitor System
      </footer>
    </div>
  );
}
