"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search, Plus, X } from "lucide-react";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Vendor, Driver } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input } from "@/components/FormField";

interface VendorForm {
  code: string;
  name: string;
  trucks: { plate: string; gps_id: string }[];
  drivers: Driver[];
}

const EMPTY: VendorForm = {
  code: "", name: "", trucks: [{ plate: "", gps_id: "" }], drivers: [{ name: "", phone: "" }],
};

export default function VendorsPage() {
  const [records, setRecords] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>(EMPTY);
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
    setForm({ ...EMPTY, trucks: [{ plate: "", gps_id: "" }], drivers: [{ name: "", phone: "" }] });
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    // Migrate legacy `truck_plates` to the new `trucks` structure if needed
    const mappedTrucks = v.trucks?.length
      ? v.trucks.map((t) => ({ plate: t.plate || "", gps_id: t.gps_id || "" }))
      : v.truck_plates?.length
      ? v.truck_plates.map((plate) => ({ plate, gps_id: "" }))
      : [{ plate: "", gps_id: "" }];

    setForm({
      code: v.code,
      name: v.name,
      trucks: mappedTrucks,
      drivers: v.drivers?.length ? v.drivers.map((d) => ({ ...d })) : [{ name: "", phone: "" }],
    });
    setModalOpen(true);
  }

  // ── Trucks array helpers (plate & gps_id) ──
  function setTruck(i: number, field: "plate" | "gps_id", val: string) {
    setForm((f) => {
      const trucks = [...f.trucks];
      trucks[i] = { ...trucks[i], [field]: val };
      return { ...f, trucks };
    });
  }
  function addTruck() {
    setForm((f) => ({ ...f, trucks: [...f.trucks, { plate: "", gps_id: "" }] }));
  }
  function removeTruck(i: number) {
    setForm((f) => ({ ...f, trucks: f.trucks.filter((_, idx) => idx !== i) }));
  }

  // ── Drivers array helpers ──
  function setDriver(i: number, field: keyof Driver, val: string) {
    setForm((f) => {
      const drivers = f.drivers.map((d, idx) => idx === i ? { ...d, [field]: val } : d);
      return { ...f, drivers };
    });
  }
  function addDriver() {
    setForm((f) => ({ ...f, drivers: [...f.drivers, { name: "", phone: "" }] }));
  }
  function removeDriver(i: number) {
    setForm((f) => ({ ...f, drivers: f.drivers.filter((_, idx) => idx !== i) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      // Maintain backward compatibility with truck_plates just in case, while sending new trucks format
      truck_plates: form.trucks.filter((t) => t.plate.trim()).map((t) => t.plate.trim()),
      trucks: form.trucks.filter((t) => t.plate.trim()),
      drivers: form.drivers.filter((d) => d.name.trim()),
    };
    try {
      if (editing) {
        await updateRecord("vendors", editing._id, payload);
      } else {
        await createRecord<Vendor>("vendors", payload);
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
      <PageHeader title="Vendors" subtitle="จัดการข้อมูลผู้ขนส่ง ทะเบียนรถ และคนขับ" onAdd={openCreate}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาด้วยรหัส…"
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">รหัส</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ชื่อบริษัท</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ทะเบียนรถ</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">คนขับ</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--muted)]">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--muted)]">ยังไม่มีข้อมูล Vendor กด Add New เพื่อเพิ่ม</td></tr>
            ) : (
              records.map((v) => (
                <tr key={v._id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-blue-700">{v.code}</td>
                  <td className="px-5 py-3 text-[var(--foreground)]">{v.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {v.trucks?.length ? (
                        v.trucks.map((t, i) => (
                          <span key={i} className={`inline-block px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1 ${t.gps_id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-[var(--foreground)]'}`}>
                            {t.plate} {t.gps_id && <span className="text-[9px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded ml-0.5" title={`GPS ID: ${t.gps_id}`}>GPS</span>}
                          </span>
                        ))
                      ) : (
                        (v.truck_plates || []).map((p, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[var(--foreground)] text-xs font-mono">{p}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      {(v.drivers || []).map((d, i) => (
                        <span key={i} className="text-xs">
                          {d.name} <span className="text-[var(--muted)]">({d.phone})</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "แก้ไข Vendor" : "เพิ่ม Vendor"} size="lg">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="รหัสย่อ" required>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. ABC" required />
            </FormField>
            <FormField label="ชื่อเต็ม (บริษัท)" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อบริษัท" required />
            </FormField>
          </div>

          {/* Trucks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">ทะเบียนรถ & GPS</label>
              <button type="button" onClick={addTruck} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus size={12} /> เพิ่มทะเบียน
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.trucks.map((truck, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={truck.plate} onChange={(e) => setTruck(i, "plate", e.target.value)} placeholder="ทะเบียนรถ e.g. กข 1234" className="flex-1" />
                  <Input value={truck.gps_id} onChange={(e) => setTruck(i, "gps_id", e.target.value)} placeholder="GPS ID (ไม่บังคับ)" className="flex-1" />
                  {form.trucks.length > 1 && (
                    <button type="button" onClick={() => removeTruck(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Drivers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">คนขับรถ</label>
              <button type="button" onClick={addDriver} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus size={12} /> เพิ่มคนขับ
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.drivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={d.name} onChange={(e) => setDriver(i, "name", e.target.value)} placeholder="ชื่อ-นามสกุล" />
                  <Input value={d.phone} onChange={(e) => setDriver(i, "phone", e.target.value)} placeholder="เบอร์โทร" />
                  {form.drivers.length > 1 && (
                    <button type="button" onClick={() => removeDriver(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "กำลังบันทึก…" : editing ? "บันทึก" : "สร้าง Vendor"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบ Vendor"
        message={`ต้องการลบ vendor "${deleteTarget?.code}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
