export function toProxyUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("/api/image/")) return url;
  const match = url.match(/itl-files\/([^-]+[-_]\d+)\.[^.]+/);
  if (match) return `/api/image/${encodeURIComponent(match[1] + ".jpg")}`;
  return url;
}

export function toThaiDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
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
import { EMPTY_HEADER_FORM, EMPTY_SHIPMENT_FORM } from "../types/booking-form";

export const STEPS = ["Booking", "Assign", "Pickup", "Loading", "Return"] as const;
export const STEP_MODAL_TITLES = ["Booking", "Assign Truck", "Pickup", "Loading", "Return"] as const;
export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "Export", label: "Export" },
  { value: "Import", label: "Import" },
];
export const EMPTY_FORM = EMPTY_SHIPMENT_FORM;
export const EMPTY_HEADER = EMPTY_HEADER_FORM;

export const LOADING_SUB: Record<string, { label: string; dot: string; badge: string; color: string }> = {
  pending: { label: "Pending", dot: "border-2 border-amber-400 bg-white", badge: "bg-slate-50 text-slate-600 border-slate-200", color: "text-amber-600" },
  loading: { label: "Loading", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200", color: "text-blue-600" },
  loaded: { label: "Loaded", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "text-emerald-700" },
};

/** Step 0 ("Booking") is always done — it's the parent booking header, not part of the shipment. */
export function getStepStatuses(s: { truck_plate?: unknown; driver_name?: unknown; container_no?: unknown; seal_no?: unknown; container_size?: unknown; tare_weight?: unknown; loaded_at?: unknown; return_completed?: unknown; return_date?: unknown }): boolean[] {
  return [
    true,
    !!(s.truck_plate && s.driver_name),
    !!(s.container_no && s.seal_no && s.container_size && s.tare_weight),
    !!s.loaded_at,
    !!(s.return_completed || s.return_date),
  ];
}

export function getStepDate(bookingDate: string, s: Record<string, unknown>, idx: number): string | undefined {
  switch (idx) {
    case 0: return bookingDate || undefined;
    case 2: return s.plan_pickup_date as string;
    case 3: return (s.loaded_at as string) || (s.plan_loading_date as string);
    case 4: return (s.return_date as string) || (s.plan_return_date as string);
    default: return undefined;
  }
}