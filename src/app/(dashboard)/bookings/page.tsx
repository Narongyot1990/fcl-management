"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import dynamic from "next/dynamic";
const DriverProfile = dynamic(() => import("@/components/DriverProfile"), { ssr: false });
import ImageUpload from "@/components/ImageUpload";
import GeminiOcrButton from "@/components/GeminiOcrButton";
import { listRecords, updateRecord, deleteRecord, createShipment, listBookingsGrouped } from "@/lib/api";
import { useAuth } from "@/lib/auth/context";
import type { Booking, BookingWithShipments, Shipment, Vendor, Container, Customer, Driver } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";
import DateNavigator from "@/components/DateNavigator";
import ImageFullscreenModal, { type ImageModalInfo } from "@/components/ImageFullscreenModal";
import BookingGroupRow from "./components/BookingGroupRow";
import Section from "./components/Section";
import Toggle from "./components/Toggle";
import ProcessModalFields from "./components/ProcessModalFields";
import {
  STEP_MODAL_TITLES,
  JOB_TYPE_OPTIONS,
  EMPTY_FORM,
  EMPTY_HEADER,
  toProxyUrl,
} from "./utils/booking-utils";
import type { BookingHeaderForm, ShipmentForm } from "./types/booking-form";
import { getTodayDate } from "@/lib/gpsUtils";

// ── Default codes pre-selected on new booking (most bookings use these) ──────
const DEFAULT_CUSTOMER_CODE = "HRF";
const DEFAULT_VENDOR_CODE = "FLS";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const WORKFLOW_FILTERS = [
  { value: "all", label: "All" },
  { value: "no_truck", label: "No truck" },
  { value: "no_container", label: "No container" },
  { value: "loading_pending", label: "Loading pending" },
  { value: "loaded", label: "Loaded" },
  { value: "return_pending", label: "Return pending" },
] as const;
type WorkflowFilter = (typeof WORKFLOW_FILTERS)[number]["value"];

type EditTarget =
  | { mode: "shipment"; shipment: Shipment; booking: BookingWithShipments }
  | { mode: "header"; booking: BookingWithShipments }
  | null;

interface ConfirmCreateState {
  booking_no: string;
  existingShipmentCount: number;
  nextShipmentNo: number;
  payload: Record<string, unknown>;
}

function extractErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Something went wrong";
  const idx = msg.indexOf(": ");
  if (idx === -1) return msg;
  try {
    const parsed = JSON.parse(msg.slice(idx + 2));
    if (parsed?.error) return String(parsed.error);
  } catch {
    /* not JSON, fall through */
  }
  return msg;
}

