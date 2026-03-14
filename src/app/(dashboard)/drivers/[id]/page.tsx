"use client";
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import DriverProfile from "@/components/DriverProfile";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Driver } from "@/lib/types";

// Mock data for demonstration - in real app would fetch from API
const MOCK_DRIVER: Driver = {
  _id: "test-123",
  name: "สมชาย มีรักษ์",
  phone: "081-234-5678",
  score: 92,
  rating: 4.8,
  jobs_count: 156,
  status: "on_job",
  avatar_url: "",
  joined_at: "มกราคม 2024",
  id_card_no: "1-2345-67890-12-1",
  license_no: "DL-99887766"
};

export default function DriverPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if viewing own profile (demo logic)
  const isMe = searchParams.get("view") === "me";

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setDriver(MOCK_DRIVER);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!driver) return <div>Driver not found</div>;

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/vendors" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-800">
              {isMe ? "My Personal Profile" : "Driver Profile"}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {isMe ? "Personal View" : "Administrator View"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-50/50 rounded-[40px] border border-slate-100 p-6 md:p-8">
        <DriverProfile 
          driver={driver} 
          mode={isMe ? "personal" : "visitor"} 
        />
      </div>
    </div>
  );
}
