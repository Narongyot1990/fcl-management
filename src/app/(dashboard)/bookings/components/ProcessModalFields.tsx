"use client";
import { FormField, Input, Select } from "@/components/FormField";
import Toggle from "./Toggle";
import { type BookingHeaderForm, type ShipmentForm } from "../types/booking-form";
import type { Vendor } from "@/lib/types";
import { containerNoMessage } from "@/lib/containerValidation";
import { JOB_TYPE_OPTIONS } from "../utils/booking-utils";

interface ProcessModalProps {
  step: number;
  headerForm: BookingHeaderForm;
  setHeader: (k: keyof BookingHeaderForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  form: ShipmentForm;
  set: (k: keyof ShipmentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
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
  setFormField: (key: keyof ShipmentForm, value: unknown) => void;
}

export default function ProcessModalFields({
  step, headerForm, setHeader, form, set, vendors, customers, selectedVendor,
  truckPlateOptions, driverOptions, handleVendorChange, handleDriverChange, handleReturnDriverChange,
  sizeOptions, codeOptions, handleSizeChange, handleCodeChange, setFormField,
}: ProcessModalProps) {
  if (step === 0) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Booking Date"><Input type="date" value={headerForm.booking_date} onChange={setHeader("booking_date")} required /></FormField>
      <FormField label="Job Type"><Select value={headerForm.job_type} onChange={setHeader("job_type")} options={JOB_TYPE_OPTIONS} /></FormField>
      <FormField label="Customer"><Select value={headerForm.customer_code} onChange={setHeader("customer_code")} options={customers.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} placeholder="Select Customer..." /></FormField>
      <div className="sm:col-span-2"><FormField label="Vendor (Default)"><Select value={headerForm.vendor_code} onChange={setHeader("vendor_code")} options={vendors.map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }))} placeholder="Select Vendor..." /></FormField></div>
    </div>
  );

  if (step === 1) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2"><FormField label="Vendor (This Shipment)"><Select value={form.vendor_code} onChange={(e) => handleVendorChange(e.target.value)} options={vendors.map(v => ({ value: v.code, label: `${v.code} - ${v.name}` }))} placeholder="Select Vendor..." /></FormField></div>
      <FormField label="Truck Plate"><Select value={form.truck_plate} onChange={set("truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "Select Plate..." : "Select Vendor first"} disabled={!selectedVendor} /></FormField>
      <FormField label="Driver"><Select value={form.driver_name} onChange={(e) => handleDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "Select Driver..." : "Select Vendor first"} disabled={!selectedVendor} /></FormField>
      <FormField label="Phone Number"><Input value={form.driver_phone} onChange={set("driver_phone")} readOnly /></FormField>
    </div>
  );

  if (step === 2) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Est. Pickup (Date/Time)"><Input type="datetime-local" value={form.plan_pickup_date} onChange={set("plan_pickup_date")} /></FormField>
      <FormField label="ETA to Destination"><Input type="datetime-local" value={form.eta} onChange={set("eta")} /></FormField>
      <FormField label="Container No." hint={containerNoMessage(form.container_no) ?? (form.container_no.length === 11 ? "ISO 6346 valid" : undefined)} hintType={containerNoMessage(form.container_no) ? "error" : form.container_no.length === 11 ? "success" : "default"}><Input value={form.container_no} onChange={set("container_no")} placeholder="TCKU1234567" /></FormField>
      <FormField label="Seal No."><Input value={form.seal_no} onChange={set("seal_no")} /></FormField>
      <FormField label="Size"><Select value={form.container_size} onChange={(e) => handleSizeChange(e.target.value)} options={sizeOptions} placeholder="Select Size..." /></FormField>
      <FormField label="ISO Code"><Select value={form.container_size_code} onChange={(e) => handleCodeChange(e.target.value)} options={codeOptions} placeholder="Select Code..." /></FormField>
      <FormField label="Tare (kg)"><Input value={form.tare_weight} onChange={set("tare_weight")} /></FormField>
    </div>
  );

  if (step === 3) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Plan Loading"><Input type="date" value={form.plan_loading_date} onChange={set("plan_loading_date")} /></FormField>
      <div />
      <FormField label="Pending Time"><Input type="datetime-local" value={form.pending_at} onChange={set("pending_at")} /></FormField>
      <FormField label="Loading Time"><Input type="datetime-local" value={form.loading_at} onChange={set("loading_at")} /></FormField>
      <FormField label="Loaded Time"><Input type="datetime-local" value={form.loaded_at} onChange={set("loaded_at")} /></FormField>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <FormField label="Plan Return"><Input type="date" value={form.plan_return_date} onChange={set("plan_return_date")} /></FormField>
      <div />
      <FormField label="Return Truck Plate"><Select value={form.return_truck_plate} onChange={set("return_truck_plate")} options={truckPlateOptions} placeholder={selectedVendor ? "Select Plate..." : "Select Vendor first"} disabled={!selectedVendor} /></FormField>
      <FormField label="Return Driver"><Select value={form.return_driver_name} onChange={(e) => handleReturnDriverChange(e.target.value)} options={driverOptions} placeholder={selectedVendor ? "Select Driver..." : "Select Vendor first"} disabled={!selectedVendor} /></FormField>
      <FormField label="Return Driver Phone"><Input value={form.return_driver_phone} onChange={set("return_driver_phone")} readOnly /></FormField>
      <FormField label="Actual Return Date"><Input type="datetime-local" value={form.return_date} onChange={set("return_date")} /></FormField>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <Toggle checked={form.gcl_received} onChange={(v) => setFormField("gcl_received", v)} label="GCL Received" />
        <Toggle checked={form.return_completed} onChange={(v) => setFormField("return_completed", v)} label="Return Completed" />
      </div>
    </div>
  );
}