/** "BKK0001" -> valid, no shipment number ; "BKK0001 #2" -> valid, shipment 2 ; anything else invalid for bulk mode. */
function parseBulkLine(line: string): { booking_no: string; shipment_no: number } | null {
  const match = line.trim().match(/^(.*\S)\s*#\s*(\d+)\s*$/);
  if (!match) return null;
  const n = Number.parseInt(match[2], 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return { booking_no: match[1].trim(), shipment_no: n };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { can } = useAuth();
  const canWrite = can("bookings:write");
  const [records, setRecords] = useState<BookingWithShipments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processStep] = useState(0);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [headerForm, setHeaderFormState] = useState<BookingHeaderForm>(EMPTY_HEADER);
  const [form, setFormState] = useState<ShipmentForm>(EMPTY_FORM);
  const [bookingInput, setBookingInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState<ConfirmCreateState | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLines, setBulkLines] = useState<{ raw: string; parsed: { booking_no: string; shipment_no: number } | null }[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<{ shipment: Shipment; booking: BookingWithShipments } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalEirUrl, setImageModalEirUrl] = useState("");
  const [imageModalContainerUrl, setImageModalContainerUrl] = useState("");
  const [imageModalTitle, setImageModalTitle] = useState("");
  const [imageModalInfo, setImageModalInfo] = useState<ImageModalInfo | null>(null);
  const [openingGps, setOpeningGps] = useState<string | null>(null);
  const [driverProfileTarget, setDriverProfileTarget] = useState<Driver | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Image Modal ──
  function buildImageInfo(shipment: Shipment, booking: BookingWithShipments): ImageModalInfo {
    return {
      bookingNo: booking.booking_no + (shipment.shipment_no > 1 ? ` #${shipment.shipment_no}` : ""),
      containerNo: shipment.container_no,
      containerSize: shipment.container_size,
      containerSizeCode: shipment.container_size_code,
      sealNo: shipment.seal_no,
      tareWeight: shipment.tare_weight,
      driverName: shipment.driver_name,
      truckPlate: shipment.truck_plate,
      driverPhone: shipment.driver_phone,
      planPickupDate: shipment.plan_pickup_date,
      returnDriverName: shipment.return_driver_name,
      returnTruckPlate: shipment.return_truck_plate,
      returnCompleted: shipment.return_completed,
    };
  }

  function openImageModal(eirUrl: string, containerUrl: string, shipment: Shipment, booking: BookingWithShipments) {
    setImageModalEirUrl(eirUrl);
    setImageModalContainerUrl(containerUrl);
    setImageModalTitle(booking.booking_no);
    setImageModalInfo(buildImageInfo(shipment, booking));
    setImageModalOpen(true);
  }

  function openSingleImageModal(url: string, title: string, shipment: Shipment, booking: BookingWithShipments) {
    setImageModalEirUrl(url);
    setImageModalContainerUrl("");
    setImageModalTitle(title);
    setImageModalInfo(buildImageInfo(shipment, booking));
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
      const res = await listBookingsGrouped<BookingWithShipments>(
        {
          booking_no: search.trim(),
          date_from: dateFrom,
          date_to: dateTo,
          workflow: workflowFilter === "all" ? "" : workflowFilter,
        },
        { page, limit: pageSize }
      );
      setRecords(res.records);
      setTotalRecords(res.total ?? res.count);
      setTotalPages(res.totalPages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, workflowFilter, page, pageSize]);

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

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, workflowFilter, pageSize]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  // ── Vendor/Container Helpers ──
  const selectedVendor = vendors.find((v) => v.code === (form.vendor_code || headerForm.vendor_code));
  const truckPlateOptions = (selectedVendor?.truck_plates || []).map((p) => ({ value: p, label: p }));
  const driverOptions = (selectedVendor?.drivers || []).map((d) => ({ value: d.name, label: d.name }));
  const sizeOptions = [...new Map(containers.map((c) => [c.size, c])).values()].map((c) => ({ value: c.size, label: c.size }));
  const codeOptions = containers.filter((c) => !form.container_size || c.size === form.container_size).map((c) => ({ value: c.code, label: c.code }));

  function handleHeaderVendorChange(code: string) {
    setHeaderFormState((f) => ({ ...f, vendor_code: code }));
  }

  function handleVendorChange(code: string) {
    setFormState((f) => ({ ...f, vendor_code: code, truck_plate: "", driver_name: "", driver_phone: "" }));
  }

  function handleDriverChange(name: string) {
    const driver = selectedVendor?.drivers?.find((d) => d.name === name);
    setFormState((f) => ({ ...f, driver_name: name, driver_phone: driver?.phone ?? "" }));
  }

  function handleReturnDriverChange(name: string) {
    const driver = selectedVendor?.drivers?.find((d) => d.name === name);
    setFormState((f) => ({ ...f, return_driver_name: name, return_driver_phone: driver?.phone ?? "" }));
  }

  function handleSizeChange(size: string) {
    const match = containers.find((c) => c.size === size);
    setFormState((f) => ({ ...f, container_size: size, container_size_code: match?.code ?? "" }));
  }

  function handleCodeChange(code: string) {
    const match = containers.find((c) => c.code === code);
    setFormState((f) => ({ ...f, container_size_code: code, container_size: match?.size ?? f.container_size }));
  }

  // ── Form Helpers ──
  function bookingHeaderToForm(b: Booking): BookingHeaderForm {
    return {
      booking_date: b.booking_date ?? "",
      job_type: b.job_type ?? "Export",
      customer_code: b.customer_code ?? "",
      vendor_code: b.vendor_code ?? "",
    };
  }

  function shipmentToForm(s: Shipment): ShipmentForm {
    return {
      vendor_code: s.vendor_code ?? "",
      truck_plate: s.truck_plate ?? "",
      driver_name: s.driver_name ?? "",
      driver_phone: s.driver_phone ?? "",
      plan_pickup_date: s.plan_pickup_date ?? "",
      eta: s.eta ?? "",
      container_no: s.container_no ?? "",
      container_size: s.container_size ?? "",
      container_size_code: s.container_size_code ?? "",
      tare_weight: s.tare_weight ?? "",
      seal_no: s.seal_no ?? "",
      eir_image_url: toProxyUrl(s.eir_image_url),
      container_image_url: toProxyUrl(s.container_image_url),
      loading_status: s.loading_status ?? "pending",
      plan_loading_date: s.plan_loading_date ?? "",
      pending_at: s.pending_at ?? "",
      loading_at: s.loading_at ?? "",
      loaded_at: s.loaded_at ?? "",
      plan_return_date: s.plan_return_date ?? "",
      return_truck_plate: s.return_truck_plate ?? "",
      return_driver_name: s.return_driver_name ?? "",
      return_driver_phone: s.return_driver_phone ?? "",
      gcl_received: s.gcl_received ?? false,
      return_date: s.return_date ?? "",
      return_completed: s.return_completed ?? false,
    };
  }

  function openCreate() {
    setEditTarget(null);
    setBulkMode(false);
    setBulkText("");
    setBulkLines([]);
    setCreateError(null);
    setConfirmCreate(null);
    setBookingInput("");
    setHeaderFormState({
      ...EMPTY_HEADER,
      booking_date: getTodayDate(),
      customer_code: customers.find((c) => c.code === DEFAULT_CUSTOMER_CODE)?.code ?? "",
      vendor_code: vendors.find((v) => v.code === DEFAULT_VENDOR_CODE)?.code ?? "",
    });
    setFormState(EMPTY_FORM);
    setModalOpen(true);
  }

  function openAddShipment(booking: BookingWithShipments) {
    setEditTarget(null);
    setBulkMode(false);
    setBulkText("");
    setBulkLines([]);
    setCreateError(null);
    setConfirmCreate(null);
    setBookingInput(booking.booking_no);
    setHeaderFormState(bookingHeaderToForm(booking));
    setFormState(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditShipment(shipment: Shipment, booking: BookingWithShipments) {
    setEditTarget({ mode: "shipment", shipment, booking });
    setCreateError(null);
    setHeaderFormState(bookingHeaderToForm(booking));
    setFormState(shipmentToForm(shipment));
    setModalOpen(true);
  }

  function openEditBooking(booking: BookingWithShipments) {
    setEditTarget({ mode: "header", booking });
    setCreateError(null);
    setHeaderFormState(bookingHeaderToForm(booking));
    setModalOpen(true);
  }

  // ── Save Handlers ──
  async function handleCreateSingle() {
    setCreateError(null);
    setSaving(true);
    try {
      const payload = { input: bookingInput, ...headerForm, ...form };
      const res = await createShipment<Booking, Shipment>(payload);
      if (res.needsConfirmation) {
        setConfirmCreate({
          booking_no: res.booking_no!,
          existingShipmentCount: res.existingShipmentCount!,
          nextShipmentNo: res.nextShipmentNo!,
          payload,
        });
        return;
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      setCreateError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmCreate() {
    if (!confirmCreate) return;
    setSaving(true);
    try {
      await createShipment<Booking, Shipment>({ ...confirmCreate.payload, confirmed: true });
      setConfirmCreate(null);
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      setConfirmCreate(null);
      setCreateError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function parseBulkText(text: string) {
    const lines = text.split(/[\n\r]+/).map((s) => s.trim()).filter(Boolean);
    setBulkLines(lines.map((raw) => ({ raw, parsed: parseBulkLine(raw) })));
  }

  function handleBulkTextChange(text: string) {
    setBulkText(text);
    parseBulkText(text);
  }

  async function handleBulkSave() {
    const invalid = bulkLines.filter((l) => !l.parsed);
    if (bulkLines.length === 0) { alert("No lines to create"); return; }
    if (invalid.length > 0) {
      alert(`Every line must include a shipment number, e.g. "BKK0001 #1". Missing on:\n${invalid.map((l) => l.raw).join("\n")}`);
      return;
    }
    setSaving(true);
    try {
      const created: string[] = [];
      const failed: string[] = [];
      for (const line of bulkLines) {
        const p = line.parsed!;
        try {
          await createShipment<Booking, Shipment>({
            input: `${p.booking_no} #${p.shipment_no}`,
            ...headerForm,
            ...form,
          });
          created.push(`${p.booking_no} #${p.shipment_no}`);
        } catch (e: unknown) {
          failed.push(`${p.booking_no} #${p.shipment_no}: ${extractErrorMessage(e)}`);
        }
      }
      let summary = `Created ${created.length} shipment(s).`;
      if (failed.length > 0) summary += `\n\nFailed (${failed.length}):\n${failed.join("\n")}`;
      alert(summary);
      if (failed.length === 0) setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) {
      if (bulkMode) await handleBulkSave();
      else await handleCreateSingle();
      return;
    }

    setSaving(true);
    try {
      if (editTarget.mode === "header") {
        await updateRecord("bookings", editTarget.booking._id, headerForm as unknown as Record<string, unknown>);
      } else {
        await updateRecord("bookings", editTarget.booking._id, headerForm as unknown as Record<string, unknown>);
        await updateRecord("shipments", editTarget.shipment._id, form as unknown as Record<string, unknown>);
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleProcessSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || editTarget.mode !== "shipment") return;
    setSaving(true);
    try {
      await updateRecord("bookings", editTarget.booking._id, headerForm as unknown as Record<string, unknown>);
      await updateRecord("shipments", editTarget.shipment._id, form as unknown as Record<string, unknown>);
      setProcessModalOpen(false);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecord("shipments", deleteTarget.shipment._id);
      setDeleteTarget(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed"); }
    finally { setDeleting(false); }
  }

  function copyPickupInfo(shipment: Shipment, booking: BookingWithShipments) {
    const cells = [
      booking.booking_no + (shipment.shipment_no > 1 ? ` #${shipment.shipment_no}` : ""),
      shipment.container_size,
      shipment.container_size_code,
      shipment.container_no,
      shipment.seal_no,
      shipment.tare_weight,
      shipment.driver_name,
      shipment.driver_phone,
      shipment.truck_plate,
    ];
    const headers = [
      "Booking number",
      "Size",
      "Code",
      "Container number",
      "Seal number",
      "Tare Weight",
      "Driver Name",
      "Mobile Number",
      "Truck number",
    ];
    const th = (label: string) =>
      `<th style="background:#92D050;color:#000;font-weight:bold;border:1px solid #000;padding:4px 8px;text-align:center;">${label}</th>`;
    const td = (value: string) =>
      `<td style="font-weight:bold;border:1px solid #000;padding:4px 8px;text-align:center;">${value ?? ""}</td>`;
    const html = `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;">
      <tr>${headers.map(th).join("")}</tr>
      <tr>${cells.map((v) => td(String(v ?? ""))).join("")}</tr>
    </table>`;
    const text = [headers.join("\t"), cells.join("\t")].join("\n");

    const doCopy = () => {
      setCopiedId(shipment._id);
      setTimeout(() => setCopiedId(null), 2000);
    };

    if (typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      navigator.clipboard.write([item]).then(doCopy).catch(() => {
        navigator.clipboard.writeText(text).then(doCopy);
      });
    } else {
      navigator.clipboard.writeText(text).then(doCopy);
    }
  }

  function copyBookingInfo(booking: BookingWithShipments) {
    const headers = [
      "Booking number",
      "Size",
      "Code",
      "Container number",
      "Seal number",
      "Tare Weight",
      "Driver Name",
      "Mobile Number",
      "Truck number",
    ];
    const rows = booking.shipments.map((shipment) => [
      `${booking.booking_no} #${shipment.shipment_no}`,
      shipment.container_size,
      shipment.container_size_code,
      shipment.container_no,
      shipment.seal_no,
      shipment.tare_weight,
      shipment.driver_name,
      shipment.driver_phone,
      shipment.truck_plate,
    ]);
    const th = (label: string) =>
      `<th style="background:#92D050;color:#000;font-weight:bold;border:1px solid #000;padding:4px 8px;text-align:center;">${label}</th>`;
    const td = (value: string) =>
      `<td style="font-weight:bold;border:1px solid #000;padding:4px 8px;text-align:center;">${value ?? ""}</td>`;
    const html = `<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;">
      <tr>${headers.map(th).join("")}</tr>
      ${rows.map((cells) => `<tr>${cells.map((v) => td(String(v ?? ""))).join("")}</tr>`).join("")}
    </table>`;
    const text = [headers.join("\t"), ...rows.map((cells) => cells.join("\t"))].join("\n");

    const doCopy = () => {
      setCopiedId(booking._id);
      setTimeout(() => setCopiedId(null), 2000);
    };

    if (typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      navigator.clipboard.write([item]).then(doCopy).catch(() => {
        navigator.clipboard.writeText(text).then(doCopy);
      });
    } else {
      navigator.clipboard.writeText(text).then(doCopy);
    }
  }

  const set = (k: keyof ShipmentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormState((prev) => ({ ...prev, [k]: e.target.value }));

  const setHeader = (k: keyof BookingHeaderForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setHeaderFormState((prev) => ({ ...prev, [k]: e.target.value }));

  const setFormField = (key: keyof ShipmentForm, value: unknown) => setFormState((f) => ({ ...f, [key]: value }));
  const hasFilters = !!search || !!dateFrom || !!dateTo || workflowFilter !== "all";
  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setWorkflowFilter("all");
  }
  const firstRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, totalRecords);
  const paginationPages = Array.from(
    { length: Math.min(totalPages, 7) },
    (_, index) => {
      const start = Math.min(
        Math.max(page - 3, 1),
        Math.max(totalPages - 6, 1)
      );
      return start + index;
    }
  );

  const isEditing = !!editTarget;
  const modalTitle = editTarget?.mode === "header"
    ? `Edit Booking — ${editTarget.booking.booking_no}`
    : editTarget?.mode === "shipment"
      ? `Edit Shipment — ${editTarget.booking.booking_no} #${editTarget.shipment.shipment_no}`
      : "Create New Booking";

  // ── Render ──
  return (
    <div className="space-y-4">
      <PageHeader title="Bookings" subtitle="Booking operations board" onAdd={canWrite ? openCreate : undefined} />
      <div className="border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking no..."
                className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <DateNavigator dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              aria-label="Bookings per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-medium text-slate-500">
            <Filter size={13} /> Workflow
          </span>
          {WORKFLOW_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setWorkflowFilter(filter.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                workflowFilter === filter.value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* ── Bookings Table ── */}
      <div className="overflow-hidden border border-[var(--border)] bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-10 text-center text-[var(--muted)]">Loading…</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center text-[var(--muted)]">No bookings yet. Click Add New to create one.</div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Booking / Shipment</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Schedule</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Container</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Truck / Driver</th>
                  <th className="px-3 py-2 text-right font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((b) => (
                  <BookingGroupRow
                    key={b._id}
                    booking={b}
                    vendors={vendors}
                    copiedId={copiedId}
                    openingGps={openingGps}
                    expanded={expandedIds.has(b._id)}
                    onToggleExpand={() => toggleExpand(b._id)}
                    onEditBooking={openEditBooking}
                    onAddShipment={openAddShipment}
                    onEditShipment={openEditShipment}
                    onDeleteShipment={(shipment, booking) => setDeleteTarget({ shipment, booking })}
                    onCopy={copyPickupInfo}
                    onCopyBooking={copyBookingInfo}
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
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing <span className="font-semibold text-slate-700">{firstRecord}</span>
            {" - "}
            <span className="font-semibold text-slate-700">{lastRecord}</span>
            {" of "}
            <span className="font-semibold text-slate-700">{totalRecords}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              First
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Prev
            </button>
            {paginationPages.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                disabled={loading}
                className={`min-w-8 px-2 py-1 rounded border transition-colors ${
                  pageNumber === page
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Modal Form ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} size="xl">
        {!isEditing && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Bulk Mode</span>
            <button type="button" onClick={() => { setBulkMode(!bulkMode); setBulkText(""); setBulkLines([]); }}
              className={`relative w-11 h-6 rounded-full transition-colors ${bulkMode ? "bg-blue-600" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bulkMode ? "translate-x-5" : ""}`} />
            </button>
            <span className="text-xs text-blue-600">{bulkMode ? "ON — paste \"booking_no #n\" lines below" : "OFF — single booking"}</span>
          </div>
        )}

        {createError && (
          <div className="mb-3 px-3 py-2 text-xs bg-red-50 border border-red-200 rounded-lg text-red-700">{createError}</div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {!bulkMode || isEditing ? (
            <>
              {/* Booking Info */}
              <Section title="Booking" icon="📋" defaultOpen={!isEditing}>
                <FormField label="วันที่จอง"><Input type="date" value={headerForm.booking_date} onChange={setHeader("booking_date")} required /></FormField>
                {!isEditing && (
                  <FormField label="Booking No." hint='พิมพ์ "BKK0001" หรือ "BKK0001 #2" เพื่อระบุ shipment เอง'>
                    <Input value={bookingInput} onChange={(e) => setBookingInput(e.target.value)} placeholder="BKK0001 หรือ BKK0001 #2" required />
                  </FormField>
                )}
                <FormField label="Job Type"><Select value={headerForm.job_type} onChange={setHeader("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
                <FormField label="Customer"><Select value={headerForm.customer_code} onChange={setHeader("customer_code")} options={customers.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} placeholder="เลือก Customer…" /></FormField>
                <div className="col-span-2"><FormField label="Vendor (default)"><Select value={headerForm.vendor_code} onChange={(e) => handleHeaderVendorChange(e.target.value)} options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" /></FormField></div>
              </Section>

              {editTarget?.mode !== "header" && (
                <>
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
                          onResult={(r) => setFormState((f) => {
                            const sizeMatch = r.container_size_code ? containers.find((c) => c.code === r.container_size_code) : undefined;
                            return {
                              ...f,
                              ...(r.container_size_code ? { container_size_code: r.container_size_code } : {}),
                              ...(sizeMatch ? { container_size: sizeMatch.size } : {}),
                              ...(r.tare_weight ? { tare_weight: r.tare_weight } : {}),
                              ...(r.container_no ? { container_no: r.container_no } : {}),
                              ...(r.seal_no ? { seal_no: r.seal_no } : {}),
                            };
                          })}
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
                      <div className="col-span-2"><FormField label="Vendor (ของ shipment นี้)"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder={`Default: ${headerForm.vendor_code || "—"}`} /></FormField></div>
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
              )}
            </>
          ) : (
            <>
              {/* Bulk create: shared fields */}
              <Section title="Shared Info (Booking, Customer, Vendor)" icon="📋" defaultOpen={true}>
                <FormField label="วันที่จอง"><Input type="date" value={headerForm.booking_date} onChange={setHeader("booking_date")} required /></FormField>
                <FormField label="Job Type"><Select value={headerForm.job_type} onChange={setHeader("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
                <FormField label="Customer"><Select value={headerForm.customer_code} onChange={setHeader("customer_code")} options={customers.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))} placeholder="เลือก Customer…" /></FormField>
                <div className="col-span-2"><FormField label="Vendor (ผู้ขนส่ง)"><Select value={headerForm.vendor_code} onChange={(e) => handleHeaderVendorChange(e.target.value)} options={vendors.map((v) => ({ value: v.code, label: `${v.code} — ${v.name}` }))} placeholder="เลือก Vendor…" /></FormField></div>
                <FormField label="ทะเบียนรถ"><Select value={form.truck_plate} onChange={set("truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
                <FormField label="คนขับ"><Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ…" : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
              </Section>

              {/* Bulk create: paste area */}
              <Section title="Booking Numbers (ต้องระบุ #N ทุกบรรทัด)" icon="📝" defaultOpen={true}>
                <div className="col-span-2 flex flex-col gap-2">
                  <textarea value={bulkText} onChange={(e) => handleBulkTextChange(e.target.value)}
                    placeholder={`วางทีละบรรทัด ต้องมี #N กำกับเสมอ เช่น:\nBKK0001 #1\nBKK0001 #2\nBKK0002 #1`}
                    rows={8} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y" />
                  {bulkLines.length > 0 && (
                    <div className="text-xs text-slate-500">
                      {bulkLines.length} line(s) — {bulkLines.filter((l) => l.parsed).length} valid, {bulkLines.filter((l) => !l.parsed).length} missing #N
                    </div>
                  )}
                  {bulkLines.some((l) => !l.parsed) && (
                    <div className="text-xs px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                      ทุกบรรทัดต้องระบุ #N เช่น &quot;BKK0001 #1&quot; — บรรทัดที่ขาด: {bulkLines.filter((l) => !l.parsed).map((l) => l.raw).join(", ")}
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)] hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving || (bulkMode && !isEditing && bulkLines.some((l) => !l.parsed))} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium">
              {saving ? "Saving…" : isEditing ? "Save" : bulkMode ? `Create ${bulkLines.length > 0 ? bulkLines.length : ""} Shipment${bulkLines.length !== 1 ? "s" : ""}` : "Create Booking"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Ambiguous-create confirmation ── */}
      <ConfirmDialog
        open={!!confirmCreate}
        title="Booking already exists"
        message={confirmCreate ? `"${confirmCreate.booking_no}" already has ${confirmCreate.existingShipmentCount} shipment(s). Create shipment #${confirmCreate.nextShipmentNo}?` : ""}
        onConfirm={handleConfirmCreate}
        onCancel={() => setConfirmCreate(null)}
        loading={saving}
      />

      {/* ── Process Modal ── */}
      <Modal open={processModalOpen} onClose={() => setProcessModalOpen(false)}
        title={`${STEP_MODAL_TITLES[processStep]} Process${editTarget?.mode === "shipment" ? ` - ${editTarget.booking.booking_no} #${editTarget.shipment.shipment_no}` : ""}`} size="lg">
        <form onSubmit={handleProcessSave} className="flex flex-col gap-4">
          <ProcessModalFields
            step={processStep}
            headerForm={headerForm}
            setHeader={setHeader}
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

      <ConfirmDialog open={!!deleteTarget} title="Delete Shipment"
        message={`Are you sure you want to delete shipment "${deleteTarget?.booking.booking_no} #${deleteTarget?.shipment.shipment_no}"?`}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />

      {/* ── Image Fullscreen Modal ── */}
      <ImageFullscreenModal
        open={imageModalOpen}
        eirImageUrl={imageModalEirUrl}
        containerImageUrl={imageModalContainerUrl}
        title={imageModalTitle}
        info={imageModalInfo}
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
