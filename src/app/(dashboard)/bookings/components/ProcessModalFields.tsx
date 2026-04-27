"use client";
import { FormField, Input, Select } from "@/components/FormField";
import Section from "./Section";
import Toggle from "./Toggle";
import { type BookingForm } from "../types/booking-form";
import type { Vendor } from "@/lib/types";
import { containerNoMessage } from "@/lib/containerValidation";
import { JOB_TYPE_OPTIONS } from "../utils/booking-utils";

interface ProcessModalProps {
  step: number;
  form: BookingForm;
  set: (k: keyof BookingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  vendors: Vendor[];
  customers: { code: string; name: string }[];
  selectedVendor: Vendor | undefined;
  truckPlateOptions: { value: string; label: string }[];
  driverOptions: { value: string; label: string }[];
  handleVendorChange: (code: string) => void;
  handleDriverChange: (name: string) => void;
  handleReturnDriverChange: (name: string) => void;
  sizeOptions: { value: string; label: string }[];
  codeOptions: { value: string; label: string }[];
  handleSizeChange: (size: string) => void;
  handleCodeChange: (code: string) => void;
  setFormField: (key: keyof BookingForm, value: unknown) => void;
}

export default function ProcessModalFields({
  step, form, set, vendors, customers, selectedVendor,
  truckPlateOptions, driverOptions, handleVendorChange, handleDriverChange, handleReturnDriverChange,
  sizeOptions, codeOptions, handleSizeChange, handleCodeChange, setFormField,
}: ProcessModalProps) {
  if (step === 0) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="วันที่จอง"><Input type="date" value={form.booking_date} onChange={set("booking_date")} required /></FormField>
      <FormField label="Booking No."><Input value={form.booking_no} onChange={set("booking_no")} required /></FormField>
      <FormField label="Job Type"><Select value={form.job_type} onChange={set("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
      <FormField label="Customer"><Select value={form.customer_code} onChange={set("customer_code")} options={customers.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} placeholder="เลือก Customer..." /></FormField>
      <div className="sm:col-span-2"><FormField label="Vendor"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }))} placeholder="เลือก Vendor..." /></FormField></div>
    </div>
  );

  if (step === 1) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2"><FormField label="Vendor"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }))} placeholder="เลือก Vendor..." /></FormField></div>
      <FormField label="ทะเบียนรถ"><Select value={form.truck_plate} onChange={set("truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน..." : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
      <FormField label="คนขับ"><Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ..." : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
      <FormField label="เบอร์โทร"><Input value={form.driver_phone} onChange={set("driver_phone")} readOnly /></FormField>
    </div>
  );

  if (step === 2) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Est. Pickup (วัน-เวลา)"><Input type="datetime-local" value={form.plan_pickup_date} onChange={set("plan_pickup_date")} /></FormField>
      <FormField label="ETA ถึงปลายทาง"><Input type="datetime-local" value={form.eta} onChange={set("eta")} /></FormField>
      <FormField label="Container No." hint={containerNoMessage(form.container_no) ?? (form.container_no.length === 11 ? "ISO 6346 valid" : undefined)} hintType={containerNoMessage(form.container_no) ? "error" : form.container_no.length === 11 ? "success" : "default"}><Input value={form.container_no} onChange={set("container_no")} placeholder="TCKU1234567" /></FormField>
      <FormField label="Seal No."><Input value={form.seal_no} onChange={set("seal_no")} /></FormField>
      <FormField label="Size"><Select value={form.container_size} onChange={(e) => handleSizeChange(e.target.value)} options={sizeOptions} placeholder="เลือก Size..." /></FormField>
      <FormField label="ISO Code"><Select value={form.container_size_code} onChange={(e) => handleCodeChange(e.target.value)} options={codeOptions} placeholder="เลือก Code..." /></FormField>
      <FormField label="Tare (kg)"><Input value={form.tare_weight} onChange={set("tare_weight")} /></FormField>
    </div>
  );

  if (step === 3) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Plan Loading"><Input type="date" value={form.plan_loading_date} onChange={set("plan_loading_date")} /></FormField>
      <div />
      <FormField label="Pending เวลา"><Input type="datetime-local" value={form.pending_at} onChange={set("pending_at")} /></FormField>
      <FormField label="Loading เวลา"><Input type="datetime-local" value={form.loading_at} onChange={set("loading_at")} /></FormField>
      <FormField label="Loaded เวลา"><Input type="datetime-local" value={form.loaded_at} onChange={set("loaded_at")} /></FormField>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Plan Return"><Input type="date" value={form.plan_return_date} onChange={set("plan_return_date")} /></FormField>
      <div />
      <FormField label="ทะเบียนรถคืน"><Select value={form.return_truck_plate} onChange={set("return_truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "เลือกทะเบียน..." : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
      <FormField label="คนขับรถคืน"><Select value={form.return_driver_name} onChange={(e) => handleReturnDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "เลือกคนขับ..." : "เลือก Vendor ก่อน"} disabled={!selectedVendor} /></FormField>
      <FormField label="เบอร์โทรรถคืน"><Input value={form.return_driver_phone} onChange={set("return_driver_phone")} readOnly /></FormField>
      <FormField label="คืนตู้จริง"><Input type="datetime-local" value={form.return_date} onChange={set("return_date")} /></FormField>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <Toggle checked={form.gcl_received} onChange={(v) => setFormField("gcl_received", v)} label="ได้รับ GCL แล้ว" />
        <Toggle checked={form.return_completed} onChange={(v) => setFormField("return_completed", v)} label="คืนตู้เรียบร้อย" />
      </div>
    </div>
  );
}
