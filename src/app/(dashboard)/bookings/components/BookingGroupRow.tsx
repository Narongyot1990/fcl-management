"use client";
import { ChevronRight, ChevronDown, Plus, Pencil } from "lucide-react";
import type { BookingWithShipments, Shipment, Vendor } from "@/lib/types";
import { toShortDate } from "../utils/booking-utils";
import ShipmentSubRow from "./ShipmentSubRow";

interface BookingGroupRowProps {
  booking: BookingWithShipments;
  vendors: Vendor[];
  copiedId: string | null;
  openingGps: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onEditBooking: (booking: BookingWithShipments) => void;
  onAddShipment: (booking: BookingWithShipments) => void;
  onEditShipment: (shipment: Shipment, booking: BookingWithShipments) => void;
  onDeleteShipment: (shipment: Shipment, booking: BookingWithShipments) => void;
  onCopy: (shipment: Shipment, booking: BookingWithShipments) => void;
  onOpenImages: (eirUrl: string, containerUrl: string, shipment: Shipment, booking: BookingWithShipments) => void;
  onOpenSingleImage: (url: string, title: string, shipment: Shipment, booking: BookingWithShipments) => void;
  onOpenGps: (vendorCode: string, truckPlate: string) => void;
  onDriverProfile: (driver: { name: string; phone: string }) => void;
}

export default function BookingGroupRow({
  booking, vendors, copiedId, openingGps, expanded, onToggleExpand,
  onEditBooking, onAddShipment, onEditShipment, onDeleteShipment,
  onCopy, onOpenImages, onOpenSingleImage, onOpenGps, onDriverProfile,
}: BookingGroupRowProps) {
  const shipmentCount = booking.shipments.length;

  return (
    <>
      <tr
        className="bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer"
        onClick={onToggleExpand}
      >
        <td colSpan={5} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="text-slate-400 shrink-0" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            <div className="font-mono text-[13px] font-bold text-violet-700">{booking.booking_no}</div>
            <div className="text-[10px] text-slate-400">{booking.booking_date ? toShortDate(booking.booking_date) : "-"}</div>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {shipmentCount} shipment{shipmentCount !== 1 ? "s" : ""}
            </span>
            <div className="text-[11px] text-slate-500">{booking.customer_code || "No customer"}</div>
            <div className="text-[11px] text-slate-500">{booking.job_type}</div>
            {booking.vendor_code && <div className="text-[11px] text-slate-400">Vendor: {booking.vendor_code}</div>}

            <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onAddShipment(booking)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                title="Add shipment to this booking"
              >
                <Plus size={12} /> Add shipment
              </button>
              <button
                type="button"
                onClick={() => onEditBooking(booking)}
                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                title="Edit booking info"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        </td>
      </tr>

      {expanded && booking.shipments.map((shipment) => (
        <ShipmentSubRow
          key={shipment._id}
          shipment={shipment}
          booking={booking}
          vendors={vendors}
          copiedId={copiedId}
          openingGps={openingGps}
          onEdit={() => onEditShipment(shipment, booking)}
          onDelete={() => onDeleteShipment(shipment, booking)}
          onCopy={() => onCopy(shipment, booking)}
          onOpenImages={() => onOpenImages(shipment.eir_image_url, shipment.container_image_url, shipment, booking)}
          onOpenSingleImage={(url, title) => onOpenSingleImage(url, title, shipment, booking)}
          onOpenGps={onOpenGps}
          onDriverProfile={onDriverProfile}
        />
      ))}

      {expanded && shipmentCount === 0 && (
        <tr>
          <td colSpan={5} className="px-3 py-3 pl-10 text-[11px] text-slate-400">
            No shipments yet.
          </td>
        </tr>
      )}
    </>
  );
}
