"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search } from "lucide-react";
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

  return (
    <div>
      <PageHeader title="Customers" subtitle="จัดการข้อมูลลูกค้า" onAdd={openCreate}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อลูกค้า…"
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
        </div>
      </PageHeader>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Code</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Name</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-[var(--muted)]">ยังไม่มีลูกค้า กด Add New เพื่อเพิ่ม</td></tr>
            ) : records.map((c, i) => (
              <tr key={c._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-[var(--muted)] text-xs">{i + 1}</td>
                <td className="px-5 py-3 font-mono font-medium text-blue-700">{c.code}</td>
                <td className="px-5 py-3 font-medium">{c.name}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"} size="sm">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Customer Code" required>
            <Input value={form.code} onChange={set("code")} placeholder="e.g. CUS001" required />
          </FormField>
          <FormField label="Customer Name" required>
            <Input value={form.name} onChange={set("name")} placeholder="ชื่อลูกค้า / บริษัท" required />
          </FormField>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "กำลังบันทึก…" : editing ? "บันทึก" : "เพิ่มลูกค้า"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="ลบลูกค้า"
        message={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่?`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />
    </div>
  );
}
