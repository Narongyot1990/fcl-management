"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ImageModalInfo {
  bookingNo: string;
  containerNo?: string;
  containerSize?: string;
  containerSizeCode?: string;
  sealNo?: string;
  tareWeight?: string;
  driverName?: string;
  truckPlate?: string;
  driverPhone?: string;
  planPickupDate?: string;
  returnDriverName?: string;
  returnTruckPlate?: string;
  returnCompleted?: boolean;
  vendorCode?: string;
  jobType?: string;
  customerCode?: string;
}

interface ImageFullscreenModalProps {
  open: boolean;
  eirImageUrl?: string;
  containerImageUrl?: string;
  title?: string;
  info: ImageModalInfo | null;
  onClose: () => void;
}

interface ImageViewportProps {
  src: string;
  alt: string;
  label?: string;
  isSplit?: boolean;
}

function ImageViewport({ src, alt, label, isSplit }: ImageViewportProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset when src changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [src]);

  // Zoom helpers
  const zoomIn = () => setScale((s) => Math.min(Number((s + 0.3).toFixed(1)), 4));
  const zoomOut = () => setScale((s) => Math.max(Number((s - 0.3).toFixed(1)), 0.5));
  const zoomActual = () => {
    setScale(1.5);
    setPosition({ x: 0, y: 0 });
  };
  const resetFit = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((prev) => {
      const next = Number((prev + delta).toFixed(1));
      return Math.min(Math.max(next, 0.5), 4);
    });
  }, []);

  // Double click toggle zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1.2) {
      resetFit();
    } else {
      setScale(2.2);
    }
  };

  // Drag to pan (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch drag & pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragRef.current.startX;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.posX + dx,
      y: dragRef.current.posY + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full h-full overflow-hidden select-none ${
        isSplit ? "md:w-1/2" : "w-full"
      }`}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Label & Viewport Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        {label ? (
          <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white/90 text-xs font-semibold uppercase tracking-wider border border-white/10 pointer-events-auto">
            {label}
          </span>
        ) : <div />}

        {/* Floating Mini Toolbar */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 pointer-events-auto shadow-xl">
          <button
            type="button"
            onClick={zoomOut}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono text-white/80 min-w-[34px] text-center font-bold">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-3.5 bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={zoomActual}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-300 hover:bg-white/20 transition-colors"
            title="Actual 100% resolution"
          >
            100%
          </button>
          <button
            type="button"
            onClick={resetFit}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Fit to screen"
          >
            <Maximize2 size={13} />
          </button>
          <button
            type="button"
            onClick={rotate}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Main Image Canvas Container */}
      <div
        className={`w-full h-full flex items-center justify-center cursor-grab ${
          isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-zoom-in"
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={src}
          alt={alt}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-none"
          draggable={false}
        />
      </div>

      {/* Subtle Hint */}
      {scale === 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] text-white/40 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm hidden sm:block">
          Scroll wheel / Double-click to zoom • Drag to pan
        </div>
      )}
    </div>
  );
}

