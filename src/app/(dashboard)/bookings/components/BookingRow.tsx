"use client";
import { Pencil, Trash2, Copy, Check, MapPin, Loader2, ExternalLink, Images, FileText, Package } from "lucide-react";
import type { Booking, Vendor } from "@/lib/types";
import { toShortDate, toShortDateTime, toProxyUrl } from "../utils/booking-utils";

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
  const vendor = vendors.find(v => v.code === booking.vendor_code);
  const hasEir = !!booking.eir_image_url;
  const hasContainer = !!booking.container_image_url;
  const hasBothImages = hasEir && hasContainer;
  const eirProxyUrl = toProxyUrl(booking.eir_image_url);
  const containerProxyUrl = toProxyUrl(booking.container_image_url);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors align-top">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="font-mono text-[12px] font-bold text-violet-700">{booking.booking_no}</div>
        <div className="mt-0.5 text-[10px] text-slate-400">{booking.booking_date ? toShortDate(booking.booking_date) : "-"}</div>
        <div className="mt-1 text-[10px] text-slate-500">{booking.customer_code || "No customer"}</div>
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-[10px] font-medium uppercase text-slate-400">Pickup</div>
        <div className="text-[11px] text-slate-700">{booking.plan_pickup_date ? toShortDateTime(booking.plan_pickup_date) : "-"}</div>
        <div className="mt-1 text-[10px] font-medium uppercase text-slate-400">ETA</div>
        <div className="text-[11px] text-slate-700">{booking.eta ? toShortDateTime(booking.eta) : "-"}</div>
      </td>

      <td className="px-3 py-2.5 min-w-48">
        <div className="font-mono text-[12px] font-bold text-slate-800">{booking.container_no || "-"}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          <span>{booking.container_size || "No size"}</span>
          {booking.container_size_code && <span className="font-mono text-slate-600">{booking.container_size_code}</span>}
          <span>{booking.tare_weight ? `${booking.tare_weight} kg` : "No tare"}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-slate-500">Seal: {booking.seal_no || "-"}</div>
      </td>

      <td className="px-3 py-2.5 min-w-44">
        <div className="font-mono text-[12px] font-bold text-slate-800">
          {booking.truck_plate || "-"}
          {booking.vendor_code && <span className="ml-1.5 font-normal text-[10px] text-slate-400">({booking.vendor_code})</span>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDriverProfile({ name: booking.driver_name, phone: booking.driver_phone }); }}
          className="mt-0.5 block text-left text-[11px] text-slate-600 hover:text-blue-600"
        >
          {booking.driver_name || "No driver"}
        </button>
        {booking.driver_phone && <div className="text-[10px] text-slate-400">{booking.driver_phone}</div>}
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onCopy(booking)}
            className={`p-1.5 transition-colors ${copiedId === booking._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"}`}
            title="Copy info">
            {copiedId === booking._id ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {booking.truck_plate && (
            <a href={`/gps/track/${encodeURIComponent(booking.truck_plate)}`} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-green-600 transition-colors" title="Open GPS Tracking URL">
              <ExternalLink size={14} />
            </a>
          )}
          {booking.truck_plate && vendor?.trucks?.some(t => t.plate === booking.truck_plate && t.gps_id) && (
            <button type="button" onClick={() => onOpenGps(booking.vendor_code, booking.truck_plate)}
              disabled={openingGps === booking.truck_plate}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View GPS location">
              {openingGps === booking.truck_plate ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            </button>
          )}
          {hasBothImages && (
            <button type="button" onClick={() => onOpenImages(eirProxyUrl, containerProxyUrl, booking)}
              className="p-1.5 text-purple-600 hover:bg-purple-50 transition-colors" title="View both images">
              <Images size={14} />
            </button>
          )}
          {hasEir && (
            <button type="button" onClick={() => onOpenSingleImage(eirProxyUrl, "EIR - " + booking.booking_no, booking)}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View EIR image">
              <FileText size={14} />
            </button>
          )}
          {hasContainer && (
            <button type="button" onClick={() => onOpenSingleImage(containerProxyUrl, "Container - " + booking.booking_no, booking)}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View container image">
              <Package size={14} />
            </button>
          )}
          <button onClick={() => onEdit(booking)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(booking)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
