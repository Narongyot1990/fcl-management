# Integrations

This document replaces the older scattered setup notes and focuses on the integrations that affect coding work.

## MongoDB

Used by both the Next.js and Python paths.

Environment variables:

```env
MONGODB_URI=
MONGODB_DB=eir_scanner
```

Main files:

- Next.js: `src/lib/mongodb.ts`
- Python: `services/db.py`

## Vercel Blob

Used for image storage.

Main flow:

- Upload through `src/app/api/upload-image/route.ts`
- Read through `src/app/api/image/[filename]/route.ts`

Behavior:

- Files are stored under `itl-files/`
- Upload route uses private access
- Client should use the returned proxy URL, not the raw blob URL

## Gemini OCR

Used to extract booking fields from:

- container door image
- EIR image

Environment variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

Main route:

- `src/app/api/gemini-ocr/route.ts`

Important coding note:

- OCR output is validated again after model response
- Keep strict validation when adjusting prompts or supported fields

## LINE Messaging API

Environment variables:

```env
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

Relevant implementations:

- `services/line_client.py`
- `app.py`

Current status:

- There is no active Next.js LINE webhook route in the current tree
- The remaining LINE implementation is the legacy Flask path

When working on LINE features:

1. Decide whether to add a new Next.js route or update the Python path
2. Move any remaining hardcoded values into env vars
3. Verify signature handling before enabling replies

## OCR Scanner Service

Used in the Python path.

Environment variables:

```env
OCR_API_URL=
OCR_API_SECRET=
```

Relevant file:

- `services/ocr_client.py`

## GPS Provider

Used by:

- `src/app/api/gps/route.ts`
- `src/app/api/gps/history/route.ts`
- `src/app/api/gps/history-raw/route.ts`
- `src/lib/dtcGps.ts`

Current behavior:

- Accepts a `gps_id`
- Calls the DTC GPS API
- Returns coordinates and lightweight status data

Important note:

- GPS token and base URL are read from environment variables

Environment variables:

```env
DTC_GPS_API_BASE_URL=https://gps.dtc.co.th:8099
DTC_GPS_API_TOKEN=
```

## OpenClaw

Only relevant to the standalone Flask path in `app.py`.

Environment variables:

```env
OPENCLAW_WEBHOOK_URL=
OPENCLAW_API_KEY=
```

Use this only when the task explicitly targets the standalone LINE bridge.