export default function ImageFullscreenModal({
  open,
  eirImageUrl,
  containerImageUrl,
  title,
  info,
  onClose,
}: ImageFullscreenModalProps) {
  const [activeTab, setActiveTab] = useState<"both" | "eir" | "container">("both");
  const [showDock, setShowDock] = useState(true);

  const hasEir = !!eirImageUrl;
  const hasContainer = !!containerImageUrl;
  const hasBoth = hasEir && hasContainer;

  // Auto-select tab when modal opens
  useEffect(() => {
    if (hasBoth) setActiveTab("both");
    else if (hasEir) setActiveTab("eir");
    else if (hasContainer) setActiveTab("container");
  }, [hasBoth, hasEir, hasContainer, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ── Top Header Bar ── */}
      <header
        className="shrink-0 h-14 px-4 md:px-6 flex items-center justify-between bg-black/50 border-b border-white/10 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm tracking-tight">{title || "Image Review"}</span>

          {/* Mode Switcher Tabs */}
          {hasBoth && (
            <div className="flex items-center bg-white/10 p-0.5 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("both")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === "both" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                Both (Split)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("eir")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === "eir" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                EIR Only
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("container")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  activeTab === "container" ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                Container Only
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Open Original Links */}
          {hasEir && (activeTab === "eir" || !hasBoth) && (
            <a
              href={eirImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} /> Open EIR Original
            </a>
          )}
          {hasContainer && (activeTab === "container" || !hasBoth) && (
            <a
              href={containerImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} /> Open Container Original
            </a>
          )}
          {hasBoth && activeTab === "both" && (
            <div className="hidden sm:flex items-center gap-2">
              <a
                href={eirImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                EIR Full
              </a>
              <a
                href={containerImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Con Full
              </a>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white hover:text-red-400 transition-colors border border-white/10 ml-2"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Viewport Area ── */}
      <main
        className="flex-1 w-full min-h-0 flex items-center justify-center p-2 md:p-4 gap-3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {activeTab === "both" && hasBoth ? (
          <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-3">
            <ImageViewport src={eirImageUrl!} alt="EIR" label="EIR Ticket" isSplit />
            <div className="hidden md:block w-px h-[85%] bg-white/15" />
            <ImageViewport src={containerImageUrl!} alt="Container" label="Container Door" isSplit />
          </div>
        ) : activeTab === "eir" || (hasEir && !hasContainer) ? (
          <ImageViewport src={eirImageUrl!} alt="EIR Document" label="EIR Document (Full Screen)" />
        ) : hasContainer ? (
          <ImageViewport src={containerImageUrl!} alt="Container Door" label="Container Photo (Full Screen)" />
        ) : null}
      </main>

      {/* ── Bottom Dock: Combined Info ── */}
      {info && (
        <footer
          className="shrink-0 relative z-30 bg-black/70 backdrop-blur-xl border-t border-white/10 transition-all duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Collapse/Expand Handle */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Booking Reference: <span className="font-mono text-white">{info.bookingNo}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDock(!showDock)}
              className="flex items-center gap-1 text-[11px] font-semibold text-white/60 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            >
              {showDock ? (
                <>
                  <span>Hide Details</span> <ChevronDown size={14} />
                </>
              ) : (
                <>
                  <span>Show Details</span> <ChevronUp size={14} />
                </>
              )}
            </button>
          </div>

          {/* Expandable Content */}
          {showDock && (
            <div className="px-4 py-3 md:px-6 md:py-4 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-6 animate-in slide-in-from-bottom-2 duration-150">
              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Container No.</p>
                <p className="font-mono font-black text-amber-300 text-sm md:text-base leading-tight">
                  {info.containerNo || "—"}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  {info.containerSize || ""} {info.containerSizeCode ? `(${info.containerSizeCode})` : ""}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Seal No.</p>
                <p className="font-mono font-bold text-emerald-400 text-sm md:text-base leading-tight">
                  {info.sealNo || "—"}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">
                  {info.tareWeight ? `Tare: ${info.tareWeight} kg` : "No Tare"}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Truck / Driver</p>
                <p className="font-mono font-bold text-blue-400 text-xs md:text-sm leading-tight">
                  {info.truckPlate || "—"}
                </p>
                <p className="text-[10px] text-white/80 truncate mt-0.5">{info.driverName || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Driver Contact</p>
                <p className="font-mono text-white/90 text-xs md:text-sm leading-tight">
                  {info.driverPhone || "—"}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Pickup Date</p>
                <p className="text-white text-xs md:text-sm font-medium leading-tight">
                  {info.planPickupDate ? info.planPickupDate.split("T")[0] : "—"}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mb-0.5">Return Status</p>
                <p className="text-xs md:text-sm font-semibold leading-tight flex items-center gap-1.5">
                  {info.returnCompleted ? (
                    <span className="text-emerald-400 font-bold">✓ Returned</span>
                  ) : (
                    <span className="text-amber-400 font-medium">In Progress</span>
                  )}
                </p>
                <p className="text-[10px] text-white/60 mt-0.5">{info.returnTruckPlate || "—"}</p>
              </div>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}


