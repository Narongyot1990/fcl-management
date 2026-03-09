"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Pencil, Trash2, Search, ChevronDown, ChevronUp, CalendarDays, Copy, Check, ZoomIn, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Booking, Vendor, Container, Customer, LoadingStatus, JobType } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";

// ── Collapsible section (form) ───────────────────────────────────────────────
function Section({ title, number, children }: { title: string; number: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
          <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
      </button>
      {open && <div className="p-5 grid grid-cols-2 gap-4">{children}</div>}
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

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<LoadingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  loading: "bg-blue-100 text-blue-800",
  loaded: "bg-green-100 text-green-800",
};

// ── Step Progress Bar ────────────────────────────────────────────────────────
const STEPS = ["Draft", "Pickup", "Container", "Loading", "Return"];

function getStep(b: Booking): number {
  if (b.return_completed) return 5;
  if (b.gcl_received || b.return_date) return 4;
  if (b.loading_status === "loaded") return 3;
  if (b.loading_status === "loading" || b.truck_plate) return 2;
  if (b.vendor_code) return 1;
  return 0;
}

function StepBar({ booking }: { booking: Booking }) {
  const current = getStep(booking);
  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-0.5">
            <div title={label}
              className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"
              }`}>
              {done ? "\u2713" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Small helper to render "—" when empty ────────────────────────────────────
const D = ({ v }: { v: string | undefined }) => <>{v || "\u2014"}</>;

// ── Thai date formatter ────────────────────────────────────────────────────────
const toThaiDate = (iso: string | undefined) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
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

const LOADING_OPTIONS: { value: LoadingStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "loading", label: "Loading" },
  { value: "loaded", label: "Loaded" },
];

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState("");
  const [imageModalTitle, setImageModalTitle] = useState("");

  function openImageModal(url: string, title: string) {
    setImageModalUrl(url);
    setImageModalTitle(title);
    setImageModalOpen(true);
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
      eir_image_url: b.eir_image_url ?? "",
      container_image_url: b.container_image_url ?? "",
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
      <PageHeader title="Bookings" subtitle="จัดการ Booking — 5 ขั้นตอน lifecycle" onAdd={openCreate}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา Booking No…"
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
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
                  <div className="divide-y divide-slate-100">
                    {bookings.map((b, i) => (
                      <div key={b._id} className="p-4 hover:bg-blue-50/20 transition-colors">
                        {/* Top row: Booking No + badges + actions */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-slate-400 font-medium w-5">{i + 1}.</span>
                            <span className="font-mono font-bold text-violet-700 text-sm">{b.booking_no}</span>
                            {b.job_type && (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${b.job_type === "Export" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                                {b.job_type}
                              </span>
                            )}
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[b.loading_status || "pending"]}`}>
                              {b.loading_status || "pending"}
                            </span>
                            {b.gcl_received && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">GCL ✓</span>}
                            {b.return_completed && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">คืนแล้ว ✓</span>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => copyPickupInfo(b)}
                              className={`p-1.5 rounded-lg hover:bg-blue-50 transition-colors ${copiedId === b._id ? "text-green-600" : "text-slate-400 hover:text-blue-600"}`}
                              title="Copy ข้อมูล">
                              {copiedId === b._id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="แก้ไข"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="ลบ"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-3"><StepBar booking={b} /></div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 block">Customer</span>
                            <span className="font-medium text-slate-700">{b.customer_code || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Vendor</span>
                            <span className="font-medium text-slate-700">{b.vendor_code || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Container</span>
                            <span className="font-mono font-medium text-slate-700">{b.container_no || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Size / Code</span>
                            <span className="font-medium text-slate-700">
                              {b.container_size || "—"}{b.container_size_code && <span className="text-slate-400 ml-1">/ {b.container_size_code}</span>}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Seal No.</span>
                            <span className="font-mono font-medium text-slate-700">{b.seal_no || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Tare (kg)</span>
                            <span className="font-medium text-slate-700">{b.tare_weight || "—"}</span>
                          </div>
                        </div>

                        {/* Plan dates row */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs">
                          <div><span className="text-slate-400">Pickup: </span><span className="font-medium text-slate-700">{toThaiDate(b.plan_pickup_date)}</span></div>
                          <div><span className="text-slate-400">Loading: </span><span className="font-medium text-slate-700">{toThaiDate(b.plan_loading_date)}</span></div>
                          <div><span className="text-slate-400">Return: </span><span className="font-medium text-slate-700">{toThaiDate(b.plan_return_date)}</span></div>
                        </div>

                        {/* Driver info row */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Pickup</span>
                            <span className="font-medium text-slate-700">{b.driver_name || "—"}</span>
                            {b.driver_phone && <span className="text-slate-400">{b.driver_phone}</span>}
                            {b.truck_plate && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{b.truck_plate}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 uppercase">Return</span>
                            <span className="font-medium text-slate-700">{b.return_driver_name || "—"}</span>
                            {b.return_driver_phone && <span className="text-slate-400">{b.return_driver_phone}</span>}
                            {b.return_truck_plate && <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{b.return_truck_plate}</span>}
                          </div>
                        </div>

                        {/* Images row */}
                        {(b.eir_image_url || b.container_image_url) && (
                          <div className="flex gap-3 mt-3">
                            {b.eir_image_url && (
                              <button type="button" onClick={() => openImageModal(b.eir_image_url, "EIR — " + b.booking_no)}
                                className="relative group w-20 h-14 rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-colors shrink-0">
                                <img src={b.eir_image_url} alt="EIR" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-blue-600/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn size={16} className="text-white" />
                                </div>
                                <span className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[9px] font-bold text-center py-0.5">EIR</span>
                              </button>
                            )}
                            {b.container_image_url && (
                              <button type="button" onClick={() => openImageModal(b.container_image_url, "Container — " + b.booking_no)}
                                className="relative group w-20 h-14 rounded-lg overflow-hidden border border-emerald-200 hover:border-emerald-400 transition-colors shrink-0">
                                <img src={b.container_image_url} alt="Container" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-emerald-600/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn size={16} className="text-white" />
                                </div>
                                <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-white text-[9px] font-bold text-center py-0.5">Container</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal Form ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "แก้ไข Booking" : "สร้าง Booking ใหม่"} size="xl">
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Part 1 — Draft */}
          <Section title="Part 1 — ข้อมูลจอง (Draft)" number={1}>
            <FormField label="วันที่จอง">
              <Input type="date" value={form.booking_date} onChange={set("booking_date")} required />
            </FormField>
            <FormField label="Booking No.">
              <Input value={form.booking_no} onChange={set("booking_no")} placeholder="e.g. BK-2024-001" required />
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

          {/* Part 2 — Pickup Truck Assignment */}
          <Section title="Part 2 — จัดรถ Pickup / คนขับ" number={2}>
            <FormField label="ทะเบียนรถ" hint="ดึงจาก Vendor ที่เลือก">
              <Select value={form.truck_plate} onChange={set("truck_plate")}
                options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <FormField label="คนขับ" hint="ดึงจาก Vendor ที่เลือก">
              <Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)}
                options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <FormField label="เบอร์โทรคนขับ" hint="Auto-fill">
              <Input value={form.driver_phone} onChange={set("driver_phone")} placeholder="เบอร์โทร" readOnly />
            </FormField>
            <FormField label="Plan Pickup Date">
              <Input type="date" value={form.plan_pickup_date} onChange={set("plan_pickup_date")} />
            </FormField>
          </Section>

          {/* Part 3 — Depot / Container */}
          <Section title="Part 3 — รับตู้จาก DEPOT" number={3}>
            <FormField label="Container No.">
              <Input value={form.container_no} onChange={set("container_no")} placeholder="e.g. TCKU1234567" />
            </FormField>
            <FormField label="Container Size" hint="e.g. 40HC">
              <Select value={form.container_size} onChange={(e) => handleSizeChange(e.target.value)}
                options={sizeOptions} placeholder="เลือก Size…" />
            </FormField>
            <FormField label="Size Code (ISO)" hint="e.g. 45G1">
              <Select value={form.container_size_code} onChange={(e) => handleCodeChange(e.target.value)}
                options={codeOptions} placeholder="เลือก Code…" />
            </FormField>
            <FormField label="Tare Weight (kg)">
              <Input value={form.tare_weight} onChange={set("tare_weight")} placeholder="e.g. 3800" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Seal No.">
                <Input value={form.seal_no} onChange={set("seal_no")} placeholder="หมายเลขซีล" />
              </FormField>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <ImageUpload
                label="รูป EIR"
                value={form.eir_image_url}
                type="eir"
                onChange={(url) => setForm((f) => ({ ...f, eir_image_url: url }))}
              />
              <ImageUpload
                label="รูป Container"
                value={form.container_image_url}
                type="container"
                onChange={(url) => setForm((f) => ({ ...f, container_image_url: url }))}
              />
            </div>
          </Section>

          {/* Part 4 — Loading Status */}
          <Section title="Part 4 — สถานะโหลดสินค้า" number={4}>
            <FormField label="สถานะ">
              <Select value={form.loading_status} onChange={set("loading_status")} options={LOADING_OPTIONS} />
            </FormField>
            <FormField label="Plan Loading Date">
              <Input type="date" value={form.plan_loading_date} onChange={set("plan_loading_date")} />
            </FormField>
            <FormField label="Pending เวลา">
              <Input type="datetime-local" value={form.pending_at} onChange={set("pending_at")} />
            </FormField>
            <FormField label="Loading เวลา">
              <Input type="datetime-local" value={form.loading_at} onChange={set("loading_at")} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Loaded เวลา">
                <Input type="datetime-local" value={form.loaded_at} onChange={set("loaded_at")} />
              </FormField>
            </div>
          </Section>

          {/* Part 5 — Return */}
          <Section title="Part 5 — คืนตู้ท่า" number={5}>
            <FormField label="Plan Return Date">
              <Input type="date" value={form.plan_return_date} onChange={set("plan_return_date")} />
            </FormField>
            <FormField label="ทะเบียนรถคืนตู้" hint="ดึงจาก Vendor">
              <Select value={form.return_truck_plate} onChange={set("return_truck_plate")}
                options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <FormField label="คนขับคืนตู้" hint="ดึงจาก Vendor">
              <Select value={form.return_driver_name} onChange={(e) => handleReturnDriverChange(e.target.value)}
                options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <FormField label="เบอร์คนขับคืนตู้" hint="Auto-fill">
              <Input value={form.return_driver_phone} onChange={set("return_driver_phone")} placeholder="เบอร์โทร" readOnly />
            </FormField>
            <div className="col-span-2 flex flex-col gap-4">
              <Toggle checked={form.gcl_received} onChange={(v) => setForm((f) => ({ ...f, gcl_received: v }))} label="ได้รับ GCL (Good Control List) แล้ว" />
              <FormField label="วัน-เวลาคืนตู้จริง">
                <Input type="datetime-local" value={form.return_date} onChange={set("return_date")} />
              </FormField>
              <Toggle checked={form.return_completed} onChange={(v) => setForm((f) => ({ ...f, return_completed: v }))} label="คืนตู้เรียบร้อยแล้ว" />
            </div>
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
          <img
            src={imageModalUrl}
            alt={imageModalTitle}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Footer hint */}
          <p className="absolute bottom-5 text-white/50 text-xs">คลิกพื้นหลังเพื่อปิด</p>
        </div>
      )}
    </div>
  );
}
