"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
const DriverProfile = dynamic(() => import("@/components/DriverProfile"), { ssr: false });
import ImageUpload from "@/components/ImageUpload";
import GeminiOcrButton from "@/components/GeminiOcrButton";
import { containerNoMessage } from "@/lib/containerValidation";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Booking, Vendor, Container, Customer, Driver } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";
import DateNavigator from "@/components/DateNavigator";
import ImageFullscreenModal from "@/components/ImageFullscreenModal";
import BookingRow from "./components/BookingRow";
import Section from "./components/Section";
import Toggle from "./components/Toggle";
import ProcessModalFields from "./components/ProcessModalFields";
import {
  STEPS,
  STEP_MODAL_TITLES,
  JOB_TYPE_OPTIONS,
  EMPTY_FORM,
  toProxyUrl,
} from "./utils/booking-utils";
import type { BookingForm } from "./types/booking-form";

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [records, setRecords] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showNoContainer, setShowNoContainer] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalEirUrl, setImageModalEirUrl] = useState("");
  const [imageModalContainerUrl, setImageModalContainerUrl] = useState("");
  const [imageModalTitle, setImageModalTitle] = useState("");
  const [imageModalBooking, setImageModalBooking] = useState<Booking | null>(null);
  const [openingGps, setOpeningGps] = useState<string | null>(null);
  const [driverProfileTarget, setDriverProfileTarget] = useState<Driver | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [multiText, setMultiText] = useState("");
  const [multiParsed, setMultiParsed] = useState<string[]>([]);
  const [multiDuplicateWarning, setMultiDuplicateWarning] = useState<string | null>(null);
  const [multiChecking, setMultiChecking] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // ── Image Modal ──
  function openImageModal(eirUrl: string, containerUrl: string, booking: Booking) {
    setImageModalEirUrl(eirUrl);
    setImageModalContainerUrl(containerUrl);
    setImageModalTitle(booking.booking_no);
    setImageModalBooking(booking);
    setImageModalOpen(true);
  }

  function openSingleImageModal(url: string, title: string, booking: Booking) {
    setImageModalEirUrl(url);
    setImageModalContainerUrl("");
    setImageModalTitle(title);
    setImageModalBooking(booking);
    setImageModalOpen(true);
  }

  // ── GPS Location ──
  async function openLocationInGoogleMaps(vendorCode: string, truckPlate: string) {
    if (openingGps) return;
    const vendor = vendors.find(v => v.code === vendorCode);
    if (!vendor) { alert("Vendor data not found for this booking"); return; }
    const truck = vendor.trucks?.find(t => t.plate === truckPlate);
    const gpsId = truck?.gps_id;
    if (!gpsId) { alert("This truck does not have a GPS ID set in the Vendor system"); return; }

    setOpeningGps(truckPlate);
    try {
      const response = await fetch("/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gps_id: gpsId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch GPS data from DTC API");
      if (data.lat && data.lon) {
        window.open(`https://maps.google.com/?q=${data.lat},${data.lon}`, "_blank");
      } else {
        throw new Error("No coordinate data found");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error fetching GPS location");
    } finally {
      setOpeningGps(null);
    }
  }

  // ── Data Loading ──
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listRecords<Booking>("bookings", search ? { booking_no: search } : {});
      let records = res.records;
      records.sort((a, b) => {
        const dateA = a.booking_date ? new Date(a.booking_date).getTime() : 0;
        const dateB = b.booking_date ? new Date(b.booking_date).getTime() : 0;
        return dateB - dateA;
      });
      if (dateFrom || dateTo) {
        const fromStr = dateFrom ? new Date(dateFrom).toISOString().split("T")[0] : null;
        const toStr = dateTo ? new Date(dateTo + "T23:59:59").toISOString().split("T")[0] : null;
        records = records.filter((b) => {
          if (!b.booking_date) return false;
          const bookingDateStr = b.booking_date.split("T")[0];
          if (fromStr && bookingDateStr < fromStr) return false;
          if (toStr && bookingDateStr > toStr) return false;
          return true;
        });
      }
      if (showNoContainer) records = records.filter((b) => !b.container_no);
      setRecords(records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, showNoContainer]);

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

  // ── Vendor/Container Helpers ──
  const selectedVendor = vendors.find((v) => v.code === form.vendor_code);
  const truckPlateOptions = (selectedVendor?.truck_plates || []).map((p) => ({ value: p, label: p }));
  const driverOptions = (selectedVendor?.drivers || []).map((d) => ({ value: d.name, label: d.name }));
  const sizeOptions = [...new Map(containers.map((c) => [c.size, c])).values()].map((c) => ({ value: c.size, label: c.size }));
  const codeOptions = containers.filter((c) => !form.container_size || c.size === form.container_size).map((c) => ({ value: c.code, label: c.code }));

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

  function handleSizeChange(size: string) {
    const match = containers.find((c) => c.size === size);
    setForm((f) => ({ ...f, container_size: size, container_size_code: match?.code ?? "" }));
  }

  function handleCodeChange(code: string) {
    const match = containers.find((c) => c.code === code);
    setForm((f) => ({ ...f, container_size_code: code, container_size: match?.size ?? f.container_size }));
  }

  // ── Form Helpers ──
  function bookingToForm(b: Booking): BookingForm {
    return {
      booking_date: b.booking_date ?? "",
      booking_no: b.booking_no ?? "",
      job_type: b.job_type ?? "Export",
      customer_code: b.customer_code ?? "",
      vendor_code: b.vendor_code ?? "",
      truck_plate: b.truck_plate ?? "",
      driver_name: b.driver_name ?? "",
      driver_phone: b.driver_phone ?? "",
      plan_pickup_date: b.plan_pickup_date ?? "",
      eta: b.eta ?? "",
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
    };
  }

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(b: Booking) { setEditing(b); setForm(bookingToForm(b)); setModalOpen(true); }
  function openProcessEdit(b: Booking, stepIndex: number) { setEditing(b); setProcessStep(stepIndex); setForm(bookingToForm(b)); setProcessModalOpen(true); }

  // ── Save Handlers ──
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

  async function handleProcessSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateRecord("bookings", editing._id, form as unknown as Record<string, unknown>);
      setProcessModalOpen(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  // ── Multi-Booking Helpers ──
  function parseMultiText(text: string): string[] {
    return text.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
  }

  function countDupes(items: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
    return map;
  }

  async function handleMultiTextChange(text: string) {
    setMultiText(text);
    setMultiDuplicateWarning(null);
    const items = parseMultiText(text);
    setMultiParsed(items);
    const dupeCounts = countDupes(items);
    const localDupes = [...dupeCounts.entries()].filter(([, c]) => c > 1).map(([v]) => v);
    if (localDupes.length > 0) {
      setMultiDuplicateWarning(`Duplicate booking numbers in pasted list: ${localDupes.join(", ")} — will auto-suffix -1, -2, ...`);
    }
  }

  async function handleMultiCheck() {
    const items = parseMultiText(multiText);
    if (items.length === 0) return;
    setMultiChecking(true);
    try {
      const dupeCounts = countDupes(items);
      const dupesToCheck = [...dupeCounts.entries()].filter(([, c]) => c > 1).map(([v]) => v);
      if (dupesToCheck.length > 0) {
        const res = await listRecords<Booking>("bookings", {});
        const existingMap = new Map<string, number>();
        for (const b of res.records) existingMap.set(b.booking_no, (existingMap.get(b.booking_no) ?? 0) + 1);
        for (const dup of dupesToCheck) {
          const existingCount = existingMap.get(dup) ?? 0;
          const suffixCount = dupeCounts.get(dup) ?? 0;
          if (existingCount > 0) {
            setMultiDuplicateWarning(
              `"${dup}" has ${existingCount} existing booking(s) in DB. Will create with suffix -${existingCount + 1} through -${existingCount + suffixCount}.`
            );
          }
        }
      }
    } finally { setMultiChecking(false); }
  }

  async function handleMultiSave() {
    const items = parseMultiText(multiText);
    if (items.length === 0) { alert("No booking numbers to create"); return; }
    const dupeCounts = countDupes(items);
    const res = await listRecords<Booking>("bookings", {});
    const existingCount = new Map<string, number>();
    for (const b of res.records) existingCount.set(b.booking_no, (existingCount.get(b.booking_no) ?? 0) + 1);
    const baseForm = { ...form, booking_no: "" };
    delete (baseForm as Record<string, unknown>).booking_no;
    setSaving(true);
    try {
      const created: string[] = [];
      const seen = new Map<string, number>();
      for (const rawNo of items) {
        let suffixNum = existingCount.get(rawNo) ?? 0;
        let finalNo = rawNo;
        const count = dupeCounts.get(rawNo) ?? 1;
        if (count > 1 || suffixNum > 0) {
          suffixNum += 1;
          finalNo = `${rawNo}-${suffixNum}`;
          seen.set(rawNo, suffixNum);
        }
        await createRecord<Booking>("bookings", { ...baseForm, booking_no: finalNo } as Record<string, unknown>);
        const seenVal = seen.get(rawNo) ?? 0;
        if (seenVal > 0) seen.set(rawNo, seenVal + 1);
        created.push(finalNo);
      }
      alert(`Created ${created.length} booking(s): ${created.join(", ")}`);
      setModalOpen(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Multi-create failed"); }
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

  function copyPickupInfo(b: Booking) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const gpsUrl = b.truck_plate ? `${baseUrl}/gps/track/${encodeURIComponent(b.truck_plate)}` : "";
    const text = [b.booking_no, b.container_size, b.container_size_code, b.container_no, b.seal_no, b.tare_weight, b.driver_name, b.driver_phone, b.truck_plate, gpsUrl ? `\nGPS Tracking: ${gpsUrl}` : ""].join("\t");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(b._id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const set = (k: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const setFormField = (key: keyof BookingForm, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  // ── Render ──
  return (
    <div>
      <PageHeader title="Bookings" subtitle="Manage Bookings" onAdd={openCreate}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Booking No…"
              className="pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48" />
          </div>
          <button onClick={() => setShowNoContainer(!showNoContainer)}
            className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${showNoContainer ? "bg-orange-100 border-orange-300 text-orange-700" : "border-[var(--border)] hover:bg-slate-50 text-slate-500"}`}>
            No Container
          </button>
          <DateNavigator dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
        </div>
      </PageHeader>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      {/* ── Bookings Table ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-[var(--muted)]">Loading…</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center text-[var(--muted)]">No bookings yet. Click Add New to create one.</div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-180px)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Date</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Booking No.</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Est. Pickup</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">ETA</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Container No.</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Seal No.</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Truck / Driver</th>
                  <th className="px-2 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((b) => (
                  <BookingRow
                    key={b._id}
                    booking={b}
                    vendors={vendors}
                    copiedId={copiedId}
                    openingGps={openingGps}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onCopy={copyPickupInfo}
                    onOpenImages={openImageModal}
                    onOpenSingleImage={openSingleImageModal}
                    onOpenGps={openLocationInGoogleMaps}
                    onDriverProfile={setDriverProfileTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Main Modal Form ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Booking" : "Create New Booking"} size="xl">
        {!editing && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Multi-Booking Mode</span>
            <button type="button" onClick={() => { setMultiMode(!multiMode); setMultiText(""); setMultiParsed([]); setMultiDuplicateWarning(null); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${multiMode ? "bg-blue-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${multiMode ? "translate-x-5" : ""}`} />
            </button>
            <span className="text-xs text-blue-600">{multiMode ? "ON — paste booking numbers below" : "OFF — single booking"}</span>
          </div>
        )}

        <form onSubmit={multiMode && !editing ? (e) => { e.preventDefault(); handleMultiSave(); } : handleSave} className="flex flex-col gap-3">
          {!multiMode || editing ? (
            <>
              {/* Booking Info */}
              <Section title="Booking" icon="📋" defaultOpen={!editing}>
                <FormField label="วันที่จอง"><Input type="date" value={form.booking_date} onChange={set("booking_date")} required /></FormField>
                <FormField label="Booking No."><Input value={form.booking_no} onChange={set("booking_no")} placeholder="BK-2024-001" required={!multiMode || !!editing} /></FormField>
                <FormField label="Job Type"><Select value={form.job_type} onChange={set("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
                <FormField label="Customer"><Select value={form.customer_code} onChange={set("customer_code")} options={customers.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} placeholder="เลือก Customer…" /></FormField>
                <div className="col-span-2"><FormField label="Vendor (ผู้ขนส่ง)"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" /></FormField></div>
              </Section>

              {/* Container */}
              <Section title="Container" icon="📦" defaultOpen={false}>
                <FormField label="Container No."><Input value={form.container_no} onChange={set("container_no")} placeholder="TCKU1234567" /></FormField>
                <FormField label="Seal No."><Input value={form.seal_no} onChange={set("seal_no")} placeholder="หมายเลขซีล" /></FormField>
                <FormField label="Size" hint="e.g. 40HC"><Select value={form.container_size} onChange={(e) => handleSizeChange(e.target.value)} options={sizeOptions} placeholder="เลือก Size…" /></FormField>
                <FormField label="ISO Code" hint="e.g. 45G1"><Select value={form.container_size_code} onChange={(e) => handleCodeChange(e.target.value)} options={codeOptions} placeholder="เลือก Code…" /></FormField>
                <FormField label="Tare (kg)"><Input value={form.tare_weight} onChange={set("tare_weight")} placeholder="3800" /></FormField>
                <div />
                <div className="col-span-2 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ImageUpload label="รูป EIR" value={form.eir_image_url} type="eir" onChange={(url) => setFormField("eir_image_url", url)} />
                    <ImageUpload label="รูป Container" value={form.container_image_url} type="container" onChange={(url) => setFormField("container_image_url", url)} />
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

              {/* Pickup + Return side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Section title="Pickup รับตู้" icon="🚛" defaultOpen={false}>
                  <FormField label="Est. Pickup (วัน-เวลา)"><Input type="datetime-local" value={form.plan_pickup_date} onChange={set("plan_pickup_date")} /></FormField>
                  <FormField label="ETA ถึงปลายทาง"><Input type="datetime-local" value={form.eta} onChange={set("eta")} /></FormField>
                  <FormField label="ทะเบียนรถ"><Select value={form.truck_plate} onChange={set("truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                  <FormField label="คนขับ"><Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                  <FormField label="เบอร์โทร"><Input value={form.driver_phone} onChange={set("driver_phone")} placeholder="Auto-fill" readOnly /></FormField>
                </Section>

                <Section title="Return คืนตู้" icon="🔄" defaultOpen={false}>
                  <FormField label="Plan Return"><Input type="date" value={form.plan_return_date} onChange={set("plan_return_date")} /></FormField>
                  <FormField label="ทะเบียนรถ"><Select value={form.return_truck_plate} onChange={set("return_truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                  <FormField label="คนขับ"><Select value={form.return_driver_name} onChange={(e) => handleReturnDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                  <FormField label="เบอร์โทร"><Input value={form.return_driver_phone} onChange={set("return_driver_phone")} placeholder="Auto-fill" readOnly /></FormField>
                  <div className="col-span-2 flex flex-col gap-2">
                    <FormField label="คืนตู้จริง"><Input type="datetime-local" value={form.return_date} onChange={set("return_date")} /></FormField>
                    <Toggle checked={form.gcl_received} onChange={(v) => setFormField("gcl_received", v)} label="GCL received" />
                    <Toggle checked={form.return_completed} onChange={(v) => setFormField("return_completed", v)} label="Container returned" />
                  </div>
                </Section>
              </div>

              {/* Loading Status */}
              <Section title="Loading Status" icon="📊" cols={2} defaultOpen={false}>
                <FormField label="Plan Loading"><Input type="date" value={form.plan_loading_date} onChange={set("plan_loading_date")} /></FormField>
                <FormField label="Pending เวลา"><Input type="datetime-local" value={form.pending_at} onChange={set("pending_at")} /></FormField>
                <FormField label="Loading เวลา"><Input type="datetime-local" value={form.loading_at} onChange={set("loading_at")} /></FormField>
                <FormField label="Loaded เวลา"><Input type="datetime-local" value={form.loaded_at} onChange={set("loaded_at")} /></FormField>
              </Section>
            </>
          ) : (
            <>
              {/* Multi-booking: shared fields */}
              <Section title="Shared Info (Booking, Customer, Vendor)" icon="📋" defaultOpen={true}>
                <FormField label="วันที่จอง"><Input type="date" value={form.booking_date} onChange={set("booking_date")} required /></FormField>
                <FormField label="Job Type"><Select value={form.job_type} onChange={set("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
                <FormField label="Customer"><Select value={form.customer_code} onChange={set("customer_code")} options={customers.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} placeholder="เลือก Customer…" /></FormField>
                <div className="col-span-2"><FormField label="Vendor (ผู้ขนส่ง)"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" /></FormField></div>
                <FormField label="ทะเบียนรถ"><Select value={form.truck_plate} onChange={set("truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                <FormField label="คนขับ"><Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
              </Section>

              {/* Multi-booking: paste area */}
              <Section title="Booking Numbers (paste from Excel)" icon="📝" defaultOpen={true}>
                <div className="col-span-2 flex flex-col gap-2">
                  <textarea value={multiText} onChange={(e) => handleMultiTextChange(e.target.value)}
                    placeholder={`Paste booking numbers here (one per line), e.g.:\nTHD1505395\nTHD1505395\n90785160\n90785160\nBKK6A1475500`}
                    rows={8} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y" />
                  {multiParsed.length > 0 && <div className="text-xs text-slate-500">{multiParsed.length} booking number(s) detected</div>}
                  {multiDuplicateWarning && <div className="text-xs px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">{multiDuplicateWarning}</div>}
                  <button type="button" onClick={handleMultiCheck} disabled={multiChecking || multiParsed.length === 0}
                    className="self-start px-3 py-1.5 text-xs border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600 disabled:opacity-40 transition-colors">
                    {multiChecking ? "Checking DB…" : "Check for duplicates in DB"}
                  </button>
                </div>
              </Section>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Saving…" : editing ? "Save" : multiMode ? `Create ${multiParsed.length > 0 ? multiParsed.length : ""} Booking${multiParsed.length !== 1 ? "s" : ""}` : "Create Booking"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Process Modal ── */}
      <Modal open={processModalOpen} onClose={() => setProcessModalOpen(false)}
        title={`${STEP_MODAL_TITLES[processStep]} Process${editing ? ` - ${editing.booking_no}` : ""}`} size="lg">
        <form onSubmit={handleProcessSave} className="flex flex-col gap-4">
          <ProcessModalFields
            step={processStep}
            form={form}
            set={set}
            vendors={vendors}
            customers={customers}
            selectedVendor={selectedVendor}
            truckPlateOptions={truckPlateOptions}
            driverOptions={driverOptions}
            handleVendorChange={handleVendorChange}
            handleDriverChange={handleDriverChange}
            handleReturnDriverChange={handleReturnDriverChange}
            sizeOptions={sizeOptions}
            codeOptions={codeOptions}
            handleSizeChange={handleSizeChange}
            handleCodeChange={handleCodeChange}
            setFormField={setFormField}
          />
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setProcessModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Saving..." : "Save Process"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete Booking"
        message={`Are you sure you want to delete booking "${deleteTarget?.booking_no}"?`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />

      {/* ── Image Fullscreen Modal ── */}
      <ImageFullscreenModal
        open={imageModalOpen}
        eirImageUrl={imageModalEirUrl}
        containerImageUrl={imageModalContainerUrl}
        title={imageModalTitle}
        booking={imageModalBooking}
        onClose={() => setImageModalOpen(false)}
      />

      {/* ── Driver Profile Modal ── */}
      <Modal open={!!driverProfileTarget} onClose={() => setDriverProfileTarget(null)} title="Driver History" size="lg">
        <div className="h-[500px]">
          {driverProfileTarget && <DriverProfile driver={driverProfileTarget} mode="visitor" />}
        </div>
      </Modal>
    </div>
  );
}
