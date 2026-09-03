# AGENTS.md

This file is the primary briefing document for AI coding assistants working in this repository.

## 1. System Overview & Core Assumptions

- **Primary Application**: Next.js 16.1.6 App Router (`src/`) with React 19, TypeScript 5, and Tailwind CSS v4.
- **Backend Architecture**: Route handlers under `src/app/api/` serve as the main active backend.
- **Database**: MongoDB using the official Node.js driver (`mongodb` v6.11.0).
- **Authentication & RBAC**: Client-side `AuthGate` with session storage (`itl_user`), role-based access control (`admin`, `leader`, `driver`), and branch isolation via HTTP headers (`x-itl-role`, `x-itl-branch`).
- **File Storage**: Vercel Blob for private image storage, proxied through `/api/image/[filename]`.
- **Secondary / Legacy Track**: FastAPI (`api/index.py`), Flask LINE webhook (`app.py`), and Python utilities under `services/` & `handlers/`. **Only touch Python code when the user explicitly requests changes to the Python/FastAPI/LINE bot stack.**

---

## 2. Project Layout & Directory Structure

```text
.
├── AGENTS.md                          # Primary briefing for AI coding agents
├── README.md                          # Repository overview & setup guide
├── package.json                       # Dependencies (Next 16, React 19, Tailwind 4, Leaflet, etc.)
├── docs/                              # Detailed system documentation
│   ├── ARCHITECTURE.md                # System design, auth/RBAC architecture, data flows
│   ├── API_REFERENCE.md               # Complete Next.js & Python API endpoints spec
│   └── INTEGRATIONS.md                # MongoDB, Vercel Blob, Gemini OCR, DTC GPS, LINE setup
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Root redirect -> /bookings
│   │   ├── layout.tsx                 # Root HTML & body shell
│   │   ├── globals.css                # Tailwind CSS v4 styling rules
│   │   ├── login/                     # Authentication
│   │   │   └── page.tsx               # Login screen (username/password, demo accounts)
│   │   ├── (dashboard)/               # Protected dashboard routes (wrapped in AppShellLayout)
│   │   │   ├── layout.tsx             # Shell with responsive collapsible Sidebar
│   │   │   ├── bookings/              # Main FCL Operations Hub
│   │   │   │   ├── page.tsx           # Booking orchestration & filter management
│   │   │   │   ├── components/        # BookingRow, StepBar, ProcessModalFields, Section, Toggle
│   │   │   │   ├── hooks/             # useBookings custom hook
│   │   │   │   ├── types/             # booking-form.ts
│   │   │   │   └── utils/             # booking-utils.ts
│   │   │   ├── customers/page.tsx     # Customer master data management (with branch)
│   │   │   ├── vendors/page.tsx       # Vendor master data (trucks with gps_id, drivers, branch)
│   │   │   ├── containers/page.tsx    # Container master data management (code, size, branch)
│   │   │   └── drivers/[id]/page.tsx  # Driver profile page (personal view vs admin view)
│   │   ├── gps/
│   │   │   └── track/[plate]/page.tsx # Standalone GPS tracking page for truck plate
│   │   └── api/                       # Next.js App Router API Route Handlers
│   │       ├── collections/[collection]/        # Generic MongoDB GET (filtering/pagination/branch) & POST
│   │       ├── collections/[collection]/[id]/   # Generic MongoDB PUT & DELETE by ObjectId
│   │       ├── bookings/container/             # ISO 6346 validated container update patch
│   │       ├── gemini-ocr/                      # Gemini multi-image extraction & validation
│   │       ├── upload-image/                    # Private Vercel Blob uploader
│   │       ├── image/[filename]/                # Private Blob image proxy
│   │       ├── gps/                             # Realtime DTC GPS coordinates lookup
│   │       ├── gps/history/                     # DTC Station-to-Station summary report
│   │       └── gps/history-raw/                 # DTC Raw history point stream
│   ├── components/                    # Reusable UI components (Sidebar, AuthGate, GpsMap, ImageUpload)
│   └── lib/                           # Core utilities: types.ts, mongodb.ts, api.ts, dtcGps.ts, etc.
```

