"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search, Filter } from "lucide-react";
import { listEIRRecords, updateEIRRecord, deleteEIRRecord } from "@/lib/api";
import type { EIRRecord } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input } from "@/components/FormField";

export default function EIRPage() {
  const [records, setRecords] = useState<EIRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    shipper: "",
    booking_no: "",
    container_no: "",
    container_size: "",
    date_from: "",
    date_to: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const [editing, setEditing] = useState<EIRRecord | null>(null);
  const [form, setForm] = useState<Partial<EIRRecord>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EIRRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listEIRRecords(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      setRecords(res.records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load EIR records");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function openEdit(r: EIRRecord) {
    setEditing(r);
    setForm({
      shipper: r.shipper,
      booking_no: r.booking_no,
      container_no: r.container_no,
      container_size: r.container_size,
      seal_no: r.seal_no,
      tare_weight: r.tare_weight,
      truck_plate: r.truck_plate,
      date_time: r.date_time,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateEIRRecord(editing._id, form);
      setEditing(null);
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
      await deleteEIRRecord(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const setF = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="EIR Records"
        subtitle="OCR-extracted Equipment Interchange Receipt records"
      >
        <button
          onClick={() => setShowFilters((p) => !p)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-slate-50 transition-colors"
        >
          <Filter size={14} />
          Filters
        </button>
      </PageHeader>

      {showFilters && (
        <div className="mb-5 bg-white rounded-2xl border border-[var(--border)] shadow-sm p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={filters.shipper}
                onChange={setF("shipper")}
                placeholder="Shipper"
                className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              value={filters.booking_no}
              onChange={setF("booking_no")}
              placeholder="Booking No."
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.container_no}
              onChange={setF("container_no")}
              placeholder="Container No."
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={filters.container_size}
              onChange={setF("container_size")}
              placeholder="Size"
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.date_from}
              onChange={setF("date_from")}
              placeholder="Date from"
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={setF("date_to")}
              placeholder="Date to"
              className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={load}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({ shipper: "", booking_no: "", container_no: "", container_size: "", date_from: "", date_to: "" });
              }}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-[var(--muted)]">
            {loading ? "Loading…" : `${records.length} record${records.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Booking No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shipper</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Container No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Truck Plate</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seal No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-[var(--muted)]">No EIR records found.</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono font-medium text-amber-700 whitespace-nowrap">{r.booking_no}</td>
                    <td className="px-5 py-3">{r.shipper}</td>
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">{r.container_no}</td>
                    <td className="px-5 py-3">
                      {r.container_size && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          {r.container_size}ft
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{r.truck_plate}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">{r.seal_no}</td>
                    <td className="px-5 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                      {r.date_time ? new Date(r.date_time).toLocaleDateString() : r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
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
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit EIR Record"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Shipper">
              <Input
                value={form.shipper ?? ""}
                onChange={(e) => setForm({ ...form, shipper: e.target.value })}
              />
            </FormField>
            <FormField label="Booking No.">
              <Input
                value={form.booking_no ?? ""}
                onChange={(e) => setForm({ ...form, booking_no: e.target.value })}
              />
            </FormField>
            <FormField label="Container No.">
              <Input
                value={form.container_no ?? ""}
                onChange={(e) => setForm({ ...form, container_no: e.target.value })}
              />
            </FormField>
            <FormField label="Container Size">
              <Input
                value={form.container_size ?? ""}
                onChange={(e) => setForm({ ...form, container_size: e.target.value })}
              />
            </FormField>
            <FormField label="Seal No.">
              <Input
                value={form.seal_no ?? ""}
                onChange={(e) => setForm({ ...form, seal_no: e.target.value })}
              />
            </FormField>
            <FormField label="Tare Weight (kg)">
              <Input
                value={form.tare_weight ?? ""}
                onChange={(e) => setForm({ ...form, tare_weight: e.target.value })}
              />
            </FormField>
            <FormField label="Truck Plate">
              <Input
                value={form.truck_plate ?? ""}
                onChange={(e) => setForm({ ...form, truck_plate: e.target.value })}
              />
            </FormField>
            <FormField label="Date / Time">
              <Input
                type="datetime-local"
                value={form.date_time ?? ""}
                onChange={(e) => setForm({ ...form, date_time: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete EIR Record"
        message={`Delete EIR record for booking "${deleteTarget?.booking_no}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
