"use client";
import { useEffect, useRef } from "react";

export interface GpsPoint {
  time: string;
  lat: number;
  lon: number;
  gps_speed?: number;
  status_name_th?: string;
  station_name?: string;
  station_id?: string;
  sub_district_th?: string;
  district_th?: string;
  province_th?: string;
}

interface GpsMapProps {
  points: GpsPoint[];
}

export default function GpsMap({ points }: GpsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default icon issue with webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Destroy existing map instance before creating new one
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const validPoints = points.filter((p) => p.lat && p.lon);
      if (validPoints.length === 0) return;

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: true });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Draw polyline for route
      const latlngs = validPoints.map((p) => [p.lat, p.lon] as [number, number]);
      L.polyline(latlngs, { color: "#3b82f6", weight: 2, opacity: 0.7 }).addTo(map);

      // Station icon (dark pin for named stations)
      const stationIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;
          background:#1e293b;
          border:2px solid #f8fafc;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      // Small dot icon for regular GPS points
      const dotIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:6px;height:6px;
          background:#3b82f6;
          border:1px solid #fff;
          border-radius:50%;
          opacity:0.7;
        "></div>`,
        iconSize: [6, 6],
        iconAnchor: [3, 3],
      });

      // Start marker (green)
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:12px;height:12px;
          background:#22c55e;
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      // End marker (red)
      const endIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:12px;height:12px;
          background:#ef4444;
          border:2px solid #fff;
          border-radius:50%;
          box-shadow:0 1px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      validPoints.forEach((p, i) => {
        const hasStation = !!(p.station_name && p.station_name.trim());
        const isFirst = i === 0;
        const isLast = i === validPoints.length - 1;

        let icon = dotIcon;
        if (isFirst) icon = startIcon;
        else if (isLast) icon = endIcon;
        else if (hasStation) icon = stationIcon;

        const locationStr = [p.sub_district_th, p.district_th, p.province_th].filter(Boolean).join(", ");
        const tooltipHtml = `
          <div style="font-size:11px;line-height:1.5;min-width:140px;">
            ${hasStation ? `<div style="font-weight:700;color:#1e293b;margin-bottom:2px;">📍 ${p.station_name}</div>` : ""}
            <div style="color:#475569;">${p.time}</div>
            ${p.gps_speed !== undefined ? `<div style="color:#475569;">ความเร็ว: ${p.gps_speed} km/h</div>` : ""}
            ${p.status_name_th ? `<div style="color:#475569;">${p.status_name_th}</div>` : ""}
            ${locationStr ? `<div style="color:#94a3b8;font-size:10px;">${locationStr}</div>` : ""}
          </div>`;

        const marker = L.marker([p.lat, p.lon], { icon });
        marker.bindTooltip(tooltipHtml, {
          direction: "top",
          offset: [0, -8],
          opacity: 1,
        });
        marker.addTo(map);
      });

      // Fit map to bounds
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [20, 20] });
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ height: "280px", width: "100%", borderRadius: "10px", overflow: "hidden" }} />
    </>
  );
}
