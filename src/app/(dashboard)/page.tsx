"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Truck, Package, ClipboardList, ArrowRight, Clock, Loader2, CheckCircle2, RotateCcw, Users, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
import { listRecords } from "@/lib/api";
import type { Booking, Vendor, Container, Customer, LoadingStatus } from "@/lib/types";

const STATUS_CFG: Record<LoadingStatus | "returned", { label: string; bg: string; text: string; badge: string; icon: typeof Clock }> = {
  pending:  { label: "Pending",  bg: "bg-amber-500",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700",   icon: Clock },
  loading:  { label: "Loading",  bg: "bg-blue-500",    text: "text-blue-700",    badge: "bg-blue-100 text-blue-700",    icon: Loader2 },
  loaded:   { label: "Loaded",   bg: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  returned: { label: "Returned", bg: "bg-slate-400",   text: "text-slate-600",   badge: "bg-slate-100 text-slate-600",   icon: RotateCcw },
};

export default function Home() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendorCount, setVendorCount] = useState(0);
  const [containerCount, setContainerCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, vRes, cRes, cusRes] = await Promise.all([
        listRecords<Booking>("bookings"),
        listRecords<Vendor>("vendors"),
        listRecords<Container>("containers"),
        listRecords<Customer>("customers"),
      ]);
      setBookings(bRes.records);
      setVendorCount(vRes.count);
      setContainerCount(cRes.count);
      setCustomerCount(cusRes.count);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusCounts = {
    pending: bookings.filter((b) => !b.return_completed && (b.loading_status || "pending") === "pending").length,
    loading: bookings.filter((b) => !b.return_completed && b.loading_status === "loading").length,
    loaded:  bookings.filter((b) => !b.return_completed && b.loading_status === "loaded").length,
    returned: bookings.filter((b) => b.return_completed).length,
  };
  const activeCount = statusCounts.pending + statusCounts.loading + statusCounts.loaded;

  const exportCount = bookings.filter((b) => b.job_type === "Export").length;
  const importCount = bookings.filter((b) => b.job_type === "Import").length;

  const recentBookings = [...bookings]
    .sort((a, b) => (b.booking_date || "").localeCompare(a.booking_date || ""))
    .slice(0, 10);

  const V = ({ n }: { n: number }) => <>{loading ? <span className="inline-block w-6 h-5 bg-slate-200 rounded animate-pulse" /> : n}</>;

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">FCL Management — ภาพรวมระบบ</p>
      </div>

      {/* ── Row 1: Key metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Bookings</span>
            <ClipboardList size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2"><V n={activeCount} /></p>
          <p className="text-[10px] text-slate-400 mt-1">จาก {loading ? "…" : bookings.length} ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendors</span>
            <Truck size={14} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2"><V n={vendorCount} /></p>
          <p className="text-[10px] text-slate-400 mt-1">ผู้ขนส่ง</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Containers</span>
            <Package size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2"><V n={containerCount} /></p>
          <p className="text-[10px] text-slate-400 mt-1">ประเภทตู้</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customers</span>
            <Users size={14} className="text-violet-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2"><V n={customerCount} /></p>
          <p className="text-[10px] text-slate-400 mt-1">ลูกค้า</p>
        </div>
      </div>

      {/* ── Row 2: Operations + Export/Import ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Operations status bar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--border)] shadow-sm p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Operations Status</h2>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(STATUS_CFG) as [string, typeof STATUS_CFG["pending"]][]).map(([key, cfg]) => {
              const count = statusCounts[key as keyof typeof statusCounts] ?? 0;
              const Icon = cfg.icon;
              return (
                <div key={key} className="text-center">
                  <div className={`mx-auto w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center mb-1.5`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="text-xl font-black text-slate-800"><V n={count} /></p>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>

          {/* Bookings per status breakdown */}
          {!loading && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
              {(Object.entries(STATUS_CFG) as [string, typeof STATUS_CFG["pending"]][]).map(([key, cfg]) => {
                const items = key === "returned"
                  ? bookings.filter((b) => b.return_completed)
                  : bookings.filter((b) => !b.return_completed && (b.loading_status || "pending") === key);
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${cfg.text}`}>{cfg.label} ({items.length})</p>
                    <div className="flex flex-col gap-0.5">
                      {items.slice(0, 5).map((b) => (
                        <Link key={b._id} href="/bookings" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.bg}`} />
                          <span className="font-mono font-bold text-violet-700 text-[11px] w-24 truncate shrink-0">{b.booking_no}</span>
                          <span className="text-[11px] text-slate-500 truncate flex-1">{b.container_no || "—"}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{b.vendor_code || ""}</span>
                          <ChevronRight size={10} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </Link>
                      ))}
                      {items.length > 5 && (
                        <span className="text-[10px] text-slate-400 pl-2">+{items.length - 5} รายการ</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Export / Import */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Export / Import</h2>
          <div className="flex gap-3">
            <div className="flex-1 bg-orange-50 rounded-lg p-3 text-center border border-orange-100">
              <ArrowUpRight size={16} className="text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-black text-slate-800"><V n={exportCount} /></p>
              <p className="text-[10px] font-bold text-orange-600 uppercase">Export</p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
              <ArrowDownLeft size={16} className="text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-black text-slate-800"><V n={importCount} /></p>
              <p className="text-[10px] font-bold text-blue-600 uppercase">Import</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Bookings ── */}
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Bookings</h2>
          <Link href="/bookings" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            ดูทั้งหมด <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">Loading…</div>
        ) : recentBookings.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">ยังไม่มี Booking</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentBookings.map((b) => {
              const status = b.return_completed ? "returned" : (b.loading_status || "pending");
              const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
              return (
                <div key={b._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.bg}`} />
                  <span className="font-mono font-bold text-violet-700 text-xs w-28 truncate shrink-0">{b.booking_no}</span>
                  <span className="text-xs text-slate-500 w-20 truncate shrink-0 hidden sm:block">{b.customer_code || "—"}</span>
                  <span className="text-[10px] text-slate-400 w-16 truncate shrink-0 hidden sm:block">{b.vendor_code || "—"}</span>
                  <span className="font-mono text-xs text-slate-600 flex-1 truncate">{b.container_no || "—"}</span>
                  {b.job_type && (
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold hidden md:inline ${b.job_type === "Export" ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                      {b.job_type}
                    </span>
                  )}
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Row 4: Quick links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/bookings", icon: ClipboardList, label: "Bookings", color: "text-violet-600 bg-violet-50" },
          { href: "/vendors", icon: Truck, label: "Vendors", color: "text-indigo-600 bg-indigo-50" },
          { href: "/containers", icon: Package, label: "Containers", color: "text-emerald-600 bg-emerald-50" },
          { href: "/customers", icon: Users, label: "Customers", color: "text-blue-600 bg-blue-50" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}
            className="group flex items-center gap-2.5 bg-white rounded-xl border border-[var(--border)] px-3.5 py-2.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} shrink-0`}><Icon size={16} /></div>
            <span className="text-xs font-semibold text-slate-700">{label}</span>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-500 ml-auto transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
