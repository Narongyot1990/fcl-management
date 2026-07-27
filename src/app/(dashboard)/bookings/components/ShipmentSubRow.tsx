"use client";
import { Pencil, Trash2, Copy, Check, MapPin, Loader2, ExternalLink, Images, FileText, Package } from "lucide-react";
import type { Booking, Shipment, Vendor } from "@/lib/types";
import { toShortDateTime, toProxyUrl } from "../utils/booking-utils";

interface ShipmentSubRowProps {
  shipment: Shipment;
  booking: Booking;
  vendors: Vendor[];
  copiedId: string | null;
  openingGps: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onOpenImages: () => void;
  onOpenSingleImage: (url: string, title: string) => void;
  onOpenGps: (vendorCode: string, truckPlate: string) => void;
  onDriverProfile: (driver: { name: string; phone: string }) => void;
}

export default function ShipmentSubRow({
  shipment, booking, vendors, copiedId, openingGps,
  onEdit, onDelete, onCopy, onOpenImages, onOpenSingleImage, onOpenGps, onDriverProfile,
}: ShipmentSubRowProps) {
  const vendorCode = shipment.vendor_code || booking.vendor_code;
  const vendor = vendors.find((v) => v.code === vendorCode);
  const hasEir = !!shipment.eir_image_url;
  const hasContainer = !!shipment.container_image_url;
  const hasBothImages = hasEir && hasContainer;
  const eirProxyUrl = toProxyUrl(shipment.eir_image_url);
  const containerProxyUrl = toProxyUrl(shipment.container_image_url);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors align-top">
      <td className="px-3 py-2.5 pl-8 whitespace-nowrap">
        <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-700">
          #{shipment.shipment_no}
        </div>
        {vendorCode && vendorCode !== booking.vendor_code && (
          <div className="mt-1 text-[10px] text-slate-400">Vendor: {vendorCode}</div>
        )}
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-[10px] font-medium uppercase text-slate-400">Pickup</div>
        <div className="text-[11px] text-slate-700">{shipment.plan_pickup_date ? toShortDateTime(shipment.plan_pickup_date) : "-"}</div>
        <div className="mt-1 text-[10px] font-medium uppercase text-slate-400">ETA</div>
        <div className="text-[11px] text-slate-700">{shipment.eta ? toShortDateTime(shipment.eta) : "-"}</div>
      </td>

      <td className="px-3 py-2.5 min-w-48">
        <div className="font-mono text-[12px] font-bold text-slate-800">{shipment.container_no || "-"}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
          <span>{shipment.container_size || "No size"}</span>
          {shipment.container_size_code && <span className="font-mono text-slate-600">{shipment.container_size_code}</span>}
          <span>{shipment.tare_weight ? `${shipment.tare_weight} kg` : "No tare"}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-slate-500">Seal: {shipment.seal_no || "-"}</div>
      </td>

      <td className="px-3 py-2.5 min-w-44">
        <div className="font-mono text-[12px] font-bold text-slate-800">
          {shipment.truck_plate || "-"}
          {vendorCode && <span className="ml-1.5 font-normal text-[10px] text-slate-400">({vendorCode})</span>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDriverProfile({ name: shipment.driver_name, phone: shipment.driver_phone }); }}
          className="mt-0.5 block text-left text-[11px] text-slate-600 hover:text-blue-600"
        >
          {shipment.driver_name || "No driver"}
        </button>
        {shipment.driver_phone && <div className="text-[10px] text-slate-400">{shipment.driver_phone}</div>}
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button onClick={onCopy}
            className={`p-1.5 transition-colors ${copiedId === shipment._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"}`}
            title="Copy info">
            {copiedId === shipment._id ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {shipment.truck_plate && (
            <a href={`/gps/track/${encodeURIComponent(shipment.truck_plate)}`} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-green-600 transition-colors" title="Open GPS Tracking URL">
              <ExternalLink size={14} />
            </a>
          )}
          {shipment.truck_plate && vendor?.trucks?.some((t) => t.plate === shipment.truck_plate && t.gps_id) && (
            <button type="button" onClick={() => onOpenGps(vendorCode, shipment.truck_plate)}
              disabled={openingGps === shipment.truck_plate}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View GPS location">
              {openingGps === shipment.truck_plate ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            </button>
          )}
          {hasBothImages && (
            <button type="button" onClick={onOpenImages}
              className="p-1.5 text-purple-600 hover:bg-purple-50 transition-colors" title="View both images">
              <Images size={14} />
            </button>
          )}
          {hasEir && (
            <button type="button" onClick={() => onOpenSingleImage(eirProxyUrl, `EIR - ${booking.booking_no} #${shipment.shipment_no}`)}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View EIR image">
              <FileText size={14} />
            </button>
          )}
          {hasContainer && (
            <button type="button" onClick={() => onOpenSingleImage(containerProxyUrl, `Container - ${booking.booking_no} #${shipment.shipment_no}`)}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="View container image">
              <Package size={14} />
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
