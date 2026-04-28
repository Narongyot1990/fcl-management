"use client";
import React from "react";
import {
  Pencil,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Loader2,
} from "lucide-react";
import type { Booking, Vendor, Driver } from "@/lib/types";
import { toProxyUrl } from "@/app/(dashboard)/bookings/utils/booking-utils";

interface BookingActionsProps {
  booking: Booking;
  vendors: Vendor[];
  copiedId: string | null;
  openingGps: string | null;
  onCopy: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
  onOpenGpsLocation: (vendorCode: string, truckPlate: string) => void;
  onOpenImage: (url: string, title: string, booking: Booking) => void;
  onDriverProfile: (driver: Driver) => void;
}

export default function BookingActions({
  booking,
  vendors,
  copiedId,
  openingGps,
  onCopy,
  onEdit,
  onDelete,
  onOpenGpsLocation,
  onOpenImage,
  onDriverProfile,
}: BookingActionsProps) {
  const hasGps =
    vendors.find((v) => v.code === booking.vendor_code)?.trucks?.some(
      (t) => t.plate === booking.truck_plate && t.gps_id
    ) ?? false;

  const handleDriverClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDriverProfile({ name: booking.driver_name, phone: booking.driver_phone });
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Copy pickup info */}
      <button
        onClick={() => onCopy(booking)}
        className={`p-1 rounded transition-colors ${
          copiedId === booking._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"
        }`}
        title="Copy info"
      >
        {copiedId === booking._id ? <Check size={13} /> : <Copy size={13} />}
      </button>

      {/* GPS tracking URL */}
      {booking.truck_plate && (
        <a
          href={`/gps/track/${encodeURIComponent(booking.truck_plate)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded text-slate-400 hover:text-green-600 transition-colors"
          title="Open GPS Tracking URL"
        >
          <ExternalLink size={13} />
        </a>
      )}

      {/* GPS location (real-time) */}
      {booking.truck_plate && hasGps && (
        <button
          type="button"
          onClick={() => onOpenGpsLocation(booking.vendor_code, booking.truck_plate)}
          disabled={openingGps === booking.truck_plate}
          className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
          title="View GPS location"
        >
          {openingGps === booking.truck_plate ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <MapPin size={13} />
          )}
        </button>
      )}

      {/* EIR image */}
      {booking.eir_image_url && (
        <button
          type="button"
          onClick={() =>
            onOpenImage(
              toProxyUrl(booking.eir_image_url),
              `EIR — ${booking.booking_no}`,
              booking
            )
          }
          className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
          title="View EIR image"
        >
          📄
        </button>
      )}

      {/* Container image */}
      {booking.container_image_url && (
        <button
          type="button"
          onClick={() =>
            onOpenImage(
              toProxyUrl(booking.container_image_url),
              `Container — ${booking.booking_no}`,
              booking
            )
          }
          className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
          title="View Container image"
        >
          📦
        </button>
      )}

      {/* Edit */}
      <button
        onClick={() => onEdit(booking)}
        className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
        title="Edit"
      >
        <Pencil size={13} />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(booking)}
        className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
