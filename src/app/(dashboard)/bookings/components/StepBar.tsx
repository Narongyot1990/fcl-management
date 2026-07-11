"use client";
import { STEPS, LOADING_SUB, getStepStatuses, getStepDate, toShortDate } from "../utils/booking-utils";

interface StepBarProps {
  booking: {
    loaded_at?: string | null;
    loading_at?: string | null;
    pending_at?: string | null;
    booking_date?: string | null;
    plan_pickup_date?: string | null;
    plan_loading_date?: string | null;
    return_date?: string | null;
    plan_return_date?: string | null;
    truck_plate?: string | null;
    driver_name?: string | null;
    container_no?: string | null;
    seal_no?: string | null;
    container_size?: string | null;
    tare_weight?: string | null;
    return_completed?: boolean | null;
  };
  onStepClick?: (stepIndex: number) => void;
}

export default function StepBar({ booking, onStepClick }: StepBarProps) {
  const statuses = getStepStatuses(booking);
  let lastDone = -1;
  for (let i = statuses.length - 1; i >= 0; i--) { if (statuses[i]) { lastDone = i; break; } }

  const loadingStatus = booking.loaded_at ? "loaded" : booking.loading_at ? "loading" : (booking.pending_at ? "pending" : null);
  const loadingSub = loadingStatus ? LOADING_SUB[loadingStatus] : null;
  const activeIdx = statuses.findIndex((s) => !s);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="relative w-full py-0.5">
        <div className="absolute top-[11px] left-[10%] right-[10%] h-[3px] bg-slate-100 rounded-full" />
        {lastDone > 0 && (
          <div
            className="absolute top-[11px] left-[10%] h-[3px] bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(lastDone / (STEPS.length - 1)) * 80}%` }}
          />
        )}
        <div className="relative flex justify-between w-full">
          {STEPS.map((label, i) => {
            const done = statuses[i];
            const isCurrent = i === activeIdx;
            const isLoadingStep = i === 3;
            let dotClass = "bg-slate-100 text-slate-400 border border-slate-200";
            if (done) dotClass = "bg-emerald-500 text-white shadow-sm";
            else if (isCurrent) dotClass = "bg-white text-blue-600 border-2 border-blue-500 shadow-md ring-[4px] ring-blue-50";

            if (isLoadingStep && !done && loadingSub) {
              if (loadingStatus === "pending") {
                dotClass = "bg-white text-amber-500 border-2 border-amber-400 ring-[4px] ring-amber-50";
              } else if (loadingStatus === "loading") {
                dotClass = "bg-blue-600 text-white animate-pulse shadow-lg ring-[4px] ring-blue-100";
              }
            }

            const stepDate = getStepDate(booking, i);
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1 z-10 w-0">
                <button
                  type="button"
                  title={label}
                  onClick={() => onStepClick?.(i)}
                  className={`w-[24px] h-[24px] rounded-full text-[10px] font-black flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${dotClass} ${onStepClick ? "cursor-pointer hover:scale-110" : ""}`}
                >
                  {done ? "\u2713" : i + 1}
                </button>
                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider truncate w-full text-center leading-tight ${
                  done ? "text-slate-700" :
                  isCurrent ? (isLoadingStep && loadingSub ? loadingSub.color : "text-blue-600") :
                  "text-slate-400"
                }`}>
                  {isLoadingStep && !done && loadingSub ? loadingSub.label : label}
                </span>
                {stepDate && (
                  <span className={`text-[8px] font-medium leading-none whitespace-nowrap ${done ? "text-slate-500" : "text-slate-300"}`}>
                    {toShortDate(stepDate)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {loadingSub && loadingStatus !== "pending" && (
        <div className="flex justify-center -mt-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold ${loadingSub.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${loadingStatus === "loading" ? "bg-blue-500 animate-pulse" : "bg-emerald-500"}`} />
            {loadingSub.label}
          </span>
        </div>
      )}
    </div>
  );
}