"use client";
import { useState, useEffect, useCallback } from "react";
import { Building2, Pencil, Search, Trash2, UsersRound } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Customer } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input } from "@/components/FormField";

interface CustomerForm { code: string; name: string; }
const EMPTY: CustomerForm = { code: "", name: "" };

export default function CustomersPage() {
  const [records, setRecords] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await listRecords<Customer>("customers", search ? { name: search } : {});
      setRecords(res.records);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Load failed"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ code: c.code, name: c.name });
    setModalOpen(true);
  }

  const set = (k: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await updateRecord("customers", editing._id, form as unknown as Record<string, unknown>);
      else await createRecord<Customer>("customers", form as unknown as Record<string, unknown>);
      setModalOpen(false); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecord("customers", deleteTarget._id);
      setDeleteTarget(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  const newest = records[0]?.created_at ? new Date(records[0].created_at).toLocaleDateString() : "-";

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Customer master data for booking operations" onAdd={openCreate}>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name..."
            className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><UsersRound size={14} /> Total customers</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{records.length}</div>
        </div>
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Search size={14} /> Filtered by</div>
          <div className="mt-2 truncate text-sm font-semibold text-slate-800">{search || "All customers"}</div>
        </div>
        <div className="border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Building2 size={14} /> Latest record</div>
          <div className="mt-2 text-sm font-semibold text-slate-800">{newest}</div>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">No customers found.</div>
        ) : records.map((c) => (
          <div key={c._id} className="border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-sm font-bold text-blue-700">{c.code}</div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-900">{c.name}</div>
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
              <th className="w-14 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Code</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Customer</th>
              <th className="w-28 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No customers found.</td></tr>
            ) : records.map((c, i) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.code}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Edit"><Pencil size={15} /></button>
                    <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit customer" : "Add customer"} size="sm">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Customer Code" required>
            <Input value={form.code} onChange={set("code")} placeholder="e.g. CUS001" required />
          </FormField>
          <FormField label="Customer Name" required>
            <Input value={form.name} onChange={set("name")} placeholder="Company or customer name" required />
          </FormField>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Saving..." : editing ? "Save" : "Add customer"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete customer"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
