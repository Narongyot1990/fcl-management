"use client";
import { useState, useEffect, useCallback } from "react";
import { Boxes, Pencil, Ruler, Search, Trash2 } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Container } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input } from "@/components/FormField";

const EMPTY = { code: "", size: "" };

export default function ContainersPage() {
  const [records, setRecords] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Container | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listRecords<Container>("containers", search ? { code: search } : {});
      setRecords(res.records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(c: Container) { setEditing(c); setForm({ code: c.code, size: c.size }); setModalOpen(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateRecord("containers", editing._id, form);
      } else {
        await createRecord<Container>("containers", form);
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
      await deleteRecord("containers", deleteTarget._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  const uniqueSizes = new Set(records.map((record) => record.size).filter(Boolean)).size;
  const newest = records[0]?.created_at ? new Date(records[0].created_at).toLocaleDateString() : "-";

  return (
    <div className="space-y-4">
      <PageHeader title="Containers" subtitle="Container ISO code and size master data" onAdd={openCreate}>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search size code..."
            className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Boxes size={14} /> Total codes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{records.length}</div>
        </div>
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Ruler size={14} /> Unique sizes</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{uniqueSizes}</div>
        </div>
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Search size={14} /> Latest record</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{newest}</div>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-2 md:hidden">
        {loading ? (
          <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">No container codes found.</div>
        ) : records.map((c) => (
          <div key={c._id} className="border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-base font-bold text-emerald-700">{c.code}</div>
                <div className="mt-1 inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{c.size}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">ISO Code</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Size</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Created</th>
              <th className="w-28 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No container codes found.</td></tr>
            ) : (
              records.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{c.size}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                      <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit container code" : "Add container code"}>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Size Code (ISO)" required hint="e.g. 45G1, 22G1, 42G1">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="45G1" required />
          </FormField>
          <FormField label="Size" required hint="e.g. 40HC, 20, 40">
            <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="40HC" required />
          </FormField>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Saving..." : editing ? "Save" : "Create code"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete container code"
        message={`Delete container "${deleteTarget?.code}" (${deleteTarget?.size})? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
