"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Search, Plus, X, MapPin, Loader2, History, CalendarDays, MoreVertical, Route } from "lucide-react";
import dynamic from "next/dynamic";
const GpsMap = dynamic(() => import("@/components/GpsMap"), { ssr: false });
const DriverProfile = dynamic(() => import("@/components/DriverProfile"), { ssr: false });
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import type { Vendor, Driver } from "@/lib/types";
import { fetchGpsRealtime, getTodayDate } from "@/lib/gpsUtils";
import type { GpsPoint } from "@/components/GpsMap";
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

  // ── GPS states ──
  const [gpsTruck, setGpsTruck] = useState<{ plate: string; gps_id: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<string | null>(null);
  const [gpsMenuOpen, setGpsMenuOpen] = useState<string | null>(null); // plate of open ... menu
  // Station-to-station modal
  const [stationOpen, setStationOpen] = useState(false);
  const [stationDateMode, setStationDateMode] = useState<"today" | "custom">("today");
  const [stationDate, setStationDate] = useState(getTodayDate());
  const [stationData, setStationData] = useState<any[]>([]);
  const [stationLoading, setStationLoading] = useState(false);
  const [stationError, setStationError] = useState("");
  // History (raw) modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDateMode, setHistoryDateMode] = useState<"today" | "custom">("today");
  const [historyDate, setHistoryDate] = useState(getTodayDate());
  const [historyPoints, setHistoryPoints] = useState<GpsPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Driver Profile modal
  const [driverProfileTarget, setDriverProfileTarget] = useState<Driver | null>(null);

  // ── GPS handlers ──
  async function handleGpsCurrentLocation(truck: { plate: string; gps_id: string }) {
    setGpsMenuOpen(null);
    setGpsLoading(truck.plate);
    try {
      const data = await fetchGpsRealtime(truck.gps_id);
      const mapsUrl = `https://maps.google.com/?q=${data.lat},${data.lon}`;
      window.open(mapsUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลพิกัด GPS");
    } finally {
      setGpsLoading(null);
    }
  }

  async function handleOpenStation(truck: { plate: string; gps_id: string }) {
    setGpsMenuOpen(null);
    setGpsTruck(truck);
    setStationOpen(true);
    setStationDateMode("today");
    setStationDate(getTodayDate());
    setStationData([]);
    setStationError("");
    fetchStation(truck.gps_id, getTodayDate());
  }

  async function fetchStation(gpsId: string, date: string) {
    setStationLoading(true);
    setStationError("");
    setStationData([]);
    try {
      const res = await fetch("/api/gps/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gps_id: gpsId, date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ไม่สามารถดึงข้อมูลได้");
      setStationData(json.stations || []);
    } catch (err: any) {
      setStationError(err.message || "ไม่สามารถดึงข้อมูลประวัติได้");
    } finally {
      setStationLoading(false);
    }
  }

  async function handleOpenHistory(truck: { plate: string; gps_id: string }) {
    setGpsMenuOpen(null);
    setGpsTruck(truck);
    setHistoryOpen(true);
    setHistoryDateMode("today");
    setHistoryDate(getTodayDate());
    setHistoryPoints([]);
    setHistoryError("");
    fetchHistoryRaw(truck.gps_id, getTodayDate());
  }

  async function fetchHistoryRaw(gpsId: string, date: string) {
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryPoints([]);
    try {
      const res = await fetch("/api/gps/history-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gps_id: gpsId, date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ไม่สามารถดึงข้อมูลได้");
      setHistoryPoints(json.points || []);
    } catch (err: any) {
      setHistoryError(err.message || "ไม่สามารถดึงข้อมูลประวัติได้");
    } finally {
      setHistoryLoading(false);
    }
  }

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
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
          />
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {/* ── Mobile cards ── */}
      <div className="md:hidden flex flex-col gap-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm px-4 py-10 text-center text-[var(--muted)] text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm px-4 py-10 text-center text-[var(--muted)] text-sm">ยังไม่มีข้อมูล Vendor กด Add New เพื่อเพิ่ม</div>
        ) : (
          records.map((v) => (
            <div key={v._id} className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-blue-700 text-sm">{v.code}</span>
                  <p className="text-xs text-[var(--foreground)] truncate mt-0.5">{v.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--muted)] hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              {/* Trucks */}
              <div className="mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ทะเบียนรถ</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  {v.trucks?.length ? (
                    v.trucks.map((t, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono ${t.gps_id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-[var(--foreground)]'}`}>
                        <span className="flex-1 truncate">{t.plate}</span>
                        {t.gps_id && (
                          <div className="relative shrink-0">
                            <button type="button"
                              onClick={() => setGpsMenuOpen(gpsMenuOpen === t.plate ? null : t.plate)}
                              className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors">
                              {gpsLoading === t.plate ? <Loader2 size={12} className="animate-spin" /> : <MoreVertical size={12} />}
                            </button>
                            {gpsMenuOpen === t.plate && (
                              <div className="absolute right-0 top-6 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => handleGpsCurrentLocation({ plate: t.plate, gps_id: t.gps_id! })}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors">
                                  <MapPin size={12} className="text-blue-500" /> ตำแหน่ง Realtime
                                </button>
                                <button type="button" onClick={() => handleOpenStation({ plate: t.plate, gps_id: t.gps_id! })}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-violet-50 text-slate-700 hover:text-violet-700 transition-colors">
                                  <Route size={12} className="text-violet-500" /> Station to Station
                                </button>
                                <button type="button" onClick={() => handleOpenHistory({ plate: t.plate, gps_id: t.gps_id! })}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors">
                                  <History size={12} className="text-emerald-500" /> ประวัติ GPS
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    (v.truck_plates || []).map((p, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[var(--foreground)] text-xs font-mono">{p}</span>
                    ))
                  )}
                </div>
              </div>
              {/* Drivers */}
              {(v.drivers || []).length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">คนขับ</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    {v.drivers.map((d, i) => (
                      <button 
                        key={i} 
                        type="button"
                        onClick={() => setDriverProfileTarget(d)}
                        className="text-xs text-left hover:text-blue-600 transition-colors group"
                      >
                        {d.name} <span className="text-[var(--muted)] group-hover:text-blue-400">({d.phone})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
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
                    <div className="flex flex-col gap-1">
                      {v.trucks?.length ? (
                        v.trucks.map((t, i) => (
                          <div key={i} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ${t.gps_id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-[var(--foreground)]'}`}>
                            <span className="truncate">{t.plate}</span>
                            {t.gps_id && (
                              <div className="relative shrink-0 ml-auto">
                                <button type="button"
                                  onClick={() => setGpsMenuOpen(gpsMenuOpen === t.plate ? null : t.plate)}
                                  className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors">
                                  {gpsLoading === t.plate ? <Loader2 size={12} className="animate-spin" /> : <MoreVertical size={12} />}
                                </button>
                                {gpsMenuOpen === t.plate && (
                                  <div className="absolute right-0 top-6 z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => handleGpsCurrentLocation({ plate: t.plate, gps_id: t.gps_id! })}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors">
                                      <MapPin size={12} className="text-blue-500" /> ตำแหน่ง Realtime
                                    </button>
                                    <button type="button" onClick={() => handleOpenStation({ plate: t.plate, gps_id: t.gps_id! })}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-violet-50 text-slate-700 hover:text-violet-700 transition-colors">
                                      <Route size={12} className="text-violet-500" /> Station to Station
                                    </button>
                                    <button type="button" onClick={() => handleOpenHistory({ plate: t.plate, gps_id: t.gps_id! })}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors">
                                      <History size={12} className="text-emerald-500" /> ประวัติ GPS
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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
                        <button 
                          key={i} 
                          type="button"
                          onClick={() => setDriverProfileTarget(d)}
                          className="text-xs text-left hover:text-blue-600 transition-colors group"
                        >
                          {d.name} <span className="text-[var(--muted)] group-hover:text-blue-400">({d.phone})</span>
                        </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* ── Station-to-Station Modal ── */}
      <Modal open={stationOpen} onClose={() => setStationOpen(false)} title={`Station to Station — ${gpsTruck?.plate || ""}`} size="lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => { setStationDateMode("today"); fetchStation(gpsTruck!.gps_id, getTodayDate()); setStationDate(getTodayDate()); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${stationDateMode === "today" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <CalendarDays size={11} className="inline mr-1" />วันนี้
            </button>
            <button type="button" onClick={() => setStationDateMode("custom")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${stationDateMode === "custom" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <CalendarDays size={11} className="inline mr-1" />เลือกวันที่
            </button>
            {stationDateMode === "custom" && (
              <input type="date" value={stationDate} onChange={(e) => { setStationDate(e.target.value); fetchStation(gpsTruck!.gps_id, e.target.value); }}
                className="px-2 py-1 text-xs border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500" />
            )}
            <span className="text-[10px] text-slate-400 ml-auto">0:00 – 23:59</span>
          </div>

          {stationLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin mr-2 text-violet-500" /><span className="text-sm text-slate-500">กำลังโหลด…</span></div>
          ) : stationError ? (
            <div className="py-4 text-sm text-red-500 text-center bg-red-50 rounded-lg">{stationError}</div>
          ) : stationData.length === 0 ? (
            <div className="py-6 text-sm text-slate-400 text-center bg-slate-50 rounded-lg">ไม่พบข้อมูลสำหรับวันที่นี้</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-blue-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">ต้นทาง</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">เวลาออก</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500">ปลายทาง</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">เวลาถึง</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-500">km</th>
                  </tr>
                </thead>
                <tbody>
                  {stationData.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-violet-50/30 transition-colors">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /><span className="font-medium text-slate-700">{s.station_f || "—"}</span></div></td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{s.start_date} {s.start_time}</td>
                      <td className="px-3 py-2"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /><span className="font-medium text-slate-700">{s.station_n || "—"}</span></div></td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{s.end_date} {s.end_time}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{s.distance || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ── GPS History Modal (with map) ── */}
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`ประวัติ GPS — ${gpsTruck?.plate || ""}`} size="lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => { setHistoryDateMode("today"); fetchHistoryRaw(gpsTruck!.gps_id, getTodayDate()); setHistoryDate(getTodayDate()); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${historyDateMode === "today" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <CalendarDays size={11} className="inline mr-1" />วันนี้
            </button>
            <button type="button" onClick={() => setHistoryDateMode("custom")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${historyDateMode === "custom" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <CalendarDays size={11} className="inline mr-1" />เลือกวันที่
            </button>
            {historyDateMode === "custom" && (
              <input type="date" value={historyDate} onChange={(e) => { setHistoryDate(e.target.value); fetchHistoryRaw(gpsTruck!.gps_id, e.target.value); }}
                className="px-2 py-1 text-xs border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            )}
            {historyPoints.length > 0 && <span className="text-[10px] text-slate-400 ml-auto">{historyPoints.length} จุด</span>}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin mr-2 text-emerald-500" /><span className="text-sm text-slate-500">กำลังโหลด…</span></div>
          ) : historyError ? (
            <div className="py-4 text-sm text-red-500 text-center bg-red-50 rounded-lg">{historyError}</div>
          ) : historyPoints.length === 0 ? (
            <div className="py-6 text-sm text-slate-400 text-center bg-slate-50 rounded-lg">ไม่พบข้อมูลสำหรับวันที่นี้</div>
          ) : (
            <>
              {/* Map */}
              <GpsMap points={historyPoints} />
              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] text-slate-500 px-1">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm" />เริ่มต้น</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm" />สิ้นสุด</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-white shadow-sm" />📍 สถานี</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-sm" />จุด GPS</div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Driver Profile Modal ── */}
      <Modal 
        open={!!driverProfileTarget} 
        onClose={() => setDriverProfileTarget(null)} 
        title="ประวัติคนขับรถ" 
        size="lg"
      >
        <div className="h-[500px]">
          {driverProfileTarget && <DriverProfile driver={driverProfileTarget} mode="visitor" />}
        </div>
      </Modal>
    </div>
  );
}
