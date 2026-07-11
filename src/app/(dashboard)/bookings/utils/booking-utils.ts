export function toProxyUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/image/")) return url;
  const match = url.match(/itl-files\/([^-]+[-_]\d+)\.[^.]+/);
  if (match) return `/api/image/${encodeURIComponent(match[1] + ".jpg")}`;
  return url;
}

export function toThaiDate(iso: string | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export function toShortDate(iso: string | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export function toShortDateTime(iso: string | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

import type { JobType } from "@/lib/types";
import { EMPTY_BOOKING_FORM } from "../types/booking-form";

export const STEPS = ["Booking", "Assign", "Pickup", "Loading", "Return"] as const;
export const STEP_MODAL_TITLES = ["Booking", "Assign Truck", "Pickup", "Loading", "Return"] as const;
export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "Export", label: "Export" },
  { value: "Import", label: "Import" },
];
export const EMPTY_FORM = EMPTY_BOOKING_FORM;

export const LOADING_SUB: Record<string, { label: string; dot: string; badge: string; color: string }> = {
  pending: { label: "Pending", dot: "border-2 border-amber-400 bg-white", badge: "bg-slate-50 text-slate-600 border-slate-200", color: "text-amber-600" },
  loading: { label: "Loading", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200", color: "text-blue-600" },
  loaded: { label: "Loaded", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "text-emerald-700" },
};

export function getStepStatuses(b: { truck_plate?: unknown; driver_name?: unknown; container_no?: unknown; seal_no?: unknown; container_size?: unknown; tare_weight?: unknown; loaded_at?: unknown; return_completed?: unknown; return_date?: unknown }): boolean[] {
  return [
    true,
    !!(b.truck_plate && b.driver_name),
    !!(b.container_no && b.seal_no && b.container_size && b.tare_weight),
    !!b.loaded_at,
    !!(b.return_completed || b.return_date),
  ];
}

export function getStepDate(b: Record<string, unknown>, idx: number): string | undefined {
  const val = b.booking_date ?? b.plan_pickup_date ?? b.loaded_at ?? b.plan_loading_date ?? b.return_date ?? b.plan_return_date;
  if (typeof val !== "string" || !val) return undefined;
  switch (idx) {
    case 0: return b.booking_date as string;
    case 2: return b.plan_pickup_date as string;
    case 3: return (b.loaded_at as string) || (b.plan_loading_date as string);
    case 4: return (b.return_date as string) || (b.plan_return_date as string);
    default: return undefined;
  }
}