"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Vendor } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input } from "@/components/FormField";

const EMPTY: Omit<Vendor, "_id" | "created_at"> = {
  code: "", name: "", truck_plate: "", driver_name: "", phone: "",
};

export default function VendorsPage() {
  const [records, setRecords] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Omit<Vendor, "_id" | "created_at">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listRecords<Vendor>("vendors", search ? { code: search } : {});
      setRecords(res.records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({ code: v.code, name: v.name, truck_plate: v.truck_plate, driver_name: v.driver_name, phone: v.phone });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateRecord("vendors", editing._id, form);
      } else {
        await createRecord<Vendor>("vendors", form);
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
      await deleteRecord("vendors", deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Manage truck vendors and driver information"
        onAdd={openCreate}
      >
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code…"
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
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
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Truck Plate</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--muted)]">No vendors found. Add one to get started.</td>
              </tr>
            ) : (
              records.map((v) => (
                <tr key={v._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-blue-700">{v.code}</td>
                  <td className="px-5 py-3 text-[var(--foreground)]">{v.name}</td>
                  <td className="px-5 py-3 font-mono">{v.truck_plate}</td>
                  <td className="px-5 py-3">{v.driver_name}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">{v.phone}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
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
        title={editing ? "Edit Vendor" : "Add Vendor"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Short Code" required>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. ABC"
                required
              />
            </FormField>
            <FormField label="Full Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Company name"
                required
              />
            </FormField>
          </div>
          <FormField label="Truck Plate">
            <Input
              value={form.truck_plate}
              onChange={(e) => setForm({ ...form, truck_plate: e.target.value })}
              placeholder="e.g. กข 1234"
            />
          </FormField>
          <FormField label="Driver Name">
            <Input
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
              placeholder="Driver full name"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. 0812345678"
            />
          </FormField>
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
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Vendor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Vendor"
        message={`Are you sure you want to delete vendor "${deleteTarget?.code}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
