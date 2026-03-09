"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Truck, Package, ClipboardList, ArrowRight, Clock, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { listRecords } from "@/lib/api";
import type { Booking, Vendor, Container, LoadingStatus } from "@/lib/types";

const STATUS_CFG: Record<LoadingStatus | "returned", { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  loading: { label: "Loading", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2 },
  loaded: { label: "Loaded", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  returned: { label: "Returned", color: "bg-slate-100 text-slate-800 border-slate-200", icon: RotateCcw },
};

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [containerCount, setContainerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, vRes, cRes] = await Promise.all([
        listRecords<Booking>("bookings"),
        listRecords<Vendor>("vendors"),
        listRecords<Container>("containers"),
      ]);
      setBookings(bRes.records);
      setVendorCount(vRes.count);
      setContainerCount(cRes.count);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──
  const statusCounts = {
    pending: bookings.filter((b) => !b.return_completed && (b.loading_status || "pending") === "pending").length,
    loading: bookings.filter((b) => !b.return_completed && b.loading_status === "loading").length,
    loaded: bookings.filter((b) => !b.return_completed && b.loading_status === "loaded").length,
    returned: bookings.filter((b) => b.return_completed).length,
  };

  const recentBookings = bookings.slice(0, 8);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">EIR Control System — ติดตามสถานะ Booking ทั้งหมด</p>
      </div>

      {/* ── Status cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(Object.entries(STATUS_CFG) as [LoadingStatus | "returned", typeof STATUS_CFG["pending"]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={key} className={`rounded-2xl border p-5 ${cfg.color}`}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">{cfg.label}</span>
              </div>
              <p className="text-3xl font-bold">{loading ? "…" : statusCounts[key as keyof typeof statusCounts]}</p>
            </div>
          );
        })}
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { href: "/vendors", icon: Truck, title: "Vendors", count: vendorCount, color: "bg-blue-50 text-blue-600" },
          { href: "/containers", icon: Package, title: "Containers", count: containerCount, color: "bg-emerald-50 text-emerald-600" },
          { href: "/bookings", icon: ClipboardList, title: "Bookings", count: bookings.length, color: "bg-violet-50 text-violet-600" },
        ].map(({ href, icon: Icon, title, count, color }) => (
          <Link key={href} href={href}
            className="group bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shrink-0`}><Icon size={20} /></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
              <p className="text-2xl font-bold text-[var(--foreground)]">{loading ? "…" : count}</p>
            </div>
            <ArrowRight size={16} className="text-[var(--muted)] group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Recent bookings table ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Bookings ล่าสุด</h3>
          <Link href="/bookings" className="text-xs text-blue-600 hover:text-blue-700 font-medium">ดูทั้งหมด →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking No.</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Container</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Return</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">Loading…</td></tr>
              ) : recentBookings.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">ยังไม่มี Booking</td></tr>
              ) : (
                recentBookings.map((b) => {
                  const status = b.return_completed ? "returned" : (b.loading_status || "pending");
                  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
                  return (
                    <tr key={b._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 font-mono font-medium text-violet-700">{b.booking_no}</td>
                      <td className="px-5 py-2.5">{b.vendor_code || "—"}</td>
                      <td className="px-5 py-2.5 font-mono text-xs">{b.container_no || "—"}</td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        {b.return_completed
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Done</span>
                          : <span className="text-[var(--muted)]">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
