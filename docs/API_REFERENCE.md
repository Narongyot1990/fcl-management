# API Reference

This document summarizes the active in-repo API surface that is most relevant to the current dashboard implementation.

## Authentication Reality

There are two auth patterns in the codebase:

- `X-API-Key` using `OCR_API_SECRET`
- client session headers:
  - `x-itl-role`
  - `x-itl-branch`

Important:

- Generic collection routes currently bypass real auth because `checkAuth()` returns `true`
- Do not assume all endpoints are protected

## Active Next.js Routes

### `GET /api/collections/[collection]`

Purpose:

- List records from an allowed collection

Allowed collections:

- `vendors`
- `containers`
- `bookings`
- `customers`
- `users`

Behavior:

- Query params become case-insensitive regex filters
- If role is not `admin`, branch filtering can be applied from headers
- Response shape:

```json
{
  "count": 12,
  "records": []
}
```

### `POST /api/collections/[collection]`

Purpose:

- Create a record in an allowed collection

Behavior:

- Performs dedup check using keys from `src/lib/mongodb.ts`
- Adds `created_at`
- Can force `branch` from request headers for non-admin users

Success response:

```json
{
  "created": true,
  "record": {}
}
```

### `PUT /api/collections/[collection]/[id]`

Purpose:

- Patch a record by MongoDB ObjectId

Behavior:

- Removes `_id` and `created_at` from incoming payload before update

Success response:

```json
{
  "updated": true
}
```

### `DELETE /api/collections/[collection]/[id]`

Purpose:

- Delete a record by MongoDB ObjectId

Success response:

```json
{
  "deleted": true
}
```

## Booking Container Patch

### `POST /api/bookings/container`

Purpose:

- Update container-related fields on an existing booking

Expected headers:

- `X-API-Key: <OCR_API_SECRET>`

Required body fields:

```json
{
  "booking_no": "BK-2026-001",
  "container_no": "MSCU1234567"
}
```

Optional fields:

- `seal_no`
- `container_size`
- `container_size_code`
- `tare_weight`

Behavior:

- Validates `container_no` against ISO 6346
- Finds booking by `booking_no` case-insensitively
- Updates only container-related fields
- Returns a grouped response containing:
  - `booking`
  - `pickup_info`
  - `container_info`
  - `loading_info`
  - `return_info`

Common error cases:

- `400` invalid JSON or missing required fields
- `401` missing or invalid API key
- `404` booking not found
- `422` invalid container number

## Upload And Image Access

### `POST /api/upload-image`

Purpose:

- Upload an image to private Vercel Blob storage

Expected multipart fields:

- `file`
- `type`

Success response:

```json
{
  "url": "/api/image/eir_123456.jpg",
  "blobUrl": "https://...",
  "filename": "eir_123456.jpg"
}
```

### `GET /api/image/[filename]`

Purpose:

- Proxy a private Blob file back to the client

Behavior:

- Searches for the file under the `itl-files/` prefix
- Uses Blob SDK private access to stream the content

## OCR

### `POST /api/gemini-ocr`

Purpose:

- Extract structured booking/container fields from two images

Expected JSON body:

```json
{
  "containerImage": {
    "base64": "...",
    "contentType": "image/jpeg"
  },
  "eirImage": {
    "base64": "...",
    "contentType": "image/jpeg"
  }
}
```

Returned fields:

- `container_size_code`
- `tare_weight`
- `container_no`
- `seal_no`

Validation rules:

- `container_size_code`: `2 digits + 1 letter + 1 digit`
- `container_no`: `4 letters + 7 digits`
- `tare_weight`: `3-5 digits`

## GPS

### `POST /api/gps`

Purpose:

- Fetch current coordinates for a truck GPS unit

Expected body:

```json
{
  "gps_id": "DEVICE_ID"
}
```

Success response:

```json
{
  "lat": 13.123,
  "lon": 100.123,
  "speed": 0,
  "time": "2026-04-10 10:30:00",
  "location": "Somewhere"
}
```

Related routes exist:

- `GET /api/gps/history`
- `GET /api/gps/history-raw`

Inspect those route files before changing historical GPS behavior.

## LINE

### `POST /api/line/webhook`

Purpose:

- Receive LINE webhook calls

Current behavior:

- Logs headers and body
- Returns success payload
- Does not currently behave like a fully active bot flow

### `GET /api/line/webhook`

Purpose:

- Simple route-health response for testing

## Legacy Python API

There is also a Python API in `api/index.py` that overlaps with some of the routes above:

- generic CRUD
- booking container patch
- LINE webhook

If a task references Vercel Python runtime or FastAPI specifically, inspect that file before making changes.
