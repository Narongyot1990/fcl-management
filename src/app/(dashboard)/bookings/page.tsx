"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Booking, Vendor, Container, LoadingStatus } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";

// ── Collapsible section ──────────────────────────────────────────────────────
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

// ── Empty form ───────────────────────────────────────────────────────────────
interface BookingForm {
  booking_date: string;
  booking_no: string;
  vendor_code: string;
  truck_plate: string;
  driver_name: string;
  driver_phone: string;
  container_no: string;
  container_size: string;
  container_size_code: string;
  tare_weight: string;
  seal_no: string;
  loading_status: LoadingStatus;
  pending_at: string;
  loading_at: string;
  loaded_at: string;
  gcl_received: boolean;
  return_date: string;
  return_completed: boolean;
}

const EMPTY_FORM: BookingForm = {
  booking_date: "", booking_no: "", vendor_code: "",
  truck_plate: "", driver_name: "", driver_phone: "",
  container_no: "", container_size: "", container_size_code: "",
  tare_weight: "", seal_no: "",
  loading_status: "pending", pending_at: "", loading_at: "", loaded_at: "",
  gcl_received: false, return_date: "", return_completed: false,
};

const LOADING_OPTIONS: { value: LoadingStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "loading", label: "Loading" },
  { value: "loaded", label: "Loaded" },
];

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

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

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
      const [vRes, cRes] = await Promise.all([
        listRecords<Vendor>("vendors"),
        listRecords<Container>("containers"),
      ]);
      setVendors(vRes.records);
      setContainers(cRes.records);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

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
      vendor_code: b.vendor_code ?? "",
      truck_plate: b.truck_plate ?? "",
      driver_name: b.driver_name ?? "",
      driver_phone: b.driver_phone ?? "",
      container_no: b.container_no ?? "",
      container_size: b.container_size ?? "",
      container_size_code: b.container_size_code ?? "",
      tare_weight: b.tare_weight ?? "",
      seal_no: b.seal_no ?? "",
      loading_status: b.loading_status ?? "pending",
      pending_at: b.pending_at ?? "",
      loading_at: b.loading_at ?? "",
      loaded_at: b.loaded_at ?? "",
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

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Container</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Return</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-[var(--muted)]">ยังไม่มี Booking กด Add New เพื่อสร้าง</td></tr>
              ) : (
                records.map((b) => (
                  <tr key={b._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-violet-700">{b.booking_no}</td>
                    <td className="px-5 py-3">{b.vendor_code}</td>
                    <td className="px-5 py-3 font-mono text-xs">{b.container_no || "—"}</td>
                    <td className="px-5 py-3">
                      {b.container_size ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{b.container_size}</span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.loading_status || "pending"]}`}>
                        {b.loading_status || "pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {b.return_completed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Done</span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Form ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "แก้ไข Booking" : "สร้าง Booking ใหม่"} size="xl">
        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Part 1 — Draft */}
          <Section title="Part 1 — ข้อมูลจอง (Draft)" number={1}>
            <FormField label="วันที่จอง" required>
              <Input type="date" value={form.booking_date} onChange={set("booking_date")} required />
            </FormField>
            <FormField label="Booking No." required>
              <Input value={form.booking_no} onChange={set("booking_no")} placeholder="e.g. BK-2024-001" required />
            </FormField>
            <div className="col-span-2">
              <FormField label="Vendor (ผู้ขนส่ง)">
                <Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)}
                  options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" />
              </FormField>
            </div>
          </Section>

          {/* Part 2 — Truck Assignment */}
          <Section title="Part 2 — จัดรถ / คนขับ" number={2}>
            <FormField label="ทะเบียนรถ" hint="ดึงจาก Vendor ที่เลือก">
              <Select value={form.truck_plate} onChange={set("truck_plate")}
                options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <FormField label="คนขับ" hint="ดึงจาก Vendor ที่เลือก">
              <Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)}
                options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} />
            </FormField>
            <div className="col-span-2">
              <FormField label="เบอร์โทรคนขับ" hint="Auto-fill จากคนขับที่เลือก">
                <Input value={form.driver_phone} onChange={set("driver_phone")} placeholder="เบอร์โทร" readOnly />
              </FormField>
            </div>
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
          </Section>

          {/* Part 4 — Loading Status */}
          <Section title="Part 4 — สถานะโหลดสินค้า" number={4}>
            <div className="col-span-2">
              <FormField label="สถานะ">
                <Select value={form.loading_status} onChange={set("loading_status")} options={LOADING_OPTIONS} />
              </FormField>
            </div>
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
            <div className="col-span-2 flex flex-col gap-4">
              <Toggle checked={form.gcl_received} onChange={(v) => setForm((f) => ({ ...f, gcl_received: v }))} label="ได้รับ GCL (Good Control List) แล้ว" />
              <FormField label="วัน-เวลาคืนตู้">
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
    </div>
  );
}
