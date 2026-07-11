import type { Booking, JobType, LoadingStatus, Driver } from "@/lib/types";

export interface BookingForm {
  booking_date: string;
  booking_no: string;
  job_type: JobType;
  customer_code: string;
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

export const EMPTY_BOOKING_FORM: BookingForm = {
  booking_date: "",
  booking_no: "",
  job_type: "Export",
  customer_code: "",
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

export type { Booking, Driver };