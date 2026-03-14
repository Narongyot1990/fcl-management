// ── Customer ────────────────────────────────────────────────────────────────
export interface Customer {
  _id: string;
  code: string;   // รหัสลูกค้า e.g. "CUS001"
  name: string;   // ชื่อลูกค้า
  branch: string; // สาขา
  created_at?: string;
}

// ── Roles & Auth ─────────────────────────────────────────────────────────────
export type UserRole = "admin" | "leader" | "driver";

export interface User {
  _id: string;
  username: string;
  password?: string; // only for server-side or mock login
  role: UserRole;
  branch?: string; // admin has no branch (sees all), leader/driver must have branch
  name: string;
}

// ── Job type ─────────────────────────────────────────────────────────────────
export type JobType = "Import" | "Export";

// ── Driver sub-document (embedded in Vendor) ────────────────────────────────
export interface Driver {
  _id?: string;
  name: string;
  phone: string;
  avatar_url?: string;
  score?: number;      // 0-100
  rating?: number;     // 0-5
  jobs_count?: number;
  status?: "active" | "on_job" | "offline";
  joined_at?: string;
  id_card_no?: string;
  license_no?: string;
  branch?: string; // สาขาที่สังกัด (Optional in nested views)
}

// ── Vendor ───────────────────────────────────────────────────────────────────
export interface Vendor {
  _id: string;
  code: string;           // รหัสย่อ e.g. "ABC"
  name: string;           // ชื่อเต็ม (บริษัท)
  truck_plates?: string[]; // ทะเบียนรถ (legacy)
  trucks?: { plate: string; gps_id?: string }[]; // ทะเบียนรถ + gps_id (new)
  drivers: Driver[];      // คนขับ (หลายคน) แต่ละคนมี name + phone
  branch: string;         // สาขา
  created_at?: string;
}

// ── Container type ───────────────────────────────────────────────────────────
export interface Container {
  _id: string;
  code: string;           // ISO type code e.g. "45G1", "22G1"
  size: string;           // ขนาด e.g. "40HC", "20", "40"
  branch: string;         // สาขาที่ตู้สังกัด (ถ้ามี)
  created_at?: string;
}

// ── Loading status enum ──────────────────────────────────────────────────────
export type LoadingStatus = "pending" | "loading" | "loaded";

// ── Booking — 5-part lifecycle ───────────────────────────────────────────────
export interface Booking {
  _id: string;

  // Part 1 — Draft (ข้อมูลจอง)
  booking_date: string;
  booking_no: string;
  job_type: JobType;      // Import / Export
  customer_code: string;  // FK → Customer.code
  vendor_code: string;    // FK → Vendor.code

  // Part 2 — Pickup Truck Assignment (หลังจองรถ — ไป pickup ตู้)
  truck_plate: string;    // dropdown จาก vendor
  driver_name: string;    // dropdown จาก vendor.drivers
  driver_phone: string;   // auto-fill จาก vendor.drivers match
  plan_pickup_date: string;  // วันที่แผน pickup

  // Part 3 — Depot / Container (พขร. ไปรับตู้)
  container_no: string;
  container_size: string;     // e.g. "40HC" — dropdown จาก containers
  container_size_code: string; // e.g. "45G1" — dropdown จาก containers
  tare_weight: string;
  seal_no: string;
  eir_image_url: string;      // URL รูปภาพ EIR
  container_image_url: string; // URL รูปภาพ Container

  // Part 4 — Loading status
  loading_status: LoadingStatus;
  plan_loading_date: string;  // วันที่แผน loading
  pending_at: string;
  loading_at: string;
  loaded_at: string;

  // Part 5 — Return (คืนตู้ท่า)
  plan_return_date: string;    // วันที่แผน return
  return_truck_plate: string;  // ทะเบียนรถคืนตู้
  return_driver_name: string;  // คนขับคืนตู้
  return_driver_phone: string; // เบอร์คนขับคืนตู้
  gcl_received: boolean;  // Good Control List — ได้หรือยัง
  return_date: string;
  return_completed: boolean;
  branch: string;         // สาขาที่เปิด Booking

  created_at?: string;
}

// ── Collections ──────────────────────────────────────────────────────────────
export type Collection = "vendors" | "containers" | "bookings" | "customers" | "users";

export interface ApiResponse<T> {
  count: number;
  records: T[];
}
