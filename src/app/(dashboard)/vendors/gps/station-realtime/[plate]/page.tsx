"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, RefreshCw, Sun, Moon, Clock, Satellite, Truck } from "lucide-react";
import TimelineVisualizer, { StationReportRow } from "@/components/TimelineVisualizer";
import { listRecords } from "@/lib/api";
import type { Vendor } from "@/lib/types";
import PageHeader from "@/components/PageHeader";

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

export default function DedicatedStationRealtimePage({ params }: { params: Promise<{ plate: string }> }) {
  const resolvedParams = use(params);
  const rawPlate = decodeURIComponent(resolvedParams.plate);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [gpsId, setGpsId] = useState<string | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);

  // Shift & Filter States
  const defaults = getShiftDefaults();
  const [shiftType, setShiftType] = useState<"day" | "night" | "full" | "custom">(defaults.type);
  const [selectedDate, setSelectedDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);

  // Station Data States
  const [stationData, setStationData] = useState<StationReportRow[]>([]);
  const [latestGpsTime, setLatestGpsTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          // Calculate 18:00 today -> 06:00 tomorrow
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
  function selectShift(type: "day" | "night" | "full" | "custom") {
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
    <div className="space-y-4">
      {/* Top Navigation & Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/vendors"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <PageHeader
          title={`Station Realtime — ${rawPlate}`}
          subtitle={vendor ? `ผู้ขนส่ง: ${vendor.name} (${vendor.code})` : "รายงานการเดินทางระหว่างสถานีแบบ Realtime"}
        />
      </div>

      {loadingVendor ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-400">Loading vendor information…</div>
      ) : !gpsId ? (
        <div className="bg-white rounded-xl p-8 text-center text-red-500 border border-red-200">
          ไม่พบ GPS ID สำหรับรถทะเบียน <span className="font-bold font-mono">{rawPlate}</span> กรุณาระบุ GPS ID ในระบบ Vendor
        </div>
      ) : (
        <>
          {/* Shift Control Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Shift Presets */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => selectShift("day")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "day"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sun size={13} /> Day Shift (06:00 - 18:00)
                </button>
                <button
                  type="button"
                  onClick={() => selectShift("night")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "night"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Moon size={13} /> Night Shift (18:00 - 06:00)
                </button>
                <button
                  type="button"
                  onClick={() => selectShift("full")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    shiftType === "full"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Clock size={13} /> Full Day (00:00 - 23:59)
                </button>
              </div>

              {/* Date & Time Selectors */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <CalendarDays size={13} className="text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setShiftType("custom");
                    }}
                    className="bg-transparent text-slate-700 font-medium focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-[10px] font-semibold text-slate-400">Time:</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setShiftType("custom");
                    }}
                    className="bg-transparent font-mono text-xs text-slate-700 focus:outline-none"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setShiftType("custom");
                    }}
                    className="bg-transparent font-mono text-xs text-slate-700 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fetchData(gpsId, selectedDate, startTime, endTime, shiftType)}
                  disabled={loading}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  title="Refresh Data"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Visualizer */}
          {loading ? (
            <div className="bg-slate-900 rounded-xl p-8 flex items-center justify-center text-slate-400">
              <Loader2 size={18} className="animate-spin mr-2 text-amber-500" /> Processing Realtime Telemetry...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-xs">{error}</div>
          ) : (
            <>
              <TimelineVisualizer
                stations={stationData}
                startTimeStr={startTime}
                endTimeStr={endTime}
                latestGpsTime={latestGpsTime}
              />

              {/* Legs Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>STATION LEGS ({stationData.length})</span>
                  {latestGpsTime && <span className="font-mono text-[10px] text-slate-400">Latest GPS: {latestGpsTime}</span>}
                </div>
                {stationData.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">ไม่พบข้อมูลการสลับสถานีในช่วงเวลานี้</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="text-left px-4 py-2.5">#</th>
                        <th className="text-left px-4 py-2.5">Departure Station</th>
                        <th className="text-left px-4 py-2.5">Departure Time</th>
                        <th className="text-left px-4 py-2.5">Arrival Station</th>
                        <th className="text-left px-4 py-2.5">Arrival Time</th>
                        <th className="text-right px-4 py-2.5">Distance (km)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stationData.map((s, i) => (
                        <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                          <td className="px-4 py-2.5 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{s.station_f || "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{s.start_date} {s.start_time}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{s.station_n || "—"}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{s.end_date} {s.end_time}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600 font-mono">{s.distance || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
