# ITL FCL Management (AI Support)

An internal Full Container Load (FCL) logistics operations dashboard built with Next.js 16, React 19, Tailwind CSS v4, and MongoDB. The system streamlines booking management, driver/truck assignment, EIR & container door photo capture, OCR-assisted data extraction via Google Gemini, realtime GPS truck tracking via DTC GPS, and Role-Based Access Control (RBAC) with branch data isolation.

---

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **UI & Styling**: React 19.2.3, Tailwind CSS v4, Lucide React
- **Authentication & Security**: `AuthGate` session wrapper (`sessionStorage`), RBAC (`admin`, `leader`, `driver`), and Header-based branch isolation (`x-itl-role`, `x-itl-branch`)
- **Maps & Location**: Leaflet, React-Leaflet
- **Image Processing**: `react-easy-crop`, `browser-image-compression`
- **Database**: MongoDB (Node.js driver 6.11.0)
- **File Storage**: Vercel Blob (private upload with local proxy)
- **AI & Integrations**: Google Gemini API (OCR extraction), DTC GPS API
- **Legacy Utilities**: FastAPI (`api/index.py`), Flask LINE webhook server (`app.py`)

---

## Core Capabilities

1. **Authentication & User Permissions (RBAC)**:
   - Built-in Login screen at `/login`
   - Role management:
     - **`admin`**: Full visibility and control across all company branches.
     - **`leader`**: Scoped operational management for their assigned branch.
     - **`driver`**: Personal driver profile view (`/drivers/[id]?view=me`) vs admin inspection.
   - Client-side `AuthGate` protection and HTTP header injection (`x-itl-role`, `x-itl-branch`).
2. **5-Step Booking Lifecycle**:
   - Step 1: Booking Information (Customer, Vendor, Job Type, Dates, Branch)
   - Step 2: Assign Truck & Driver (with quick phone/status access)
   - Step 3: Container & EIR (Upload photos, run Gemini OCR, validate ISO 6346 container numbers)
   - Step 4: Loading Status (`pending` -> `loading` -> `loaded`)
   - Step 5: Return Status (Return truck, return date, GCL received)
3. **Master Data Management**:
   - **Customers**: Code, name, branch
   - **Vendors**: Code, name, branch, trucks with GPS IDs, drivers with profiles
   - **Containers**: Container code, standard size, branch
   - **Driver Profiles**: Rating, score, jobs count, license & national ID
4. **Automated OCR Extraction**:
   - Upload Container door and EIR ticket images
   - Gemini extracts `container_no`, `seal_no`, `container_size_code`, and `tare_weight`
   - Strict validation algorithms ensure data correctness
5. **Realtime GPS Tracking**:
   - Direct truck tracking at `/gps/track/[plate]`
   - Direct Google Maps redirect from assigned trucks
   - Historical DTC station reports

---

## Project Structure

```text
.
├── AGENTS.md                          # Primary AI Coding Agent briefing
├── README.md                          # Project overview & documentation
├── package.json                       # Next.js dependencies & scripts
├── docs/
│   ├── ARCHITECTURE.md                # System design, auth/RBAC data flows, database schemas
│   ├── API_REFERENCE.md               # Complete Next.js & Python API specification
│   └── INTEGRATIONS.md                # MongoDB, Vercel Blob, Gemini OCR, DTC GPS, LINE
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Redirects to /bookings
│   │   ├── layout.tsx                 # Root HTML shell
│   │   ├── login/                     # Login authentication screen
│   │   │   └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Responsive dashboard layout with Sidebar
│   │   │   ├── bookings/              # Main FCL Operations Hub
│   │   │   ├── customers/page.tsx     # Customer master data
│   │   │   ├── vendors/page.tsx       # Vendor & truck/driver master data
│   │   │   ├── containers/page.tsx    # Container master data
│   │   │   └── drivers/[id]/page.tsx  # Driver profile page
│   │   ├── gps/
│   │   │   └── track/[plate]/page.tsx # Direct GPS tracking page
│   │   └── api/                       # Next.js API Routes (CRUD, OCR, GPS, Upload)
│   ├── components/                    # Shared components (Sidebar, AuthGate, GpsMap, etc.)
│   └── lib/                           # Core utilities: types.ts, mongodb.ts, api.ts, dtcGps.ts, etc.
├── api/                               # Secondary FastAPI endpoints
└── services/                          # Python utilities for legacy services
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

*(Optional: If running legacy Python scripts)*
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
MONGODB_DB=eir_scanner

# Security & API Key
OCR_API_SECRET=your_secret_api_key

# Google Gemini API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# DTC GPS Gateway
DTC_GPS_API_BASE_URL=https://gps.dtc.co.th:8099
DTC_GPS_API_TOKEN=E4QHL821CUE8ZF5...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (unauthenticated sessions will redirect to `/login`).

---

## Documentation Index

- **[`AGENTS.md`](./AGENTS.md)**: AI agent rules, RBAC constraints, and source of truth references.
- **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**: Deep dive into application architecture, auth flow, database schemas, and data pipelines.
- **[`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)**: Detailed API endpoints documentation, query parameters, auth headers, and payloads.
- **[`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md)**: Configuration guide for MongoDB Atlas, Vercel Blob, Gemini OCR, and DTC GPS.

