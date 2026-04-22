"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface GpsData {
  lat: number;
  lon: number;
  speed: number;
  time: string;
  location?: string;
}

export default function GpsTrackPage() {
  const params = useParams();
  const plate = params.plate as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gpsData, setGpsData] = useState<GpsData | null>(null);

  useEffect(() => {
    async function fetchGpsAndRedirect() {
      try {
        // First, find the vendor and truck by plate
        const vendorsRes = await fetch("/api/collections/vendors");
        const vendorsData = await vendorsRes.json();
        const vendors = vendorsData.records || [];

        let foundGpsId: string | null = null;
        let foundPlate: string | null = null;

        for (const vendor of vendors) {
          if (vendor.trucks) {
            const truck = vendor.trucks.find((t: any) => 
              t.plate === plate || t.plate.replace(/\s/g, "") === plate.replace(/\s/g, "")
            );
            if (truck && truck.gps_id) {
              foundGpsId = truck.gps_id;
              foundPlate = truck.plate;
              break;
            }
          }
        }

        if (!foundGpsId) {
          setError("GPS ID not found for this truck plate");
          setLoading(false);
          return;
        }

        // Fetch GPS data
        const gpsRes = await fetch("/api/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gps_id: foundGpsId })
        });

        const gpsJson = await gpsRes.json();

        if (!gpsRes.ok || !gpsJson.lat || !gpsJson.lon) {
          setError(gpsJson.error || "Unable to fetch GPS data");
          setLoading(false);
          return;
        }

        setGpsData({
          lat: gpsJson.lat,
          lon: gpsJson.lon,
          speed: gpsJson.speed || 0,
          time: gpsJson.time || "",
          location: gpsJson.location || ""
        });

        // Redirect to Google Maps after a brief delay to show the loading state
        setTimeout(() => {
          const mapsUrl = `https://maps.google.com/?q=${gpsJson.lat},${gpsJson.lon}`;
          window.location.href = mapsUrl;
        }, 1500);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setLoading(false);
      }
    }

    if (plate) {
      fetchGpsAndRedirect();
    }
  }, [plate]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {loading ? (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Loading GPS Location</h1>
            <p className="text-slate-500 mb-4">Finding truck: <span className="font-mono font-semibold">{plate}</span></p>
            <p className="text-sm text-slate-400">Redirecting to Google Maps...</p>
          </>
        ) : error ? (
          <>
            <div className="text-6xl mb-4">📍</div>
            <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
            <p className="text-slate-600 mb-4">{error}</p>
            <p className="text-sm text-slate-400">Truck plate: <span className="font-mono">{plate}</span></p>
          </>
        ) : gpsData ? (
          <>
            <div className="text-6xl mb-4">📍</div>
            <h1 className="text-xl font-bold text-emerald-600 mb-2">Location Found!</h1>
            <div className="text-left bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-semibold">Truck:</span> <span className="font-mono">{plate}</span>
              </p>
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-semibold">Speed:</span> {gpsData.speed} km/h
              </p>
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-semibold">Time:</span> {gpsData.time}
              </p>
              <p className="text-sm text-slate-600 mb-2">
                <span className="font-semibold">Location:</span> {gpsData.location || "N/A"}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-semibold">Coordinates:</span> {gpsData.lat}, {gpsData.lon}
              </p>
            </div>
            <p className="text-sm text-slate-400">Redirecting to Google Maps...</p>
          </>
        ) : null}
      </div>
    </div>
  );
}