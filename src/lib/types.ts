// ── Customer ────────────────────────────────────────────────────────────────
export interface Customer {
  _id: string;
  code: string;   // รหัสลูกค้า e.g. "CUS001"
  name: string;   // ชื่อลูกค้า
  created_at?: string;
}

// ── Job type ─────────────────────────────────────────────────────────────────
export type JobType = "Import" | "Export";

// ── Driver sub-document (embedded in Vendor) ────────────────────────────────
export interface Driver {
  name: string;
  phone: string;
}

// ── Vendor ───────────────────────────────────────────────────────────────────
export interface Vendor {
  _id: string;
  code: string;           // รหัสย่อ e.g. "ABC"
  name: string;           // ชื่อเต็ม (บริษัท)
  truck_plates: string[]; // ทะเบียนรถ (หลายคัน)
  drivers: Driver[];      // คนขับ (หลายคน) แต่ละคนมี name + phone
  created_at?: string;
}

// ── Container type ───────────────────────────────────────────────────────────
export interface Container {
  _id: string;
  code: string;           // ISO type code e.g. "45G1", "22G1"
  size: string;           // ขนาด e.g. "40HC", "20", "40"
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

  created_at?: string;
}

// ── Collections ──────────────────────────────────────────────────────────────
export type Collection = "vendors" | "containers" | "bookings" | "customers";

export interface ApiResponse<T> {
  count: number;
  records: T[];
}
