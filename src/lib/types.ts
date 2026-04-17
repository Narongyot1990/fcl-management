export interface Customer {
  _id: string;
  code: string;
  name: string;
  created_at?: string;
}

export interface User {
  _id: string;
  username: string;
  password?: string;
  name: string;
  created_at?: string;
}

export type JobType = "Import" | "Export";

export interface Driver {
  _id?: string;
  name: string;
  phone: string;
  avatar_url?: string;
  score?: number;
  rating?: number;
  jobs_count?: number;
  status?: "active" | "on_job" | "offline";
  joined_at?: string;
  id_card_no?: string;
  license_no?: string;
}

export interface Vendor {
  _id: string;
  code: string;
  name: string;
  truck_plates?: string[];
  trucks?: { plate: string; gps_id?: string }[];
  drivers: Driver[];
  created_at?: string;
}

export interface Container {
  _id: string;
  code: string;
  size: string;
  created_at?: string;
}

export type LoadingStatus = "pending" | "loading" | "loaded";

export interface Booking {
  _id: string;
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
  created_at?: string;
}

export type Collection = "vendors" | "containers" | "bookings" | "customers" | "users";

export interface ApiResponse<T> {
  count: number;
  records: T[];
}
