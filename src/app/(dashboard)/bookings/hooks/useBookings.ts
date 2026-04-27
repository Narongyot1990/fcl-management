"use client";
import { useState, useCallback } from "react";
import type { Booking, Vendor, Container, Customer } from "@/lib/types";
import { listRecords, createRecord, updateRecord, deleteRecord } from "@/lib/api";
import { EMPTY_BOOKING_FORM, type BookingForm } from "../types/booking-form";
import { toProxyUrl } from "../utils/booking-utils";

export function useBookings() {
  const [records, setRecords] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (search = "", dateFrom = "", dateTo = "", showNoContainer = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await listRecords<Booking>("bookings", search ? { booking_no: search } : {});
      let data = [...res.records];
      data.sort((a, b) => {
        const dateA = a.booking_date ? new Date(a.booking_date).getTime() : 0;
        const dateB = b.booking_date ? new Date(b.booking_date).getTime() : 0;
        return dateB - dateA;
      });
      if (dateFrom || dateTo) {
        const fromStr = dateFrom ? new Date(dateFrom).toISOString().split("T")[0] : null;
        const toStr = dateTo ? new Date(dateTo + "T23:59:59").toISOString().split("T")[0] : null;
        data = data.filter((b) => {
          if (!b.booking_date) return false;
          const d = b.booking_date.split("T")[0];
          if (fromStr && d < fromStr) return false;
          if (toStr && d > toStr) return false;
          return true;
        });
      }
      if (showNoContainer) data = data.filter((b) => !b.container_no);
      setRecords(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (form: BookingForm, editing: Booking | null) => {
    if (editing) {
      await updateRecord("bookings", editing._id, form as unknown as Record<string, unknown>);
    } else {
      await createRecord<Booking>("bookings", form as unknown as Record<string, unknown>);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteRecord("bookings", id);
  }, []);

  return { records, loading, error, load, save, remove };
}

export function useBookingsDropdowns() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const load = useCallback(async () => {
    try {
      const [v, c, cu] = await Promise.all([
        listRecords<Vendor>("vendors"),
        listRecords<Container>("containers"),
        listRecords<Customer>("customers"),
      ]);
      setVendors(v.records);
      setContainers(c.records);
      setCustomers(cu.records);
    } catch { /* ignore */ }
  }, []);

  return { vendors, containers, customers, load };
}

export function bookingToForm(b: Booking): BookingForm {
  return {
    booking_date: b.booking_date ?? "",
    booking_no: b.booking_no ?? "",
    job_type: b.job_type ?? "Export",
    customer_code: b.customer_code ?? "",
    vendor_code: b.vendor_code ?? "",
    truck_plate: b.truck_plate ?? "",
    driver_name: b.driver_name ?? "",
    driver_phone: b.driver_phone ?? "",
    plan_pickup_date: b.plan_pickup_date ?? "",
    eta: b.eta ?? "",
    container_no: b.container_no ?? "",
    container_size: b.container_size ?? "",
    container_size_code: b.container_size_code ?? "",
    tare_weight: b.tare_weight ?? "",
    seal_no: b.seal_no ?? "",
    eir_image_url: toProxyUrl(b.eir_image_url),
    container_image_url: toProxyUrl(b.container_image_url),
    loading_status: b.loading_status ?? "pending",
    plan_loading_date: b.plan_loading_date ?? "",
    pending_at: b.pending_at ?? "",
    loading_at: b.loading_at ?? "",
    loaded_at: b.loaded_at ?? "",
    plan_return_date: b.plan_return_date ?? "",
    return_truck_plate: b.return_truck_plate ?? "",
    return_driver_name: b.return_driver_name ?? "",
    return_driver_phone: b.return_driver_phone ?? "",
    gcl_received: b.gcl_received ?? false,
    return_date: b.return_date ?? "",
    return_completed: b.return_completed ?? false,
  };
}

export { EMPTY_BOOKING_FORM, toProxyUrl };