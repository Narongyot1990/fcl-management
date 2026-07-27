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
  startTimeStr: string; // "06:00" or "00:00"
  endTimeStr: string;   // "23:59"
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
  // Handles "YYYY-MM-DD HH:mm:ss" or "HH:mm:ss" or "HH:mm"
  const t = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const parts = t.split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

function isDepotStation(name?: string): boolean {
  if (!name) return false;
  const upper = name.toUpperCase();
  return upper.includes("FSCC") || upper.includes("DEPOT") || upper.includes("YARD") || upper.includes("HUB") || upper.includes("PARK");
}

export default function TimelineVisualizer({ stations, startTimeStr, endTimeStr }: TimelineVisualizerProps) {
  const rangeStartMin = useMemo(() => timeToMinutes(startTimeStr), [startTimeStr]);
  const rangeEndMin = useMemo(() => {
    const min = timeToMinutes(endTimeStr);
    return min === 0 ? 1439 : min;
  }, [endTimeStr]);

  const totalRangeMin = Math.max(1, rangeEndMin - rangeStartMin);

  const { segments, summary } = useMemo(() => {
    if (!stations || stations.length === 0) {
      return {
        segments: [],
        summary: { totalTravelMin: 0, totalGroundMin: 0, totalDistKm: 0, legsCount: 0 }
      };
    }

    const segs: Segment[] = [];
    let totalTravelMin = 0;
    let totalGroundMin = 0;
    let totalDistKm = 0;

    // Helper to add segment
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
      const clampedStart = Math.max(rangeStartMin, Math.min(rangeEndMin, startMin));
      const clampedEnd = Math.max(rangeStartMin, Math.min(rangeEndMin, endMin));
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
      }
    };

    // Initial gap before first leg
    const firstLegStartMin = timeToMinutes(stations[0].start_time);
    if (firstLegStartMin > rangeStartMin) {
      const stName = stations[0].station_f || "จุดเริ่มต้น";
      const type = isDepotStation(stName) ? "depot" : "idle";
      addSeg(
        type,
        `จอดพักที่ ${stName}`,
        "สแตนบายด์ก่อนออกเดินทาง",
        rangeStartMin,
        firstLegStartMin,
        startTimeStr,
        stations[0].start_time || startTimeStr
      );
      if (type !== "idle") totalGroundMin += (firstLegStartMin - rangeStartMin);
    }

    // Iterate through legs
    for (let i = 0; i < stations.length; i++) {
      const leg = stations[i];
      const legStartMin = timeToMinutes(leg.start_time);
      const legEndMin = timeToMinutes(leg.end_time);
      const legDur = Math.max(1, legEndMin - legStartMin);
      const distVal = parseFloat(String(leg.distance || 0)) || 0;

      totalTravelMin += legDur;
      totalDistKm += distVal;

      // 1. Travel segment for current leg
      addSeg(
        "travel",
        `${leg.station_f || "—"} → ${leg.station_n || "—"}`,
        `ระยะทาง ${distVal.toFixed(2)} km`,
        legStartMin,
        legEndMin,
        leg.start_time || "",
        leg.end_time || "",
        `${distVal.toFixed(2)} km`
      );

      // 2. Ground stay segment between current leg and next leg
      if (i < stations.length - 1) {
        const nextLeg = stations[i + 1];
        const nextLegStartMin = timeToMinutes(nextLeg.start_time);

        if (nextLegStartMin > legEndMin) {
          const groundMin = nextLegStartMin - legEndMin;
          totalGroundMin += groundMin;

          const groundStation = leg.station_n || "สถานี";
          const isDep = isDepotStation(groundStation);
          const type = isDep ? "depot" : "customer";

          addSeg(
            type,
            `จอดที่ ${groundStation}`,
            isDep ? "พักคลัง / รอดำเนินการ" : "โหลดสินค้า / ทำงาน ณ จุดลูกค้า",
            legEndMin,
            nextLegStartMin,
            leg.end_time || "",
            nextLeg.start_time || ""
          );
        }
      }
    }

    // Final gap after last leg
    const lastLegEndMin = timeToMinutes(stations[stations.length - 1].end_time);
    if (lastLegEndMin < rangeEndMin) {
      const lastStation = stations[stations.length - 1].station_n || "สถานี";
      const isDep = isDepotStation(lastStation);
      const type = isDep ? "depot" : "customer";

      addSeg(
        type,
        `จอดที่ ${lastStation}`,
        "เสร็จสิ้นภารกิจประจำวัน",
        lastLegEndMin,
        rangeEndMin,
        stations[stations.length - 1].end_time || "",
        endTimeStr
      );
      totalGroundMin += (rangeEndMin - lastLegEndMin);
    }

    return {
      segments: segs,
      summary: {
        totalTravelMin,
        totalGroundMin,
        totalDistKm,
        legsCount: stations.length,
      }
    };
  }, [stations, rangeStartMin, rangeEndMin, totalRangeMin, startTimeStr, endTimeStr]);

  // Generate 6 time ticks for timeline axis
  const timeTicks = useMemo(() => {
    const ticks: { label: string; leftPercent: number }[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const min = rangeStartMin + Math.round((totalRangeMin * i) / (count - 1));
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
    <div className="bg-slate-900/95 text-white rounded-xl p-4 shadow-lg border border-slate-800 space-y-3 my-1">
      {/* Top Bar: Title & Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 tracking-wide uppercase text-[11px]">Timeline Visualizer</span>
          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono text-[10px] border border-slate-700">
            {summary.legsCount} Legs
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <div>
            <span className="text-slate-400">เคลื่อนที่:</span>{" "}
            <span className="font-bold text-emerald-400">{formatMinutes(summary.totalTravelMin)}</span>
          </div>
          <span className="text-slate-700">•</span>
          <div>
            <span className="text-slate-400">จอดพัก:</span>{" "}
            <span className="font-bold text-indigo-300">{formatMinutes(summary.totalGroundMin)}</span>
          </div>
          <span className="text-slate-700">•</span>
          <div>
            <span className="text-slate-400">ระยะทาง:</span>{" "}
            <span className="font-bold text-amber-300">{summary.totalDistKm.toFixed(2)} km</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-slate-200">เคลื่อนที่ (Travel Leg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-indigo-500 shadow-sm shadow-indigo-500/50" />
          <span className="text-slate-200">จอดพัก คลัง/CY (FSCC/Yard)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-200">จอดพัก โรงงาน/ลูกค้า</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-slate-600" />
          <span className="text-slate-400">สแตนบายด์</span>
        </div>
      </div>

      {/* Main Timeline Bar */}
      <div className="relative w-full">
        <div className="relative w-full h-9 bg-slate-950/80 rounded-lg overflow-hidden border border-slate-800 flex items-center shadow-inner">
          {segments.map((seg) => {
            let bgClass = "bg-slate-700 hover:bg-slate-600";
            let borderClass = "border-slate-600";
            if (seg.type === "travel") {
              bgClass = "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400";
              borderClass = "border-emerald-400/30";
            } else if (seg.type === "depot") {
              bgClass = "bg-indigo-600/90 hover:bg-indigo-500";
              borderClass = "border-indigo-400/30";
            } else if (seg.type === "customer") {
              bgClass = "bg-amber-600/90 hover:bg-amber-500";
              borderClass = "border-amber-400/30";
            }

            return (
              <div
                key={seg.id}
                style={{
                  left: `${seg.leftPercent}%`,
                  width: `${seg.widthPercent}%`,
                }}
                className={`absolute h-full transition-all cursor-pointer group border-r ${bgClass} ${borderClass} flex items-center justify-center overflow-hidden px-1`}
              >
                {/* Text inside bar if wide enough */}
                {seg.widthPercent > 6 && (
                  <span className="text-[9px] font-bold text-white truncate drop-shadow-md select-none">
                    {seg.label}
                  </span>
                )}

                {/* Rich Hover Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-1 z-50 bg-slate-950 text-white text-xs p-2.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap pointer-events-none min-w-[160px]">
                  <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
                    {seg.label}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    ⏱️ {seg.startTime.includes(" ") ? seg.startTime.split(" ")[1] : seg.startTime} – {seg.endTime.includes(" ") ? seg.endTime.split(" ")[1] : seg.endTime}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    ⏳ ระยะเวลา: <span className="text-white font-semibold">{formatMinutes(seg.durationMinutes)}</span>
                  </div>
                  {seg.distance && (
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      🛣️ ระยะทาง: {seg.distance}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 italic pt-0.5">
                    {seg.subLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Axis Ticks */}
        <div className="relative w-full h-4 mt-1 text-[10px] font-mono text-slate-400 select-none">
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
