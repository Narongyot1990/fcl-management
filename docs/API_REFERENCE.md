# API Reference

This document provides complete, up-to-date specifications for all API endpoints in the Next.js application, along with reference notes for the secondary/legacy Python API.

---

## Authentication & Authorization Headers

All generic collection endpoints receive authentication and context headers automatically populated by `src/lib/api.ts` from `sessionStorage.getItem("itl_user")`:

| Header Name | Type | Description |
|---|---|---|
| `x-itl-role` | `string` | Logged-in user's role: `"admin"`, `"leader"`, or `"driver"`. |
| `x-itl-branch` | `string` | Logged-in user's branch (e.g. `"Bangkok"`). |
| `X-API-Key` | `string` | Secret API key (matched against `OCR_API_SECRET` for machine endpoints). |

### Branch Scoping Rules
- If `x-itl-role` is `"admin"`, the request has global visibility across all branches.
- If `x-itl-role` is `"leader"` or `"driver"` and `x-itl-branch` is present, `GET` queries are automatically scoped with `{ branch }`, and `POST` mutations enforce `doc.branch = branch`.

---

## Next.js API Endpoints

### 1. Generic Collection Management

Base URL: `/api/collections/[collection]`

Supported `[collection]` values:
`"vendors"` | `"containers"` | `"bookings"` | `"customers"` | `"users"`

---

#### `GET /api/collections/[collection]`
Retrieve records from the specified collection with support for filtering, pagination, sorting, and branch scoping.

**Headers:**
- `x-itl-role`: User role
- `x-itl-branch`: User branch

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `page` | `number` | Page number for pagination (1-indexed). |
| `limit` | `number` | Maximum items per page (capped at 200, default 50). |
| `date_from` | `string` | *(Bookings only)* Start date filter (`YYYY-MM-DD`). |
| `date_to` | `string` | *(Bookings only)* End date filter (`YYYY-MM-DD`). |
| `no_container` | `boolean` | *(Bookings only)* Filter bookings where `container_no` is missing or empty. |
| `booking_nos` | `string` | *(Bookings only)* Comma-separated list of booking numbers for batch lookup. |
| `workflow` | `string` | *(Bookings only)* Operational workflow filter: `no_truck`, `no_container`, `loading_pending`, `loaded`, `return_pending`. |
| `[fieldName]` | `string` | Any schema field name to perform a case-insensitive regex search. |


**Success Response (`200 OK`):**
```json
{
  "count": 10,
  "records": [
    {
      "_id": "65e01234567890abcdef1234",
      "booking_no": "BK-2026-001",
      "booking_date": "2026-04-10",
      "job_type": "Export",
      "customer_code": "HRF",
      "vendor_code": "FLS",
      "truck_plate": "70-1234",
      "driver_name": "สมชาย มีรักษ์",
      "driver_phone": "081-234-5678",
      "container_no": "MSCU1234567",
      "container_size": "40'HC",
      "container_size_code": "45G1",
      "tare_weight": "3800",
      "seal_no": "SL-998811",
      "loading_status": "loaded",
      "return_completed": false,
      "created_at": "2026-04-10T08:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 120,
  "totalPages": 3
}
```

---

#### `POST /api/collections/[collection]`
Create a new record in the specified collection.

**Deduplication Keys Enforced:**
- `vendors`: `code`
- `bookings`: `booking_no`
- `customers`: `code`
- `users`: `username`

**Request Body Example:**
```json
{
  "booking_no": "BK-2026-002",
  "booking_date": "2026-04-11",
  "customer_code": "HRF",
  "vendor_code": "FLS",
  "job_type": "Export"
}
```

**Responses:**
- `200 OK`: `{"created": true, "record": { ...doc, "_id": "..." }}`
- `409 Conflict`: `{"error": "Record already exists (duplicate)"}`
- `500 / 503`: `{"error": "Database error details"}`

---

#### `PUT /api/collections/[collection]/[id]`
Update an existing record by its MongoDB `ObjectId`.

**Request Body:** JSON payload containing updated fields (system strips `_id` and `created_at` automatically).

**Responses:**
- `200 OK`: `{"updated": true}`
- `400 Bad Request`: `{"error": "Invalid ID"}`
- `404 Not Found`: `{"error": "Record not found"}`

---

#### `DELETE /api/collections/[collection]/[id]`
Delete a record by its MongoDB `ObjectId`.

**Responses:**
- `200 OK`: `{"deleted": true}`
- `400 Bad Request`: `{"error": "Invalid ID"}`
- `404 Not Found`: `{"error": "Record not found"}`

---

### 2. Booking Container Patch Endpoint

