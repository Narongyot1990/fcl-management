"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Pencil, Trash2, Search, ChevronDown, ChevronUp, ChevronRight, CalendarDays, Copy, Check, ZoomIn, X, MapPin, Loader2, Phone } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import GeminiOcrButton from "@/components/GeminiOcrButton";
import { containerNoMessage } from "@/lib/containerValidation";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Booking, Vendor, Container, Customer, LoadingStatus, JobType } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";

// ── Collapsible section (form) ───────────────────────────────────────────────
function Section({ title, icon, children, cols = 2, defaultOpen = true }: { title: string; icon?: string; children: React.ReactNode; cols?: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100 transition-colors text-left">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </span>
        {open ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
      </button>
      {open && <div className={`px-3.5 py-3 grid gap-3 grid-cols-1 ${cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>{children}</div>}
    </div>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
      <span className="text-sm text-[var(--foreground)]">{label}</span>
    </label>
  );
}



// ── Step Progress Bar (5 steps) ──────────────────────────────────────────────
const STEPS = ["Booking", "Assign", "Pickup", "Loading", "Return"];

const LOADING_SUB: Record<string, { label: string; dot: string; badge: string; color: string }> = {
  pending:  { label: "รอโหลด",       dot: "border-2 border-amber-400 bg-white", badge: "bg-slate-50 text-slate-600 border-slate-200", color: "text-amber-600" },
  loading:  { label: "กำลังโหลด",    dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200", color: "text-blue-600" },
  loaded:   { label: "โหลดเสร็จแล้ว", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", color: "text-emerald-700" },
};

function getStepStatuses(b: Booking): boolean[] {
  const booking = true; // always done once created
  const assign = !!(b.truck_plate && b.driver_name);
  const pickup = !!(b.container_no && b.seal_no && b.container_size && b.tare_weight);
  const loading = !!b.loaded_at;
  const returned = !!b.return_completed || !!b.return_date;
  return [booking, assign, pickup, loading, returned];
}

function getStepDate(b: Booking, idx: number): string | undefined {
  switch (idx) {
    case 0: return b.booking_date;
    case 1: return undefined;
    case 2: return b.plan_pickup_date;
    case 3: return b.loaded_at || b.plan_loading_date;
    case 4: return b.return_date || b.plan_return_date;
    default: return undefined;
  }
}

function StepBar({ booking }: { booking: Booking }) {
  const statuses = getStepStatuses(booking);
  // Find highest completed step index for active line
  let lastDone = -1;
  for (let i = statuses.length - 1; i >= 0; i--) { if (statuses[i]) { lastDone = i; break; } }

  // Loading sub-state
  const loadingStatus = booking.loaded_at ? "loaded" : booking.loading_at ? "loading" : (booking.pending_at ? "pending" : null);
  const loadingSub = loadingStatus ? LOADING_SUB[loadingStatus] : null;

  // Active step = first incomplete step (for "current" highlight)
  const activeIdx = statuses.findIndex((s) => !s);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Progress dots + line */}
      <div className="relative w-full py-0.5">
        {/* Background Line */}
        <div className="absolute top-[11px] left-[10%] right-[10%] h-[3px] bg-slate-100 rounded-full" />
        {/* Active Line Fill */}
        {lastDone > 0 && (
          <div
            className="absolute top-[11px] left-[10%] h-[3px] bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${(lastDone / (STEPS.length - 1)) * 80}%` }}
          />
        )}

        <div className="relative flex justify-between w-full">
          {STEPS.map((label, i) => {
            const done = statuses[i];
            const isCurrent = i === activeIdx;
            // Special: Loading step shows sub-state color when active
            const isLoadingStep = i === 3;
            let dotClass = "bg-slate-100 text-slate-400 border border-slate-200";
            if (done) dotClass = "bg-emerald-500 text-white shadow-sm";
            else if (isCurrent) dotClass = "bg-white text-blue-600 border-2 border-blue-500 shadow-md ring-[4px] ring-blue-50";
            
            if (isLoadingStep && !done && loadingSub) {
              if (loadingStatus === "pending") {
                dotClass = "bg-white text-amber-500 border-2 border-amber-400 ring-[4px] ring-amber-50";
              } else if (loadingStatus === "loading") {
                dotClass = "bg-blue-600 text-white animate-pulse shadow-lg ring-[4px] ring-blue-100";
              }
            }

            const stepDate = getStepDate(booking, i);
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1 z-10 w-0">
                <div
                  title={label}
                  className={`w-[24px] h-[24px] rounded-full text-[10px] font-black flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${dotClass}`}
                >
                  {done ? "\u2713" : i + 1}
                </div>
                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider truncate w-full text-center leading-tight ${
                  done ? "text-slate-700" : 
                  isCurrent ? (isLoadingStep && loadingSub ? loadingSub.color : "text-blue-600") : 
                  "text-slate-400"
                }`}>
                  {isLoadingStep && !done && loadingSub ? loadingSub.label : label}
                </span>
                {stepDate && (
                  <span className={`text-[8px] font-medium leading-none whitespace-nowrap ${done ? "text-slate-500" : "text-slate-300"}`}>
                    {toShortDate(stepDate)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading sub-state badge de-emphasized if pending */}
      {loadingSub && loadingStatus !== "pending" && (
        <div className="flex justify-center -mt-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold ${loadingSub.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${loadingStatus === "loading" ? "bg-blue-500 animate-pulse" : "bg-emerald-500"}`} />
            {loadingSub.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Convert any image URL to our proxy URL (handles old direct blob URLs) ────
function toProxyUrl(url: string | undefined): string {
  if (!url) return "";
  // Already a proxy URL
  if (url.startsWith("/api/image/")) return url;
  // Direct blob URL (e.g. https://xxx.public.blob.vercel-storage.com/itl-files/eir_123-xxx.jpg)
  // Extract the base filename from the path
  const match = url.match(/itl-files\/([^-]+[-_]\d+)\.[^.]+/);
  if (match) return `/api/image/${encodeURIComponent(match[1] + ".jpg")}`;
  // Other external URLs — return as-is
  return url;
}

// ── Small helper to render "—" when empty ────────────────────────────────────
const D = ({ v }: { v: string | undefined }) => <>{v || "\u2014"};</>;

// ── Thai date formatter ────────────────────────────────────────────────────────
const toThaiDate = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

// ── Short date formatter (dd/MM) ─────────────────────────────────────────────
const toShortDate = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
};

// ── BookingForm interface ────────────────────────────────────────────────────
interface BookingForm {
  booking_date: string;
  booking_no: string;
  job_type: JobType;
  customer_code: string;
  vendor_code: string;
  truck_plate: string;
  driver_name: string;
  driver_phone: string;
  plan_pickup_date: string;
  container_no: string;
  container_size: string;
  container_size_code: string;
  tare_weight: string;
  seal_no: string;
  eir_image_url: string;
  container_image_url: string;
  loading_status: LoadingStatus;
  plan_loading_date: string;
  pending_at: string;
  loading_at: string;
  loaded_at: string;
  plan_return_date: string;
  return_truck_plate: string;
  return_driver_name: string;
  return_driver_phone: string;
  gcl_received: boolean;
  return_date: string;
  return_completed: boolean;
}

const EMPTY_FORM: BookingForm = {
  booking_date: "", booking_no: "", job_type: "Export", customer_code: "", vendor_code: "",
  truck_plate: "", driver_name: "", driver_phone: "", plan_pickup_date: "",
  container_no: "", container_size: "", container_size_code: "",
  tare_weight: "", seal_no: "", eir_image_url: "", container_image_url: "",
  loading_status: "pending", plan_loading_date: "", pending_at: "", loading_at: "", loaded_at: "",
  plan_return_date: "", return_truck_plate: "", return_driver_name: "", return_driver_phone: "",
  gcl_received: false, return_date: "", return_completed: false,
};

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "Export", label: "Export" },
  { value: "Import", label: "Import" },
];

// ── Number of table columns for colSpan ──────────────────────────────────────
const COLS = 13;

export default function BookingsPage() {
  const [records, setRecords] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");
  const [imageModalTitle, setImageModalTitle] = useState("");
  const [imageModalBooking, setImageModalBooking] = useState<Booking | null>(null);
  const [openingGps, setOpeningGps] = useState<string | null>(null);

  function openImageModal(url: string, title: string, booking: Booking) {
    setImageModalUrl(url);
    setImageModalTitle(title);
    setImageModalBooking(booking);
    setImageModalOpen(true);
  }

  async function openLocationInGoogleMaps(vendorCode: string, truckPlate: string) {
    if (openingGps) return; // Prevent multiple clicks

    // Find the vendor
    const vendor = vendors.find(v => v.code === vendorCode);
    if (!vendor) {
      alert("ไม่พบข้อมูล Vendor สำหรับรายการนี้");
      return;
    }

    // Find the truck to get GPS ID
    // Check in both the new 'trucks' array and fallback safely, though old ones won't have it
    const truck = vendor.trucks?.find(t => t.plate === truckPlate);
    const gpsId = truck?.gps_id;

    if (!gpsId) {
      alert("รถคันนี้ยังไม่ได้ตั้งค่า GPS ID ในระบบ Vendor");
      return;
    }

    setOpeningGps(truckPlate);
    try {
      const response = await fetch("/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gps_id: gpsId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch GPS data from DTC API");
      }

      if (data.lat && data.lon) {
        // Open Google Maps in a new tab
        const mapsUrl = `https://maps.google.com/?q=${data.lat},${data.lon}`;
        window.open(mapsUrl, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No coordinate data found");
      }

    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลพิกัด GPS");
    } finally {
      setOpeningGps(null);
    }
  }

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listRecords<Booking>("bookings", search ? { booking_no: search } : {});
      setRecords(res.records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [vRes, cRes, cusRes] = await Promise.all([
        listRecords<Vendor>("vendors"),
        listRecords<Container>("containers"),
        listRecords<Customer>("customers"),
      ]);
      setVendors(vRes.records);
      setContainers(cRes.records);
      setCustomers(cusRes.records);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  // ── Group bookings by booking_date sorted desc ──
  const grouped = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const da = a.booking_date || ""; const db = b.booking_date || "";
      if (da !== db) return db.localeCompare(da); // date desc
      return (a.booking_no || "").localeCompare(b.booking_no || ""); // booking_no asc
    });
    const map = new Map<string, Booking[]>();
    for (const b of sorted) {
      const key = b.booking_date || "No Date";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [records]);

  function toggleGroup(date: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  function toggleCard(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Selected vendor helpers ──
  const selectedVendor = vendors.find((v) => v.code === form.vendor_code);
  const truckPlateOptions = (selectedVendor?.truck_plates || []).map((p) => ({ value: p, label: p }));
  const driverOptions = (selectedVendor?.drivers || []).map((d) => ({ value: d.name, label: d.name }));

  function handleVendorChange(code: string) {
    setForm((f) => ({ ...f, vendor_code: code, truck_plate: "", driver_name: "", driver_phone: "" }));
  }

  function handleDriverChange(name: string) {
    const driver = selectedVendor?.drivers?.find((d) => d.name === name);
    setForm((f) => ({ ...f, driver_name: name, driver_phone: driver?.phone ?? "" }));
  }

  function handleReturnDriverChange(name: string) {
    const driver = selectedVendor?.drivers?.find((d) => d.name === name);
    setForm((f) => ({ ...f, return_driver_name: name, return_driver_phone: driver?.phone ?? "" }));
  }

  // ── Container dropdown helpers ──
  const sizeOptions = [...new Map(containers.map((c) => [c.size, c])).values()].map((c) => ({ value: c.size, label: c.size }));
  const codeOptions = containers.filter((c) => !form.container_size || c.size === form.container_size).map((c) => ({ value: c.code, label: c.code }));

  function handleSizeChange(size: string) {
    const match = containers.find((c) => c.size === size);
    setForm((f) => ({ ...f, container_size: size, container_size_code: match?.code ?? "" }));
  }

  function handleCodeChange(code: string) {
    const match = containers.find((c) => c.code === code);
    setForm((f) => ({ ...f, container_size_code: code, container_size: match?.size ?? f.container_size }));
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }

  function openEdit(b: Booking) {
    setEditing(b);
    setForm({
      booking_date: b.booking_date ?? "",
      booking_no: b.booking_no ?? "",
      job_type: b.job_type ?? "Export",
      customer_code: b.customer_code ?? "",
      vendor_code: b.vendor_code ?? "",
      truck_plate: b.truck_plate ?? "",
      driver_name: b.driver_name ?? "",
      driver_phone: b.driver_phone ?? "",
      plan_pickup_date: b.plan_pickup_date ?? "",
      container_no: b.container_no ?? "",
      container_size: b.container_size ?? "",
      container_size_code: b.container_size_code ?? "",
      tare_weight: b.tare_weight ?? "",
      seal_no: b.seal_no ?? "",
      eir_image_url: toProxyUrl(b.eir_image_url),
      container_image_url: toProxyUrl(b.container_image_url),
      loading_status: b.loading_status ?? "pending",
      plan_loading_date: b.plan_loading_date ?? "",
      pending_at: b.pending_at ?? "",
      loading_at: b.loading_at ?? "",
      loaded_at: b.loaded_at ?? "",
      plan_return_date: b.plan_return_date ?? "",
      return_truck_plate: b.return_truck_plate ?? "",
      return_driver_name: b.return_driver_name ?? "",
      return_driver_phone: b.return_driver_phone ?? "",
      gcl_received: b.gcl_received ?? false,
      return_date: b.return_date ?? "",
      return_completed: b.return_completed ?? false,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateRecord("bookings", editing._id, form as unknown as Record<string, unknown>);
      } else {
        await createRecord<Booking>("bookings", form as unknown as Record<string, unknown>);
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecord("bookings", deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  // Copy booking pickup info to clipboard for email
  function copyPickupInfo(b: Booking) {
    const text = [
      b.booking_no,
      b.container_size,
      b.container_size_code,
      b.container_no,
      b.seal_no,
      b.tare_weight,
      b.driver_name,
      b.driver_phone,
      b.truck_plate,
    ].join("\t");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(b._id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const set = (k: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Bookings" subtitle="จัดการ Booking" onAdd={openCreate}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา Booking No…"
            className="pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
        </div>
      </PageHeader>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      {/* ── Bookings grouped by date ── */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm px-5 py-10 text-center text-[var(--muted)]">Loading…</div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm px-5 py-10 text-center text-[var(--muted)]">ยังไม่มี Booking กด Add New เพื่อสร้าง</div>
        ) : (
          Array.from(grouped.entries()).map(([date, bookings]) => {
            const isCollapsed = collapsed.has(date);
            return (
              <div key={date} className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                {/* ── Date header ── */}
                <button type="button" onClick={() => toggleGroup(date)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-blue-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{date === "No Date" ? "— ไม่มีวันที่ —" : toThaiDate(date)}</span>
                    <span className="text-xs text-slate-400 ml-1">({bookings.length} รายการ)</span>
                  </div>
                  {isCollapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                </button>

                {/* ── Booking cards ── */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3 bg-slate-50/50">
                    {bookings.map((b) => {
                      const isExpanded = expandedCards.has(b._id);
                      const stepStatuses = getStepStatuses(b);
                      const currentStepIdx = stepStatuses.findIndex((s) => !s);
                      const currentStepName = currentStepIdx === -1 ? "Done" : STEPS[currentStepIdx];
                      const loadSt = b.loaded_at ? "loaded" : b.loading_at ? "loading" : b.pending_at ? "pending" : null;
                      const loadBadge = currentStepIdx === 3 && loadSt ? LOADING_SUB[loadSt] : null;
                      return (
                      <div key={b._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        {/* ── Always-visible compact header ── */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer" onClick={() => toggleCard(b._id)}>
                          <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                            <span className="font-mono font-bold text-violet-700 text-xs shrink-0">{b.booking_no}</span>
                            {b.job_type && (
                              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${b.job_type === "Export" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                {b.job_type}
                              </span>
                            )}
                            <span className="text-slate-300 text-[10px] font-bold shrink-0 hidden sm:inline">|</span>
                            <span className="text-xs text-slate-500 shrink-0 truncate max-w-[120px] sm:max-w-none">{b.container_no || "—"}</span>
                            <span className="text-slate-300 text-[10px] font-bold shrink-0 hidden sm:inline">|</span>
                            <span className="text-xs text-slate-500 shrink-0 truncate max-w-[100px] sm:max-w-none">{b.customer_code || "—"}</span>
                          </div>
                          {/* Status badge */}
                          <div className="flex items-center gap-1 shrink-0">
                            {currentStepIdx === -1 ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">Done</span>
                            ) : loadBadge ? (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${loadSt === "pending" ? "bg-slate-50 text-slate-500 border-slate-200" : loadBadge.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${loadSt === "pending" ? "bg-amber-400" : loadBadge.dot} ${loadSt === "loading" ? "animate-pulse" : ""}`} />
                                {loadBadge.label}
                              </span>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${currentStepIdx >= 3 ? "bg-blue-50 text-blue-600 border border-blue-100" : currentStepIdx >= 2 ? "bg-blue-100 text-blue-700 shadow-sm" : "bg-slate-100 text-slate-500"}`}>{currentStepName}</span>
                            )}
                          </div>
                          {/* Action buttons always visible */}
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => copyPickupInfo(b)}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${copiedId === b._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"}`}
                              title="Copy ข้อมูล">
                              {copiedId === b._id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <button onClick={() => openEdit(b)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="แก้ไข"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget(b)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" title="ลบ"><Trash2 size={13} /></button>
                          </div>
                        </div>

                        {/* ── Expanded details ── */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-slate-100">
                            {/* Progress bar */}
                            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-3 mt-3"><StepBar booking={b} /></div>

                            {/* Info row */}
                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <span className="text-slate-500">Customer: <span className="font-bold text-slate-700">{b.customer_code || "—"}</span></span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-500">Vendor: <span className="font-bold text-slate-700">{b.vendor_code || "—"}</span></span>
                              {b.gcl_received && <><span className="text-slate-300">|</span><span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">GCL ✓</span></>}
                            </div>

                            {/* Container Info */}
                            <div className="border border-slate-200 rounded-lg bg-slate-50/50 p-3 relative">
                              <span className="absolute -top-2 left-3 bg-white px-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 border border-slate-100 rounded-sm">Container</span>
                              <div className="flex flex-col gap-2 mt-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-mono font-black text-sm text-slate-800 tracking-tight">{b.container_no || "—"}</span>
                                  {b.seal_no && <><span className="text-slate-300">|</span><span className="font-mono font-bold text-xs text-blue-700">{b.seal_no}</span></>}
                                </div>
                                <div className="flex gap-3 text-xs">
                                  <span className="text-slate-400">Size: <span className="font-medium text-slate-700">{b.container_size || "—"}{b.container_size_code ? ` / ${b.container_size_code}` : ""}</span></span>
                                  <span className="text-slate-400">Tare: <span className="font-medium text-slate-700">{b.tare_weight ? `${b.tare_weight} kg` : "—"}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Logistics: Pickup & Return side by side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="flex flex-col gap-1 rounded-lg bg-emerald-50/60 border border-emerald-100/80 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-600 text-white uppercase">Pickup</span>
                                  <div className="flex gap-1 ml-auto">
                                    {b.truck_plate && (() => {
                                      const hasGps = vendors.find(v => v.code === b.vendor_code)?.trucks?.some(t => t.plate === b.truck_plate && t.gps_id);
                                      if (hasGps) return (
                                        <button type="button" onClick={() => openLocationInGoogleMaps(b.vendor_code, b.truck_plate)}
                                          disabled={openingGps === b.truck_plate}
                                          className="w-5 h-5 rounded bg-blue-100 hover:bg-blue-200 border border-blue-200 flex items-center justify-center text-blue-700" title="ดูพิกัด GPS ปัจจุบัน (รถรับตู้)">
                                          {openingGps === b.truck_plate ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                        </button>
                                      );
                                      return null;
                                    })()}
                                    {b.eir_image_url && (
                                      <button type="button" onClick={() => openImageModal(toProxyUrl(b.eir_image_url), "EIR — " + b.booking_no, b)}
                                        className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 flex items-center justify-center text-[9px]" title="ดูรูป EIR">📄</button>
                                    )}
                                    {b.container_image_url && (
                                      <button type="button" onClick={() => openImageModal(toProxyUrl(b.container_image_url), "Container — " + b.booking_no, b)}
                                        className="w-5 h-5 rounded bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 flex items-center justify-center text-[9px]" title="ดูรูป Container">📦</button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-bold text-slate-700 text-xs">{b.driver_name || "—"}</span>
                                  {b.driver_phone && (
                                    <a href={`tel:${b.driver_phone.replace(/\D/g, "")}`} onClick={e => e.stopPropagation()} 
                                      className="p-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors border border-emerald-200" title={`โทร ${b.driver_phone}`}>
                                      <Phone size={10} />
                                    </a>
                                  )}
                                </div>
                                {b.truck_plate && <span className="font-mono font-bold text-emerald-800 text-[11px]">{b.truck_plate}</span>}
                              </div>
                              <div className="flex flex-col gap-1 rounded-lg bg-violet-50/60 border border-violet-100/80 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-violet-600 text-white uppercase">Return</span>
                                  <div className="flex gap-1 ml-auto">
                                    {b.return_truck_plate && (() => {
                                      const hasGps = vendors.find(v => v.code === b.vendor_code)?.trucks?.some(t => t.plate === b.return_truck_plate && t.gps_id);
                                      if (hasGps) return (
                                        <button type="button" onClick={() => openLocationInGoogleMaps(b.vendor_code, b.return_truck_plate)}
                                          disabled={openingGps === b.return_truck_plate}
                                          className="w-5 h-5 rounded bg-blue-100 hover:bg-blue-200 border border-blue-200 flex items-center justify-center text-blue-700" title="ดูพิกัด GPS ปัจจุบัน (รถคืนตู้)">
                                          {openingGps === b.return_truck_plate ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                        </button>
                                      );
                                      return null;
                                    })()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-bold text-slate-700 text-xs">{b.return_driver_name || "—"}</span>
                                  {b.return_driver_phone && (
                                    <a href={`tel:${b.return_driver_phone.replace(/\D/g, "")}`} onClick={e => e.stopPropagation()} 
                                      className="p-1 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 transition-colors border border-violet-200" title={`โทร ${b.return_driver_phone}`}>
                                      <Phone size={10} />
                                    </a>
                                  )}
                                </div>
                                {b.return_truck_plate && <span className="font-mono font-bold text-violet-800 text-[11px]">{b.return_truck_plate}</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal Form ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "แก้ไข Booking" : "สร้าง Booking ใหม่"} size="xl">
        <form onSubmit={handleSave} className="flex flex-col gap-3">

          {/* ── Booking Info ── */}
          <Section title="Booking" icon="📋" defaultOpen={!editing}>
            <FormField label="วันที่จอง">
              <Input type="date" value={form.booking_date} onChange={set("booking_date")} required />
            </FormField>
            <FormField label="Booking No.">
              <Input value={form.booking_no} onChange={set("booking_no")} placeholder="BK-2024-001" required />
            </FormField>
            <FormField label="Job Type">
              <Select value={form.job_type} onChange={set("job_type")} options={JOB_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Customer">
              <Select value={form.customer_code} onChange={set("customer_code")}
                options={customers.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))}
                placeholder="เลือก Customer…" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Vendor (ผู้ขนส่ง)">
                <Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)}
                  options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" />
              </FormField>
            </div>
          </Section>

          {/* ── Container ── */}
          <Section title="Container" icon="📦" defaultOpen={!editing}>
            <FormField
              label="Container No."
              hint={containerNoMessage(form.container_no) ?? (form.container_no.length === 11 ? "✓ ISO 6346 valid" : undefined)}
              hintType={containerNoMessage(form.container_no) ? "error" : form.container_no.length === 11 ? "success" : "default"}
            >
              <Input
                value={form.container_no}
                onChange={set("container_no")}
                placeholder="TCKU1234567"
                className={containerNoMessage(form.container_no) ? "!border-red-400 focus:!ring-red-400" : form.container_no.length === 11 ? "!border-emerald-400 focus:!ring-emerald-400" : ""}
              />
            </FormField>
            <FormField label="Seal No.">
              <Input value={form.seal_no} onChange={set("seal_no")} placeholder="หมายเลขซีล" />
            </FormField>
            <FormField label="Size" hint="e.g. 40HC">
              <Select value={form.container_size} onChange={(e) => handleSizeChange(e.target.value)}
                options={sizeOptions} placeholder="เลือก Size…" />
            </FormField>
            <FormField label="ISO Code" hint="e.g. 45G1">
              <Select value={form.container_size_code} onChange={(e) => handleCodeChange(e.target.value)}
                options={codeOptions} placeholder="เลือก Code…" />
            </FormField>
            <FormField label="Tare (kg)">
              <Input value={form.tare_weight} onChange={set("tare_weight")} placeholder="3800" />
            </FormField>
            <div />
            {/* Images + AI */}
            <div className="col-span-2 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <ImageUpload label="รูป EIR" value={form.eir_image_url} type="eir"
                  onChange={(url) => setForm((f) => ({ ...f, eir_image_url: url }))} />
                <ImageUpload label="รูป Container" value={form.container_image_url} type="container"
                  onChange={(url) => setForm((f) => ({ ...f, container_image_url: url }))} />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <GeminiOcrButton
                  containerImageUrl={form.container_image_url}
                  eirImageUrl={form.eir_image_url}
                  onResult={(r) => setForm((f) => ({
                    ...f,
                    ...(r.container_size_code ? { container_size_code: r.container_size_code } : {}),
                    ...(r.tare_weight ? { tare_weight: r.tare_weight } : {}),
                    ...(r.container_no ? { container_no: r.container_no } : {}),
                    ...(r.seal_no ? { seal_no: r.seal_no } : {}),
                  }))}
                />
                <p className="text-[10px] text-slate-400">AI อ่านจากรูปอัตโนมัติ (95%+ confidence)</p>
              </div>
            </div>
          </Section>

          {/* ── Pickup + Return side-by-side ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Pickup รับตู้" icon="🚛" defaultOpen={!editing}>
              <FormField label="Plan Pickup">
                <Input type="date" value={form.plan_pickup_date} onChange={set("plan_pickup_date")} />
              </FormField>
              <FormField label="ทะเบียนรถ">
                <Select value={form.truck_plate} onChange={set("truck_plate")}
                  options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
              </FormField>
              <FormField label="คนขับ">
                <Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)}
                  options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
              </FormField>
              <FormField label="เบอร์โทร">
                <Input value={form.driver_phone} onChange={set("driver_phone")} placeholder="Auto-fill" readOnly />
              </FormField>
            </Section>

            <Section title="Return คืนตู้" icon="🔄" defaultOpen={!editing}>
              <FormField label="Plan Return">
                <Input type="date" value={form.plan_return_date} onChange={set("plan_return_date")} />
              </FormField>
              <FormField label="ทะเบียนรถ">
                <Select value={form.return_truck_plate} onChange={set("return_truck_plate")}
                  options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
              </FormField>
              <FormField label="คนขับ">
                <Select value={form.return_driver_name} onChange={(e) => handleReturnDriverChange(e.target.value)}
                  options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
              </FormField>
              <FormField label="เบอร์โทร">
                <Input value={form.return_driver_phone} onChange={set("return_driver_phone")} placeholder="Auto-fill" readOnly />
              </FormField>
              <div className="col-span-2 flex flex-col gap-2">
                <FormField label="คืนตู้จริง">
                  <Input type="datetime-local" value={form.return_date} onChange={set("return_date")} />
                </FormField>
                <Toggle checked={form.gcl_received} onChange={(v) => setForm((f) => ({ ...f, gcl_received: v }))} label="ได้รับ GCL แล้ว" />
                <Toggle checked={form.return_completed} onChange={(v) => setForm((f) => ({ ...f, return_completed: v }))} label="คืนตู้เรียบร้อย" />
              </div>
            </Section>
          </div>

          {/* ── Loading Status ── */}
          <Section title="Loading Status" icon="📊" cols={2} defaultOpen={!editing}>
            <FormField label="Plan Loading">
              <Input type="date" value={form.plan_loading_date} onChange={set("plan_loading_date")} />
            </FormField>
            <FormField label="Pending เวลา">
              <Input type="datetime-local" value={form.pending_at} onChange={set("pending_at")} />
            </FormField>
            <FormField label="Loading เวลา">
              <Input type="datetime-local" value={form.loading_at} onChange={set("loading_at")} />
            </FormField>
            <FormField label="Loaded เวลา">
              <Input type="datetime-local" value={form.loaded_at} onChange={set("loaded_at")} />
            </FormField>
          </Section>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "กำลังบันทึก…" : editing ? "บันทึก" : "สร้าง Booking"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบ Booking"
        message={`ต้องการลบ booking "${deleteTarget?.booking_no}" ใช่หรือไม่?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* ── Image fullscreen overlay ── */}
      {imageModalOpen && imageModalUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setImageModalOpen(false)}
        >
          {/* Header bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white font-semibold text-sm">{imageModalTitle}</span>
            <div className="flex items-center gap-3">
              <a
                href={imageModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                เปิดในแท็บใหม่
              </a>
              <button
                onClick={() => setImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 w-full flex items-center justify-center p-6 mt-14 mb-[120px]">
            <img
              src={imageModalUrl}
              alt={imageModalTitle}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Bottom Dock: Container Info */}
          {imageModalBooking && (
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:px-8 md:py-5 flex flex-col md:flex-row gap-4 md:gap-8 shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
               {/* 1. Booking */}
               <div className="flex flex-col">
                 <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Booking No.</span>
                 <span className="text-white font-mono font-bold text-base md:text-lg">{imageModalBooking.booking_no}</span>
               </div>
               
               {/* Vertical Divider (Hidden on Mobile) */}
               <div className="hidden md:block w-px bg-white/20 self-stretch" />
               <div className="md:hidden h-px w-full bg-white/10" />

               {/* 2. Container Info & Seal */}
               <div className="flex flex-col">
                 <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Container & Seal</span>
                 <div className="flex flex-col gap-1">
                   <div className="flex items-baseline gap-2">
                     <span className="text-amber-300 font-mono font-black text-lg md:text-xl tracking-tight leading-none">{imageModalBooking.container_no || "N/A"}</span>
                     <span className="text-white/80 font-medium text-sm">
                       ({imageModalBooking.container_size || "—"} {imageModalBooking.container_size_code ? `/ ${imageModalBooking.container_size_code}` : ""})
                     </span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Seal No:</span>
                     <span className="text-emerald-400 font-mono font-bold text-sm leading-none">{imageModalBooking.seal_no || "N/A"}</span>
                   </div>
                 </div>
               </div>

               {/* Vertical Divider */}
               <div className="hidden md:block w-px bg-white/20 self-stretch" />
               <div className="md:hidden h-px w-full bg-white/10" />

               {/* 3. Tare Weight */}
               <div className="flex flex-col">
                 <span className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Tare Weight</span>
                 <span className="text-white font-black text-base md:text-lg">{imageModalBooking.tare_weight ? `${imageModalBooking.tare_weight} kg` : "—"}</span>
               </div>
            </div>
          )}

          {/* Background hit area to close is handled by parent div's onClick */}
        </div>
      )}
    </div>
  );
}