---

## 3. Core Domain Models (`src/lib/types.ts`)

### Authentication & Roles
- **`UserRole`**: `"admin"` | `"leader"` | `"driver"`
- **`User`**:
  - `_id`: string
  - `username`: string (unique key)
  - `password`: optional string (server-side/mock)
  - `role`: `UserRole`
  - `branch`: optional string (`admin` sees all branches; `leader`/`driver` belong to a specific `branch`)
  - `name`: string

### Master Data Collections
- **`vendors`**:
  - `code` (unique key), `name`, `branch`
  - `trucks`: Array of `{ plate: string, gps_id?: string }`
  - `drivers`: Array of `Driver` (`name`, `phone`, `avatar_url`, `score`, `rating`, `status`, `id_card_no`, `license_no`, `joined_at`, `branch`)
- **`containers`**: `code`, `size`, `branch`
- **`customers`**: `code` (unique key), `name`, `branch`

### Main Operational Model: `Booking`
Tracks container movements across a 5-step lifecycle:
1. **Booking Info**: `booking_no` (unique), `booking_date` (`YYYY-MM-DD`), `job_type` (`"Import"` | `"Export"`), `customer_code`, `vendor_code`, `branch`
2. **Assign Truck / Driver**: `truck_plate`, `driver_name`, `driver_phone`, `plan_pickup_date`, `eta`
3. **Container & EIR**: `container_no`, `container_size`, `container_size_code`, `tare_weight`, `seal_no`, `eir_image_url`, `container_image_url`
4. **Loading Process**: `loading_status` (`"pending"` | `"loading"` | `"loaded"`), `plan_loading_date`, `pending_at`, `loading_at`, `loaded_at`
5. **Return Process**: `plan_return_date`, `return_truck_plate`, `return_driver_name`, `return_driver_phone`, `return_date`, `return_completed` (boolean), `gcl_received` (boolean)

---

## 4. Authentication, Authorization & User Permissions (RBAC)

### A. Login & Session Management
- **Login Route**: `/login` (`src/app/login/page.tsx`).
- **Session Storage**: User session is saved in `sessionStorage.getItem("itl_user")` as JSON:
  ```json
  {
    "username": "administrator@fls.com",
    "name": "ITL Administrator",
    "role": "admin",
    "branch": "Bangkok",
    "isLoggedIn": true
  }
  ```
- **Auth Guard**: `AuthGate` (`src/components/AuthGate.tsx`) checks session on route changes and redirects unauthenticated users to `/login`.

### B. Role-Based Permissions & Branch Isolation
- **`admin`**: Full access to all branches, master data, operations, and system settings.
- **`leader`**: Scoped to their assigned `branch`.
  - Frontend automatically injects `x-itl-role` and `x-itl-branch` headers via `src/lib/api.ts`.
  - Backend `/api/collections/[collection]` enforces data isolation by filtering queries with `{ branch }` and tagging created records with the user's `branch`.
- **`driver`**: Personal profile view at `/drivers/[id]?view=me` vs Administrator view at `/drivers/[id]`.

---

## 5. Key Workflows & Data Flows

### A. CRUD Operations & Header Propagation
- Frontend calls `src/lib/api.ts` (`listRecords`, `createRecord`, `updateRecord`, `deleteRecord`).
- Automatically attaches `x-itl-role` and `x-itl-branch` headers from `sessionStorage.getItem("itl_user")`.
- Requests route to `/api/collections/[collection]`.
- Deduplication is enforced on creation using `DEDUP_KEYS` (`vendors.code`, `bookings.booking_no`, `customers.code`, `users.username`).

