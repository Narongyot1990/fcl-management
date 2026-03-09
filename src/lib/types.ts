export interface Vendor {
  _id: string;
  code: string;
  name: string;
  truck_plate: string;
  driver_name: string;
  phone: string;
  created_at?: string;
}

export interface Container {
  _id: string;
  code: string;
  size: string;
  created_at?: string;
}

export interface Booking {
  _id: string;
  booking_no: string;
  // Part 1 – Shipper / Vendor
  shipper: string;
  truck_plate: string;
  driver_name: string;
  phone: string;
  // Part 2 – Container
  container_no: string;
  container_size: string;
  seal_no: string;
  tare_weight: string;
  // Part 3 – Booking details
  port_of_loading: string;
  port_of_discharge: string;
  vessel: string;
  voyage: string;
  // Part 4 – Condition
  condition: string;
  damage_notes: string;
  // Part 5 – Dates & signature
  date_time: string;
  gate_in_date: string;
  gate_out_date: string;
  remarks: string;
  created_at?: string;
}

export interface EIRRecord {
  _id: string;
  shipper: string;
  booking_no: string;
  container_no: string;
  container_size: string;
  seal_no: string;
  tare_weight: string;
  truck_plate: string;
  date_time: string;
  created_at?: string;
}

export type Collection = "vendors" | "containers" | "bookings" | "eir";

export interface ApiResponse<T> {
  count: number;
  records: T[];
}
