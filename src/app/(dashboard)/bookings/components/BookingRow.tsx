"use client";
import { Pencil, Trash2, Copy, Check, MapPin, Loader2, ExternalLink, Images } from "lucide-react";
import type { Booking, Vendor } from "@/lib/types";
import { STEPS, LOADING_SUB, getStepStatuses, toShortDate, toShortDateTime, toProxyUrl } from "../utils/booking-utils";

interface BookingRowProps {
  booking: Booking;
  vendors: Vendor[];
  copiedId: string | null;
  openingGps: string | null;
  onEdit: (b: Booking) => void;
  onDelete: (b: Booking) => void;
  onCopy: (b: Booking) => void;
  onOpenImages: (eirUrl: string, containerUrl: string, booking: Booking) => void;
  onOpenSingleImage: (url: string, title: string, booking: Booking) => void;
  onOpenGps: (vendorCode: string, truckPlate: string) => void;
  onDriverProfile: (driver: { name: string; phone: string }) => void;
}

export default function BookingRow({
  booking, vendors, copiedId, openingGps,
  onEdit, onDelete, onCopy, onOpenImages, onOpenSingleImage, onOpenGps, onDriverProfile,
}: BookingRowProps) {
  const stepStatuses = getStepStatuses(booking);
  const currentStepIdx = stepStatuses.findIndex((s) => !s);
  const loadSt = booking.loaded_at ? "loaded" : booking.loading_at ? "loading" : booking.pending_at ? "pending" : null;
  const vendor = vendors.find(v => v.code === booking.vendor_code);

  const hasEir = !!booking.eir_image_url;
  const hasContainer = !!booking.container_image_url;
  const hasBothImages = hasEir && hasContainer;

  const eirProxyUrl = toProxyUrl(booking.eir_image_url);
  const containerProxyUrl = toProxyUrl(booking.container_image_url);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap text-[11px]">{booking.booking_date ? toShortDate(booking.booking_date) : "—"}</td>
      <td className="px-2 py-1.5 font-mono font-bold text-violet-700 whitespace-nowrap text-[11px]">{booking.booking_no}</td>
      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap text-[11px]">{booking.plan_pickup_date ? toShortDateTime(booking.plan_pickup_date) : "—"}</td>
      <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap text-[11px]">{booking.eta ? toShortDateTime(booking.eta) : "—"}</td>
      <td className="px-2 py-1.5">
        <div className="font-mono font-bold text-slate-800 text-[11px]">{booking.container_no || "—"}</div>
        <div className="text-[9px] text-slate-400 leading-tight">
          {booking.container_size || "—"} {booking.container_size_code ? `/ ${booking.container_size_code}` : ""} · {booking.tare_weight ? `${booking.tare_weight} kg` : "no tare"}
        </div>
      </td>
      <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap text-[11px]">{booking.seal_no || "—"}</td>
      <td className="px-2 py-1.5">
        <div className="font-mono font-bold text-slate-800 text-[11px]">{booking.truck_plate || "—"}</div>
        <div className="flex items-center gap-1 leading-tight">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDriverProfile({ name: booking.driver_name, phone: booking.driver_phone }); }}
            className="text-slate-600 hover:text-blue-600 text-[10px] transition-colors">
            {booking.driver_name || "—"}
          </button>
          {booking.driver_phone && <span className="text-slate-400 text-[9px]">{booking.driver_phone}</span>}
        </div>
      </td>
      <td className="px-2 py-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button onClick={() => onCopy(booking)}
            className={`p-1 rounded transition-colors ${copiedId === booking._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"}`}
            title="Copy info">
            {copiedId === booking._id ? <Check size={13} /> : <Copy size={13} />}
          </button>
          {booking.truck_plate && (
            <a href={`/gps/track/${encodeURIComponent(booking.truck_plate)}`} target="_blank" rel="noopener noreferrer"
              className="p-1 rounded text-slate-400 hover:text-green-600 transition-colors" title="Open GPS Tracking URL">
              <ExternalLink size={13} />
            </a>
          )}
          {booking.truck_plate && vendor?.trucks?.some(t => t.plate === booking.truck_plate && t.gps_id) && (
            <button type="button" onClick={() => onOpenGps(booking.vendor_code, booking.truck_plate)}
              disabled={openingGps === booking.truck_plate}
              className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors" title="View GPS location">
              {openingGps === booking.truck_plate ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
            </button>
          )}
          {/* Combined images button */}
          {hasBothImages && (
            <button
              type="button"
              onClick={() => onOpenImages(eirProxyUrl, containerProxyUrl, booking)}
              className="p-1 rounded bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
              title="View both images"
            >
              <Images size={13} />
            </button>
          )}
          {/* Individual EIR button */}
          {hasEir && (
            <button type="button" onClick={() => onOpenSingleImage(eirProxyUrl, "EIR — " + booking.booking_no, booking)}
              className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors" title="View EIR image">📄</button>
          )}
          {/* Individual Container button */}
          {hasContainer && (
            <button type="button" onClick={() => onOpenSingleImage(containerProxyUrl, "Container — " + booking.booking_no, booking)}
              className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors" title="View Container image">📦</button>
          )}
          <button onClick={() => onEdit(booking)} className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(booking)} className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}