#### `POST /api/bookings/container`
Directly updates container-specific fields on a booking. Used by external tools, OCR integrations, or LINE bots.

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: <OCR_API_SECRET>`

**Request Body:**
```json
{
  "booking_no": "BK-2026-001",
  "container_no": "MSCU1234567",
  "seal_no": "SL-123456",
  "container_size": "40'HC",
  "container_size_code": "45G1",
  "tare_weight": "3850"
}
```

**Validation Rules:**
- `container_no` is validated against **ISO 6346** (4 letters + 7 digits with check-digit validation).

**Success Response (`200 OK`):**
```json
{
  "booking": {
    "booking_no": "BK-2026-001",
    "booking_date": "2026-04-10",
    "job_type": "Export",
    "customer_code": "HRF",
    "vendor_code": "FLS"
  },
  "pickup_info": {
    "truck_plate": "70-1234",
    "driver_name": "สมชาย มีรักษ์",
    "driver_phone": "081-234-5678",
    "plan_pickup_date": "2026-04-10"
  },
  "container_info": {
    "container_no": "MSCU1234567",
    "container_size": "40'HC",
    "container_size_code": "45G1",
    "tare_weight": "3850",
    "seal_no": "SL-123456"
  },
  "loading_info": {
    "loading_status": "loaded"
  },
  "return_info": {
    "return_completed": false
  }
}
```

---

### 3. Image Upload & Proxy

#### `POST /api/upload-image`
Uploads an image file to Vercel Blob storage (`itl-files/` prefix) with private access.

**Request:** `multipart/form-data`
- `file`: Image binary (`image/jpeg`, `image/png`, etc.)
- `type`: Category identifier (e.g. `"eir"`, `"container"`)

**Success Response (`200 OK`):**
```json
{
  "url": "/api/image/eir_1712740000000.jpg",
  "blobUrl": "https://blob.vercel-storage.com/itl-files/eir_1712740000000.jpg",
  "filename": "eir_1712740000000.jpg"
}
```

---

#### `GET /api/image/[filename]`
Streams private Vercel Blob images securely back to the frontend client.

**Response:** Binary image stream with appropriate `Content-Type` and `Cache-Control` headers.

---

### 4. Gemini OCR Extraction

#### `POST /api/gemini-ocr`
Sends container door and/or EIR ticket images to Google Gemini for field extraction.

**Request Body:**
```json
{
  "containerImage": {
    "base64": "<base64_encoded_image_data>",
    "contentType": "image/jpeg"
  },
  "eirImage": {
    "base64": "<base64_encoded_image_data>",
    "contentType": "image/jpeg"
  }
}
```

**Success Response (`200 OK`):**
```json
{
  "container_no": "MSCU1234567",
  "container_size_code": "45G1",
  "tare_weight": "3850",
  "seal_no": "SL-998811"
}
```

**Server Validation Rules:**
- `container_no`: 4 letters + 7 digits (ISO 6346)
- `container_size_code`: `^\d{2}[A-Z0-9]\d$`
- `tare_weight`: 3 to 5 digits (`^\d{3,5}$`)
- `seal_no`: Stripped of invalid non-alphanumeric noise

---

### 5. GPS Telematics (DTC GPS)

#### `POST /api/gps`
Fetch realtime vehicle telemetry by `gps_id`.

**Request Body:**
```json
{
  "gps_id": "DTC_DEVICE_12345"
}
```

**Success Response (`200 OK`):**
```json
{
  "lat": 13.7563,
  "lon": 100.5018,
  "speed": 62,
  "time": "2026-04-10 14:32:00",
  "location": "Bang Sao Thong, Samut Prakan"
}
```

---

#### `POST /api/gps/history`
Fetch DTC Station-to-Station report for a specific vehicle and date.

**Request Body:**
```json
{
  "gps_id": "DTC_DEVICE_12345",
  "date": "2026-04-10"
}
```

**Success Response (`200 OK`):**
```json
{
  "stations": [
    {
      "station_f": "Depot A",
      "station_n": "Factory B",
      "start_time": "2026-04-10 08:00:00",
      "end_time": "2026-04-10 10:15:00",
      "distance": "85.4"
    }
  ],
  "date": "2026-04-10",
  "gps_id": "DTC_DEVICE_12345",
  "truck_name": "70-1234",
  "count": 1
}
```

---

#### `POST /api/gps/history-raw`
Fetch raw time-series GPS location logs for route playback.

**Request Body:**
```json
{
  "gps_id": "DTC_DEVICE_12345",
  "date": "2026-04-10"
}
```

---

## Secondary / Legacy Python API (`api/index.py`)

*Note: Active Next.js dashboard uses Next.js route handlers above. The Python API is preserved for standalone Vercel Python runtime workflows.*

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/records` | `GET` | Query records with legacy prompt filter |
| `/api/records/{id}` | `PUT` | Update record by ObjectId |
| `/api/bookings/container` | `POST` | Update container info (Python path) |
| `/callback` | `POST` | LINE Messaging API Webhook receiver |

