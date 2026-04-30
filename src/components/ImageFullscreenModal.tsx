"use client";
import React from "react";
import { X, ExternalLink } from "lucide-react";
import type { Booking } from "@/lib/types";

interface ImageFullscreenModalProps {
  open: boolean;
  eirImageUrl?: string;
  containerImageUrl?: string;
  title?: string;
  booking: Booking | null;
  onClose: () => void;
}

export default function ImageFullscreenModal({
  open,
  eirImageUrl,
  containerImageUrl,
  title,
  booking,
  onClose,
}: ImageFullscreenModalProps) {
  if (!open) return null;

  const hasEir = !!eirImageUrl;
  const hasContainer = !!containerImageUrl;
  const hasBoth = hasEir && hasContainer;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">{title || "Images"}</span>
          {hasBoth && (
            <span className="px-2 py-0.5 bg-white/20 rounded text-white/80 text-xs">EIR + Container</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(hasBoth ? [eirImageUrl, containerImageUrl] : [eirImageUrl || containerImageUrl]).filter(Boolean).map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Open {hasBoth ? (i === 0 ? "EIR" : "Container") : "image"} in new tab
            </a>
          ))}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Side-by-side Images - horizontal on desktop, vertical on mobile */}
      <div className={`flex-1 w-full flex items-center justify-center gap-4 p-4 md:p-6 mt-14 mb-[120px] md:mb-[100px] ${hasBoth ? "flex-col md:flex-row" : "flex-col"}`}>
        {hasBoth ? (
          <>
            {/* EIR Image */}
            <div className={`flex flex-col items-center w-full ${hasBoth ? "md:w-1/2" : ""}`}>
              <span className="mb-2 text-white/60 text-xs font-medium uppercase tracking-wider">EIR</span>
              <div className="w-full flex items-center justify-center">
                <img
                  src={eirImageUrl}
                  alt="EIR"
                  className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            {/* Divider - horizontal on mobile, vertical on desktop */}
            <div className="w-full h-px md:w-px md:h-[55vh] bg-white/20" />
            {/* Container Image */}
            <div className={`flex flex-col items-center w-full ${hasBoth ? "md:w-1/2" : ""}`}>
              <span className="mb-2 text-white/60 text-xs font-medium uppercase tracking-wider">Container</span>
              <div className="w-full flex items-center justify-center">
                <img
                  src={containerImageUrl}
                  alt="Container"
                  className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </>
        ) : (
          <img
            src={eirImageUrl || containerImageUrl}
            alt={title || "Image"}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Bottom Dock: Combined Info */}
      {booking && (
        <div
          className="absolute bottom-4 left-4 right-4 max-w-6xl mx-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:px-8 md:py-5 shadow-2xl pointer-events-auto overflow-auto max-h-[20vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile: 2 columns, Tablet: 3 columns, Desktop: horizontal layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-row gap-4 lg:gap-8">
            {/* Booking */}
            <div className="flex flex-col min-w-[100px]">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Booking No.</span>
              <span className="text-white font-mono font-bold text-sm md:text-base">{booking.booking_no}</span>
            </div>

            {/* Container & Seal */}
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Container & Seal</span>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-amber-300 font-mono font-black text-sm md:text-base tracking-tight leading-none">{booking.container_no || "N/A"}</span>
                </div>
                <span className="text-white/80 text-xs">{booking.container_size || "—"} {booking.container_size_code ? `/ ${booking.container_size_code}` : ""}</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/50 text-[10px]">Seal:</span>
                  <span className="text-emerald-400 font-mono font-bold text-xs">{booking.seal_no || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Tare Weight */}
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Tare</span>
              <span className="text-white font-black text-sm md:text-base">{booking.tare_weight ? `${booking.tare_weight} kg` : "—"}</span>
            </div>

            {/* Driver Assignment */}
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Driver / Truck</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-medium text-xs">{booking.driver_name || "—"}</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-400 font-mono text-xs">{booking.truck_plate || "—"}</span>
                  {booking.driver_phone && <span className="text-white/60 text-[10px]">{booking.driver_phone}</span>}
                </div>
              </div>
            </div>

            {/* ETA */}
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Est. Pickup</span>
              <span className="text-white font-medium text-xs">{booking.plan_pickup_date ? new Date(booking.plan_pickup_date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>
            </div>

            {/* Return */}
            <div className="flex flex-col">
              <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Return</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-medium text-xs">{booking.return_driver_name || "—"}</span>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 font-mono text-xs">{booking.return_truck_plate || "—"}</span>
                  {booking.return_completed && <span className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded">Done</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
