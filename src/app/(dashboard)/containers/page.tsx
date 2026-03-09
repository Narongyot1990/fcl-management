"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Container } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";

const SIZE_OPTIONS = [
  { value: "20", label: "20ft" },
  { value: "40", label: "40ft" },
  { value: "40HC", label: "40ft HC" },
  { value: "45", label: "45ft" },
];

const EMPTY: Omit<Container, "_id" | "created_at"> = { code: "", size: "" };

export default function ContainersPage() {
  const [records, setRecords] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Container | null>(null);
  const [form, setForm] = useState<Omit<Container, "_id" | "created_at">>(EMPTY);
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
      setError(e instanceof Error ? e.message : "Failed to load containers");
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

  function openEdit(c: Container) {
    setEditing(c);
    setForm({ code: c.code, size: c.size });
    setModalOpen(true);
  }

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
      await deleteRecord("containers", deleteTarget._id);
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
        title="Containers"
        subtitle="Manage container codes and size classifications"
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
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Size</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-[var(--muted)]">No containers found. Add one to get started.</td>
              </tr>
            ) : (
              records.map((c) => (
                <tr key={c._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-emerald-700">{c.code}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {c.size}ft
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--muted)] text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
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
        title={editing ? "Edit Container" : "Add Container"}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Container Code" required>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. TCKU1234567"
              required
            />
          </FormField>
          <FormField label="Size" required>
            <Select
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              options={SIZE_OPTIONS}
              placeholder="Select size…"
              required
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
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Container"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Container"
        message={`Are you sure you want to delete container "${deleteTarget?.code}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
