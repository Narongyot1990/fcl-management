import type { Booking, Shipment, JobType, LoadingStatus, Driver } from "@/lib/types";

/** Shared booking-header fields, editable from the create/edit form. */
export interface BookingHeaderForm {
  booking_date: string;
  job_type: JobType;
  customer_code: string;
  vendor_code: string;
}

/** Everything specific to one container/shipment. */
export interface ShipmentForm {
  vendor_code: string;
  truck_plate: string;
  driver_name: string;
  driver_phone: string;
  plan_pickup_date: string;
  eta: string;
  container_no: string;
  container_size: string;
  container_size_code: string;
  tare_weight: string;
  seal_no: string;
  eir_image_url: string;
  container_image_url: string;
  loading_status: LoadingStatus;
  plan_loading_date: string;
  pending_at: string;
  loading_at: string;
  loaded_at: string;
  plan_return_date: string;
  return_truck_plate: string;
  return_driver_name: string;
  return_driver_phone: string;
  gcl_received: boolean;
  return_date: string;
  return_completed: boolean;
}

export const EMPTY_HEADER_FORM: BookingHeaderForm = {
  booking_date: "",
  job_type: "Export",
  customer_code: "",
  vendor_code: "",
};

export const EMPTY_SHIPMENT_FORM: ShipmentForm = {
  vendor_code: "",
  truck_plate: "",
  driver_name: "",
  driver_phone: "",
  plan_pickup_date: "",
  eta: "",
  container_no: "",
  container_size: "",
  container_size_code: "",
  tare_weight: "",
  seal_no: "",
  eir_image_url: "",
  container_image_url: "",
  loading_status: "pending",
  plan_loading_date: "",
  pending_at: "",
  loading_at: "",
  loaded_at: "",
  plan_return_date: "",
  return_truck_plate: "",
  return_driver_name: "",
  return_driver_phone: "",
  gcl_received: false,
  return_date: "",
  return_completed: false,
};

export type { Booking, Shipment, Driver };