### B. Image Upload & OCR Flow
1. User selects/crops EIR or container door image via `ImageUpload.tsx` (`react-easy-crop` & `browser-image-compression`).
2. Client uploads file to `/api/upload-image/route.ts` -> saved in Vercel Blob under `itl-files/`.
3. The API returns a local proxy URL format `/api/image/[filename]`.
4. User clicks OCR (`GeminiOcrButton.tsx`) -> sends base64 images to `/api/gemini-ocr/route.ts`.
5. Route sends structured prompt to Google Gemini API (`gemini-2.5-flash` or `GEMINI_MODEL`), extracts `container_no`, `seal_no`, `container_size_code`, `tare_weight`.
6. Output is strictly validated (ISO 6346 checksum, regex formats) before returning to the form.

### C. GPS Lookup Flow
1. In booking or vendor views, clicking GPS finds the truck's `gps_id` in `vendor.trucks[]`.
2. Calls `/api/gps` (realtime coordinates) or navigates to `/gps/track/[plate]` / opens Google Maps (`https://maps.google.com/?q=${lat},${lon}`).
3. Coordinates and station data are fetched from the DTC GPS API via `src/lib/dtcGps.ts`.

---

## 6. Source of Truth Map

When modifying system behavior, refer to these authoritative files first:

| Area | Authoritative Source File |
|---|---|
| Domain Types & RBAC Roles | `src/lib/types.ts` |
| Auth Gate & Session Checking | `src/components/AuthGate.tsx` |
| Login Page & Credentials | `src/app/login/page.tsx` |
| MongoDB Client & Indices | `src/lib/mongodb.ts` |
| Frontend API Client (Header Injection) | `src/lib/api.ts` |
| Booking Hub UI & Logic | `src/app/(dashboard)/bookings/page.tsx` |
| Booking Form State & Types | `src/app/(dashboard)/bookings/types/booking-form.ts` |
| Generic Collection CRUD & Branch Isolation | `src/app/api/collections/[collection]/route.ts` |
| Container Patch API | `src/app/api/bookings/container/route.ts` |
| Gemini OCR Integration | `src/app/api/gemini-ocr/route.ts` |
| Vercel Blob Image Proxy | `src/app/api/image/[filename]/route.ts` |
| DTC GPS Gateway | `src/lib/dtcGps.ts` & `src/app/api/gps/route.ts` |

---

## 7. Coding Guidelines for AI Assistants

1. **Next.js App Router First**: All UI and core API work must be done within `src/app/`. Do not introduce duplicate backend logic in Python unless explicitly tasked.
2. **Preserve Domain & Auth Types**: When updating fields, always update `src/lib/types.ts` first, then propagate changes through API routes and React components.
3. **Respect Branch Isolation**: Keep `branch` awareness in models and queries. For non-admin roles, ensure queries filter by branch.
4. **No Breaking Container Validation**: Container numbers must adhere to ISO 6346 (4 letters + 7 digits with check-digit validation in `src/lib/containerValidation.ts`).
5. **Safe Image URLs**: Never expose direct raw Vercel Blob URLs directly to clients without going through `/api/image/[filename]` proxy or relative helper `toProxyUrl`.
6. **Clean Imports**: Use `@/...` path aliases mapping to `src/...`.
7. **No Phantom Files**: Note that `src/app/page.tsx` redirects to `/bookings`. Unauthenticated requests redirect to `/login`.

---

## 8. Environment Variables Reference

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://...
MONGODB_DB=eir_scanner

# Security & API Auth
OCR_API_SECRET=your_secret_api_key

# Google Gemini (OCR)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# DTC GPS Gateway
DTC_GPS_API_BASE_URL=https://gps.dtc.co.th:8099
DTC_GPS_API_TOKEN=E4QHL821CUE8ZF5...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Secondary / Legacy Integrations (Python)
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
OPENCLAW_WEBHOOK_URL=...
OPENCLAW_API_KEY=...
```

