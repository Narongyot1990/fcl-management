# AGENTS.md

This file is the fastest project briefing for coding agents working in this repository.

## 1. Working Assumption

Treat the Next.js application under `src/` as the primary system unless the task explicitly mentions the Python services.

Why:

- `package.json` is configured for the main app workflow
- `vercel.json` points to the Next.js build
- The dashboard UI, CRUD flow, upload flow, OCR flow, and GPS flow exist in `src/app`

The Python code is still relevant, but it looks like a parallel or older implementation:

- `api/index.py` is a FastAPI app with generic CRUD and booking container update logic
- `app.py` is a standalone Flask LINE webhook server
- `services/*.py` and `handlers/*.py` support the Python path

## 2. What The Product Does

This is an internal FCL operations dashboard for:

- Master data management: `vendors`, `containers`, `customers`, `users`
- Booking lifecycle management
- Image upload for EIR and container images
- OCR-assisted extraction of container fields
- GPS lookup by truck `gps_id`
- LINE integration

## 3. Core Domain Model

Main TypeScript types live in `src/lib/types.ts`.

High-value collections:

- `vendors`
  - Key fields: `code`, `name`, `branch`
  - Important nested data: `drivers[]`, `trucks[]`
  - `trucks[]` may contain `{ plate, gps_id }`
- `containers`
  - Key fields: `code`, `size`, `branch`
- `customers`
  - Key fields: `code`, `name`, `branch`
- `users`
  - Key fields: `username`, `role`, `branch`
- `bookings`
  - Main operational record
  - Tracks a 5-step lifecycle:
    1. Booking
    2. Assign truck
    3. Pickup/container
    4. Loading
    5. Return

Important booking fields:

- Identity: `booking_no`, `booking_date`, `job_type`
- Relationships: `customer_code`, `vendor_code`
- Pickup: `truck_plate`, `driver_name`, `driver_phone`, `plan_pickup_date`
- Container: `container_no`, `container_size`, `container_size_code`, `tare_weight`, `seal_no`
- Images: `eir_image_url`, `container_image_url`
- Loading: `loading_status`, `pending_at`, `loading_at`, `loaded_at`
- Return: `plan_return_date`, `return_truck_plate`, `return_driver_name`, `return_driver_phone`, `return_date`, `return_completed`, `gcl_received`

## 4. Source Of Truth By Area

Use these files first when changing behavior:

- Data types: `src/lib/types.ts`
- MongoDB client and allowed collections: `src/lib/mongodb.ts`
- Frontend API wrapper: `src/lib/api.ts`
- Dashboard shell: `src/app/(dashboard)/layout.tsx`
- Dashboard home: `src/app/(dashboard)/page.tsx`
- Booking page: `src/app/(dashboard)/bookings/page.tsx`
- Generic CRUD routes: `src/app/api/collections/[collection]/route.ts`
- Update/delete routes: `src/app/api/collections/[collection]/[id]/route.ts`
- Booking container patch route: `src/app/api/bookings/container/route.ts`
- OCR route: `src/app/api/gemini-ocr/route.ts`
- Upload route: `src/app/api/upload-image/route.ts`
- Image proxy route: `src/app/api/image/[filename]/route.ts`
- GPS route: `src/app/api/gps/route.ts`

## 5. Important Runtime Flows

### CRUD flow

- UI uses helpers from `src/lib/api.ts`
- Requests go to `/api/collections/[collection]`
- MongoDB access uses `src/lib/mongodb.ts`
- Collection names are limited by `ALLOWED`

### Booking workflow

- Most operational complexity is inside `src/app/(dashboard)/bookings/page.tsx`
- Vendor selection drives truck and driver options
- Booking process state is derived from booking fields, not from a separate workflow engine

### Upload + OCR flow

- Images upload through `src/app/api/upload-image/route.ts`
- Files are stored in Vercel Blob under `itl-files/`
- Returned image URL is proxied via `/api/image/[filename]`
- OCR runs through `src/app/api/gemini-ocr/route.ts`
- OCR output is applied back into booking form fields

### GPS flow

- Booking UI gets truck location from `/api/gps`
- The route uses a truck `gps_id` stored under the vendor record
- Response returns `lat`, `lon`, speed, time, and location summary

### LINE flow

- The current tree does not contain an active Next.js LINE webhook route
- The remaining LINE implementation is the legacy Flask server in `app.py`
- Do not assume the LINE bot is fully active without checking code paths first

## 6. Authentication And Authorization Reality

Current auth is not implemented in the active Next.js UI.

- Collection routes currently do not enforce real authentication.
- Branch filtering is documented as a concept but is not active in the current generic collection route.

Practical implication:

- API-level auth is not fully enforced for generic collection routes
- Do not describe this system as secure without first hardening it

## 7. Legacy Python Path

Only work in the Python side when the task explicitly targets it.

Relevant files:

- `api/index.py`
- `services/db.py`
- `services/ocr_client.py`
- `services/line_client.py`
- `handlers/image.py`
- `app.py`

Python path responsibilities:

- generic CRUD endpoints
- booking container patch API
- LINE signature handling and image/webhook processing

## 8. Known Risks And Technical Debt

- Hardcoded credentials/tokens exist in the codebase
- Login is mock and not backed by a real auth provider
- Generic collection API auth is effectively disabled
- There is duplicated business logic between Next.js and Python paths
- Some legacy Thai strings have encoding issues
- Secrets were previously stored in Markdown docs; new docs intentionally avoid that

## 9. Best Editing Strategy

When changing features, prefer this order:

1. Confirm whether the active behavior lives in Next.js or Python
2. Update the domain type in `src/lib/types.ts` if the data shape changes
3. Update the API route
4. Update the UI that consumes it
5. Check any matching helper in `src/lib/`

For booking-related tasks, start in `src/app/(dashboard)/bookings/page.tsx` and then follow calls outward.

## 10. Environment Variables To Expect

Common variables used across the repo:

- `MONGODB_URI`
- `MONGODB_DB`
- `OCR_API_SECRET`
- `OCR_API_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_API_KEY`

Move any remaining hardcoded external tokens into env vars if you are touching those integrations.
