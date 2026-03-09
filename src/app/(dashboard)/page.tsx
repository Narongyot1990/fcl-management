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

  const exportCount = bookings.filter((b) => b.job_type === "Export").length;
  const importCount = bookings.filter((b) => b.job_type === "Import").length;

  const recentBookings = bookings.slice(0, 8);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">EIR Control System — ภาพรวมระบบทั้งหมด</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ── LEFT COLUMN: Operations & Recent Bookings ── */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          
          {/* Operations Section */}
          <section>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span> 
              Operations Status
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.entries(STATUS_CFG) as [LoadingStatus | "returned", typeof STATUS_CFG["pending"]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`rounded-2xl border p-5 transition-transform hover:-translate-y-1 ${cfg.color}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-1.5 rounded-lg bg-white/50 backdrop-blur-sm"><Icon size={18} /></div>
                      <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{cfg.label}</span>
                    </div>
                    <p className="text-4xl font-black mt-2">{loading ? "…" : statusCounts[key as keyof typeof statusCounts]}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Logistics Section */}
          <section>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span> 
              Logistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { href: "/vendors", icon: Truck, title: "Vendors", subtitle: "ผู้ขนส่งและเครือข่ายรถ", count: vendorCount, color: "bg-blue-50 text-blue-600" },
                { href: "/containers", icon: Package, title: "Containers", subtitle: "จัดการลานตู้คอนเทนเนอร์", count: containerCount, color: "bg-emerald-50 text-emerald-600" },
              ].map(({ href, icon: Icon, title, subtitle, count, color }) => (
                <Link key={href} href={href}
                  className="group bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}><Icon size={24} /></div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[var(--foreground)]">{title}</h2>
                    <p className="text-xs text-[var(--muted)] truncate">{subtitle}</p>
                    <p className="text-xl font-black text-[var(--foreground)] mt-1">{loading ? "…" : count}</p>
                  </div>
                  <ArrowRight size={18} className="text-[var(--muted)] group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </section>


          {/* Recent Bookings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                <span className="w-1.5 h-5 bg-violet-600 rounded-full"></span> 
                Recent Bookings
              </h2>
              <Link href="/bookings" className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">ดูทั้งหมด <ArrowRight size={14}/></Link>
            </div>
            
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking No.</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Container</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td></tr>
                    ) : recentBookings.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--muted)]">ยังไม่มี Booking</td></tr>
                    ) : (
                      recentBookings.map((b) => {
                        const status = b.return_completed ? "returned" : (b.loading_status || "pending");
                        const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
                        return (
                          <tr key={b._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-violet-700">{b.booking_no}</td>
                            <td className="px-5 py-3 text-[var(--foreground)] font-medium">{b.vendor_code || "—"}</td>
                            <td className="px-5 py-3 font-mono text-xs text-slate-600">{b.container_no || "—"}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="px-5 py-3">
                              {b.return_completed
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-100 text-green-800">Done</span>
                                : <span className="text-[var(--muted)] text-xl leading-none">&middot;</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col divide-y divide-[var(--border)]">
                 {loading ? (
                    <div className="px-5 py-10 text-center text-[var(--muted)] text-sm">Loading…</div>
                  ) : recentBookings.length === 0 ? (
                    <div className="px-5 py-10 text-center text-[var(--muted)] text-sm">ยังไม่มี Booking</div>
                  ) : (
                    recentBookings.map((b) => {
                      const status = b.return_completed ? "returned" : (b.loading_status || "pending");
                      const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG];
                      return (
                        <div key={b._id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/80 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-violet-700 text-sm">{b.booking_no}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Vendor</p>
                              <p className="text-xs text-[var(--foreground)] font-medium truncate mt-0.5">{b.vendor_code || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Container</p>
                              <p className="text-xs font-mono text-slate-600 truncate mt-0.5">{b.container_no || "—"}</p>
                            </div>
                          </div>
                          
                          {b.return_completed && (
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-800">Return Done</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
              </div>
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN: Export/Import ── */}
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2 mb-4">
              <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span> 
              Export / Import
            </h2>
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Export</h3>
                  <p className="text-3xl font-black text-slate-800 mt-1">{loading ? "…" : exportCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <ArrowRight size={24} className="-rotate-45" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Import</h3>
                  <p className="text-3xl font-black text-slate-800 mt-1">{loading ? "…" : importCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ArrowRight size={24} className="rotate-135" />
                </div>
              </div>
              
              <Link href="/bookings" className="mt-2 group bg-slate-800 text-white rounded-2xl p-5 shadow-md flex items-center justify-between hover:bg-slate-700 transition-all">
                <div>
                  <h3 className="text-sm font-medium opacity-80">All Bookings</h3>
                  <p className="text-2xl font-black mt-1">{loading ? "…" : bookings.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ClipboardList size={20} />
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
