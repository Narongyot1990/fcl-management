# Integrations Guide

This guide details all third-party services and integrations connected to the ITL FCL Management system.

---

## 1. MongoDB Atlas

Primary persistence database for all master data and operational bookings.

### Configuration
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
MONGODB_DB=eir_scanner
```

### Key Implementation Details
- **Connection pooling**: Managed via `src/lib/mongodb.ts` (cached globally in development to prevent hot-reload connection leaks).
- **Auto-indexing**: `bookings` collection automatically establishes indices for `booking_date`, `created_at`, `container_no`, and unique `booking_no`.
- **Allowed Collections**: Whitelisted in `ALLOWED` (`vendors`, `containers`, `bookings`, `customers`, `users`).

---

## 2. Vercel Blob Storage

Stores container door and EIR ticket images securely.

### Configuration
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Image Pipeline
1. Uploads hit `src/app/api/upload-image/route.ts`.
2. Images are stored with `access: 'private'` under prefix `itl-files/`.
3. Client receives and stores proxy URL `/api/image/[filename]`.
4. Serving endpoint `src/app/api/image/[filename]/route.ts` streams image binary directly, preventing exposure of internal storage endpoints.

---

## 3. Google Gemini AI (OCR Engine)

Performs multi-image OCR extraction from container door photos and paper EIR slips.

### Configuration
```env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
```

### Extraction Workflow
- **Route**: `src/app/api/gemini-ocr/route.ts`
- **Model Default**: `gemini-2.5-flash` (or overridden by `GEMINI_MODEL`).
- **Prompt Strategy**: Structured JSON output prompt instructing the vision model to locate:
  - `container_no` (4 letters + 7 digits)
  - `container_size_code` (e.g. 45G1, 22G1)
  - `tare_weight` (numeric kilograms)
  - `seal_no` (alphanumeric security seal ID)
- **Validation**: Strict ISO 6346 check digit algorithm and regex filters are applied before sending results to the client.

---

## 4. DTC GPS Telematics API

Connects to the DTC Enterprise Fleet Management API to fetch live truck telemetry, coordinates, and historical station logs.

### Configuration
```env
DTC_GPS_API_BASE_URL=https://gps.dtc.co.th:8099
DTC_GPS_API_TOKEN=E4QHL821CUE8ZF5...
```

### Core Endpoints & Implementation
Implementation lives in `src/lib/dtcGps.ts`:
- **Realtime Telemetry**: `fetchDtcRealtime(gpsId)` -> calls `/getRealtimeData`
- **Station-to-Station Reports**: `fetchDtcStationReport(gpsId, date)` -> calls `/getStationToStationReport`
- **Raw History Log**: `fetchDtcHistory(gpsId, date)` -> calls `/getHistory`

### Failover & Token Handling
- The gateway reads `DTC_GPS_API_TOKEN` from the environment.
- If the configured token returns an authentication error from DTC, it automatically falls back to the system fallback token to prevent UI disruptions.

---

## 5. LINE Messaging API & OpenClaw (Secondary / Legacy)

The codebase includes legacy LINE webhook handlers under the Python path (`app.py` & `services/line_client.py`).

### Configuration
```env
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
OPENCLAW_WEBHOOK_URL=...
OPENCLAW_API_KEY=...
```

### Operational Note
- There is currently no active Next.js webhook route for LINE in `src/app/api`.
- If new LINE bot features are added, prioritize creating a native Next.js route handler in `src/app/api/line/route.ts` using `@line/bot-sdk`.

