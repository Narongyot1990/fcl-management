"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Booking, Vendor, Container } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select, Textarea } from "@/components/FormField";

const CONDITION_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "minor_damage", label: "Minor Damage" },
  { value: "major_damage", label: "Major Damage" },
  { value: "repair_needed", label: "Repair Needed" },
];

const EMPTY_FORM: Omit<Booking, "_id" | "created_at"> = {
  booking_no: "",
  shipper: "",
  truck_plate: "",
  driver_name: "",
  phone: "",
  container_no: "",
  container_size: "",
  seal_no: "",
  tare_weight: "",
  port_of_loading: "",
  port_of_discharge: "",
  vessel: "",
  voyage: "",
  condition: "good",
  damage_notes: "",
  date_time: "",
  gate_in_date: "",
  gate_out_date: "",
  remarks: "",
};

interface SectionProps {
  title: string;
  number: number;
  children: React.ReactNode;
}

function Section({ title, number, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {number}
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
      </button>
      {open && <div className="p-5 grid grid-cols-2 gap-4">{children}</div>}
    </div>
  );
}

export default function BookingsPage() {
  const [records, setRecords] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<Omit<Booking, "_id" | "created_at">>(EMPTY_FORM);
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
    } catch {
      // silently ignore dropdown load errors
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(b: Booking) {
    setEditing(b);
    const { _id, created_at, ...rest } = b;
    void _id; void created_at;
    setForm(rest);
    setModalOpen(true);
  }

  function handleVendorChange(code: string) {
    const vendor = vendors.find((v) => v.code === code);
    setForm((f) => ({
      ...f,
      shipper: code,
      truck_plate: vendor?.truck_plate ?? f.truck_plate,
      driver_name: vendor?.driver_name ?? f.driver_name,
      phone: vendor?.phone ?? f.phone,
    }));
  }

  function handleContainerChange(code: string) {
    const container = containers.find((c) => c.code === code);
    setForm((f) => ({
      ...f,
      container_no: code,
      container_size: container?.size ?? f.container_size,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateRecord("bookings", editing._id, form);
      } else {
        await createRecord<Booking>("bookings", form);
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecord("bookings", deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const f = form;
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const vendorOptions = vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }));
  const containerOptions = containers.map((c) => ({ value: c.code, label: `${c.code} (${c.size}ft)` }));
  const sizeOptions = [...new Set(containers.map((c) => c.size))].map((s) => ({ value: s, label: `${s}ft` }));

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Manage EIR booking lifecycle records"
        onAdd={openCreate}
      >
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by booking no…"
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Booking No.</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipper</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Container</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vessel</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gate In</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[var(--muted)]">No bookings found. Create one to get started.</td>
              </tr>
            ) : (
              records.map((b) => (
                <tr key={b._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-violet-700">{b.booking_no}</td>
                  <td className="px-5 py-3">{b.shipper}</td>
                  <td className="px-5 py-3 font-mono text-xs">{b.container_no}</td>
                  <td className="px-5 py-3">
                    {b.container_size && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {b.container_size}ft
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--muted)]">{b.vessel}</td>
                  <td className="px-5 py-3 text-xs text-[var(--muted)]">
                    {b.gate_in_date ? new Date(b.gate_in_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Booking" : "New Booking"}
        size="xl"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {/* Booking number */}
          <FormField label="Booking Number" required>
            <Input
              value={f.booking_no}
              onChange={set("booking_no")}
              placeholder="e.g. BK-2024-001"
              required
            />
          </FormField>

          {/* Part 1 — Shipper / Vendor */}
          <Section title="Shipper / Vendor Information" number={1}>
            <div className="col-span-2">
              <FormField label="Shipper (Vendor)">
                <Select
                  value={f.shipper}
                  onChange={(e) => handleVendorChange(e.target.value)}
                  options={vendorOptions}
                  placeholder="Select vendor…"
                />
              </FormField>
            </div>
            <FormField label="Truck Plate">
              <Input value={f.truck_plate} onChange={set("truck_plate")} placeholder="Truck plate no." />
            </FormField>
            <FormField label="Driver Name">
              <Input value={f.driver_name} onChange={set("driver_name")} placeholder="Driver name" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Phone">
                <Input value={f.phone} onChange={set("phone")} placeholder="Contact phone" />
              </FormField>
            </div>
          </Section>

          {/* Part 2 — Container */}
          <Section title="Container Information" number={2}>
            <div className="col-span-2">
              <FormField label="Container No.">
                <Select
                  value={f.container_no}
                  onChange={(e) => handleContainerChange(e.target.value)}
                  options={containerOptions}
                  placeholder="Select container…"
                />
              </FormField>
            </div>
            <FormField label="Container Size">
              <Select
                value={f.container_size}
                onChange={set("container_size")}
                options={sizeOptions.length > 0 ? sizeOptions : [
                  { value: "20", label: "20ft" },
                  { value: "40", label: "40ft" },
                  { value: "40HC", label: "40ft HC" },
                  { value: "45", label: "45ft" },
                ]}
                placeholder="Select size…"
              />
            </FormField>
            <FormField label="Seal No.">
              <Input value={f.seal_no} onChange={set("seal_no")} placeholder="Seal number" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Tare Weight (kg)">
                <Input value={f.tare_weight} onChange={set("tare_weight")} placeholder="e.g. 2200" />
              </FormField>
            </div>
          </Section>

          {/* Part 3 — Booking Details */}
          <Section title="Booking / Voyage Details" number={3}>
            <FormField label="Port of Loading">
              <Input value={f.port_of_loading} onChange={set("port_of_loading")} placeholder="e.g. THBKK" />
            </FormField>
            <FormField label="Port of Discharge">
              <Input value={f.port_of_discharge} onChange={set("port_of_discharge")} placeholder="e.g. CNSHA" />
            </FormField>
            <FormField label="Vessel">
              <Input value={f.vessel} onChange={set("vessel")} placeholder="Vessel name" />
            </FormField>
            <FormField label="Voyage">
              <Input value={f.voyage} onChange={set("voyage")} placeholder="Voyage no." />
            </FormField>
          </Section>

          {/* Part 4 — Condition */}
          <Section title="Container Condition" number={4}>
            <div className="col-span-2">
              <FormField label="Condition">
                <Select
                  value={f.condition}
                  onChange={set("condition")}
                  options={CONDITION_OPTIONS}
                />
              </FormField>
            </div>
            <div className="col-span-2">
              <FormField label="Damage Notes">
                <Textarea
                  value={f.damage_notes}
                  onChange={set("damage_notes")}
                  placeholder="Describe any damage or defects…"
                />
              </FormField>
            </div>
          </Section>

          {/* Part 5 — Dates & Remarks */}
          <Section title="Dates &amp; Signature" number={5}>
            <FormField label="EIR Date / Time">
              <Input type="datetime-local" value={f.date_time} onChange={set("date_time")} />
            </FormField>
            <FormField label="Gate In Date">
              <Input type="date" value={f.gate_in_date} onChange={set("gate_in_date")} />
            </FormField>
            <FormField label="Gate Out Date">
              <Input type="date" value={f.gate_out_date} onChange={set("gate_out_date")} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Remarks">
                <Textarea value={f.remarks} onChange={set("remarks")} placeholder="Additional remarks…" />
              </FormField>
            </div>
          </Section>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Booking"
        message={`Delete booking "${deleteTarget?.booking_no}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
