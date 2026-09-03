# Booking Operations Workflow

Step-by-step workflow guide for booking operations in FCL Management:

## 1. Booking Creation
- Navigate to `/bookings`
- Click "New Booking" (or press shortcut)
- Fill in:
  - `booking_no` (must be unique)
  - `booking_date` (default today)
  - `job_type` ("Import" or "Export")
  - `customer_code` (defaults to "HRF")
  - `vendor_code` (defaults to "FLS")

## 2. Truck & Driver Assignment
- Select assigned vendor from dropdown
- Select available truck plate from `vendor.trucks[]`
- Select driver from `vendor.drivers[]` (auto-fills phone)
- Set planned pickup date and ETA

## 3. Container & OCR Extraction
- Upload container door photo and EIR ticket
- Click "OCR Scan" (triggers Gemini vision model)
- Confirm extracted fields:
  - `container_no` (ISO 6346 checksum verified)
  - `container_size_code`
  - `tare_weight`
  - `seal_no`

## 4. Loading State Tracking
- Transition state: `pending` -> `loading` -> `loaded`
- Timestamps automatically track at `pending_at`, `loading_at`, and `loaded_at`

## 5. Return & Completion
- Assign return truck & driver (if different from pickup)
- Mark `return_date`, `gcl_received` (boolean), and `return_completed` (boolean)
