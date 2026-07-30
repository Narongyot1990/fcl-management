"use client";

import { useMemo } from "react";

export interface StationReportRow {
  station_f?: string;
  station_n?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  distance?: string | number;
}

interface TimelineVisualizerProps {
  stations: StationReportRow[];
  startTimeStr: string; // "00:00"
  endTimeStr: string;   // "23:59"
  latestGpsTime?: string | null;
}

interface Segment {
  id: string;
  type: "travel" | "depot" | "customer" | "idle";
  label: string;
  subLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distance?: string;
  leftPercent: number;
  widthPercent: number;
}

function timeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const t = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const parts = t.split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function formatDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function isDepotStation(name?: string): boolean {
  if (!name) return false;
  const upper = name.toUpperCase();
  return upper.includes("FSCC") || upper.includes("DEPOT") || upper.includes("YARD") || upper.includes("HUB") || upper.includes("PARK") || upper.includes("FLS");
}

export default function TimelineVisualizer({ stations, startTimeStr, endTimeStr, latestGpsTime }: TimelineVisualizerProps) {
  const rangeStartMin = useMemo(() => timeToMinutes(startTimeStr), [startTimeStr]);
  const rangeEndMin = useMemo(() => {
    let min = timeToMinutes(endTimeStr);
    if (min === 0) min = 1439;
    if (min <= rangeStartMin) min += 1440;
    return min;
  }, [startTimeStr, endTimeStr, rangeStartMin]);

  const totalRangeMin = Math.max(1, rangeEndMin - rangeStartMin);

  const { segments, stats } = useMemo(() => {
    if (!stations || stations.length === 0) {
      return {
        segments: [],
        stats: { avgTravelMin: 0, avgDepotMin: 0, avgCustMin: 0, totalDistKm: 0 }
      };
    }

    const segs: Segment[] = [];
    let travelSum = 0, travelCount = 0;
    let depotSum = 0, depotCount = 0;
    let custSum = 0, custCount = 0;
    let totalDistKm = 0;

    const addSeg = (
      type: "travel" | "depot" | "customer" | "idle",
      label: string,
      subLabel: string,
      startMin: number,
      endMin: number,
      sTime: string,
      eTime: string,
      dist?: string
    ) => {
      let adjustedEndMin = endMin;
      if (adjustedEndMin < startMin) adjustedEndMin += 1440;

      const clampedStart = Math.max(rangeStartMin, Math.min(rangeEndMin, startMin));
      const clampedEnd = Math.max(rangeStartMin, Math.min(rangeEndMin, adjustedEndMin));
      const dur = Math.max(1, clampedEnd - clampedStart);

      const leftPercent = ((clampedStart - rangeStartMin) / totalRangeMin) * 100;
      const widthPercent = (dur / totalRangeMin) * 100;

      if (widthPercent > 0.05) {
        segs.push({
          id: `${type}-${startMin}-${endMin}-${label}`,
          type,
          label,
          subLabel,
          startTime: sTime,
          endTime: eTime,
          durationMinutes: dur,
          distance: dist,
          leftPercent,
          widthPercent,
        });

        if (type === "travel") {
          travelSum += dur;
          travelCount++;
        } else if (type === "depot") {
          depotSum += dur;
          depotCount++;
        } else if (type === "customer") {
          custSum += dur;
          custCount++;
        }
      }
    };

    // 1. Initial gap before first leg
    const firstLegStartMin = timeToMinutes(stations[0].start_time);
    if (firstLegStartMin > rangeStartMin) {
      const stName = stations[0].station_f || "Start";
      const type = isDepotStation(stName) ? "depot" : "idle";
      addSeg(
        type,
        `Dwell @ ${stName}`,
        "Standby before departure",
        rangeStartMin,
        firstLegStartMin,
        startTimeStr,
        stations[0].start_time || startTimeStr
      );
    }

    // 2. Iterate through legs
    for (let i = 0; i < stations.length; i++) {
      const leg = stations[i];
      let legStartMin = timeToMinutes(leg.start_time);
      let legEndMin = timeToMinutes(leg.end_time);
      if (legEndMin < legStartMin) legEndMin += 1440;

      const distVal = parseFloat(String(leg.distance || 0)) || 0;
      totalDistKm += distVal;

      addSeg(
        "travel",
        `${leg.station_f || "—"} → ${leg.station_n || "—"}`,
        `Driving (${distVal.toFixed(2)} km)`,
        legStartMin,
        legEndMin,
        leg.start_time || "",
        leg.end_time || "",
        `${distVal.toFixed(2)} km`
      );

      // Ground stay segment between legs
      if (i < stations.length - 1) {
        const nextLeg = stations[i + 1];
        let nextLegStartMin = timeToMinutes(nextLeg.start_time);
        if (nextLegStartMin < legEndMin) nextLegStartMin += 1440;

        if (nextLegStartMin > legEndMin) {
          const groundStation = leg.station_n || "Station";
          const isDep = isDepotStation(groundStation);
          const type = isDep ? "depot" : "customer";

          addSeg(
            type,
            `Dwell @ ${groundStation}`,
            isDep ? "Depot Dwell" : "Customer Dwell",
            legEndMin,
            nextLegStartMin,
            leg.end_time || "",
            nextLeg.start_time || ""
          );
        }
      }
    }

    // 3. Final ground stay (clamped to latest GPS time or range end)
    const lastLegEndMin = timeToMinutes(stations[stations.length - 1].end_time);
    let actualLastMin = rangeEndMin;

    if (latestGpsTime) {
      const parsedLatestMin = timeToMinutes(latestGpsTime);
      if (parsedLatestMin > 0) {
        actualLastMin = Math.min(rangeEndMin, parsedLatestMin);
      }
    }

    if (lastLegEndMin < actualLastMin) {
      const lastStation = stations[stations.length - 1].station_n || "Station";
      const isDep = isDepotStation(lastStation);
      const type = isDep ? "depot" : "customer";

      addSeg(
        type,
        `Dwell @ ${lastStation}`,
        "Current Location",
        lastLegEndMin,
        actualLastMin,
        stations[stations.length - 1].end_time || "",
        latestGpsTime ? latestGpsTime.split(" ")[1] || endTimeStr : endTimeStr
      );
    }

    return {
      segments: segs,
      stats: {
        avgTravelMin: travelCount > 0 ? Math.round(travelSum / travelCount) : 0,
        avgDepotMin: depotCount > 0 ? Math.round(depotSum / depotCount) : 0,
        avgCustMin: custCount > 0 ? Math.round(custSum / custCount) : 0,
        totalDistKm,
      }
    };
  }, [stations, rangeStartMin, rangeEndMin, totalRangeMin, startTimeStr, endTimeStr, latestGpsTime]);

  // Generate 6 time ticks for timeline axis (24H format)
  const timeTicks = useMemo(() => {
    const ticks: { label: string; leftPercent: number }[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      let min = rangeStartMin + Math.round((totalRangeMin * i) / (count - 1));
      min = min % 1440;
      const h = Math.floor(min / 60);
      const m = min % 60;
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const leftPercent = (i / (count - 1)) * 100;
      ticks.push({ label, leftPercent });
    }
    return ticks;
  }, [rangeStartMin, totalRangeMin]);

  if (!stations || stations.length === 0) return null;

  return (
    <div className="bg-slate-900/95 text-white rounded-xl p-3 shadow-lg border border-slate-800 space-y-2 my-1">
      {/* Legend & Concise Averages Header */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 flex-wrap">
        {/* Color Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-slate-200">Driving</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-indigo-500" />
            <span className="text-slate-200">Depot Dwell</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-amber-500" />
            <span className="text-slate-200">Customer Dwell</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-slate-600" />
            <span className="text-slate-400">Idle</span>
          </div>
        </div>

        {/* Concise Average Stats */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          {stats.avgTravelMin > 0 && (
            <span>
              Avg Driving: <strong className="text-emerald-400">{formatDuration(stats.avgTravelMin)}</strong>
            </span>
          )}
          {stats.avgDepotMin > 0 && (
            <span>
              • Depot: <strong className="text-indigo-300">{formatDuration(stats.avgDepotMin)}</strong>
            </span>
          )}
          {stats.avgCustMin > 0 && (
            <span>
              • Customer: <strong className="text-amber-300">{formatDuration(stats.avgCustMin)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Clean Bar (No Text Inside Segments) */}
      <div className="relative w-full">
        <div className="relative w-full h-6 bg-slate-950/90 rounded-md overflow-hidden border border-slate-800 flex items-center shadow-inner">
          {segments.map((seg) => {
            let bgClass = "bg-slate-700 hover:bg-slate-600";
            let borderClass = "border-slate-600";
            if (seg.type === "travel") {
              bgClass = "bg-emerald-500 hover:bg-emerald-400";
              borderClass = "border-emerald-400/30";
            } else if (seg.type === "depot") {
              bgClass = "bg-indigo-600 hover:bg-indigo-500";
              borderClass = "border-indigo-400/30";
            } else if (seg.type === "customer") {
              bgClass = "bg-amber-600 hover:bg-amber-500";
              borderClass = "border-amber-400/30";
            }

            return (
              <div
                key={seg.id}
                style={{
                  left: `${seg.leftPercent}%`,
                  width: `${seg.widthPercent}%`,
                }}
                className={`absolute h-full transition-all cursor-pointer group border-r ${bgClass} ${borderClass}`}
              >
                {/* Minimal Hover Tooltip */}
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-0.5 z-50 bg-slate-950 text-white text-[11px] p-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none min-w-[140px]">
                  <div className="font-bold text-amber-400 border-b border-slate-800 pb-0.5">
                    {seg.label}
                  </div>
                  <div className="text-slate-300">
                    ⏱️ {seg.startTime.includes(" ") ? seg.startTime.split(" ")[1] : seg.startTime} – {seg.endTime.includes(" ") ? seg.endTime.split(" ")[1] : seg.endTime}
                  </div>
                  <div className="text-slate-400">
                    ⏳ Duration: <span className="text-white font-semibold">{formatDuration(seg.durationMinutes)}</span>
                  </div>
                  {seg.distance && (
                    <div className="text-emerald-400 font-semibold">
                      🛣️ Distance: {seg.distance}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 24H Time Axis Ticks */}
        <div className="relative w-full h-3 mt-0.5 text-[9px] font-mono text-slate-400 select-none">
          {timeTicks.map((tick, idx) => (
            <div
              key={idx}
              style={{ left: `${tick.leftPercent}%` }}
              className="absolute -translate-x-1/2 flex flex-col items-center"
            >
              <div className="w-0.5 h-1 bg-slate-700 mb-0.5" />
              <span>{tick.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
