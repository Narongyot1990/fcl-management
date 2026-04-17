# AI Support / ITL FCL Management

This repository contains an internal logistics support system for FCL booking and container operations. The main user-facing app is a Next.js dashboard with CRUD screens, API routes, image upload, OCR-assisted data extraction, GPS lookup, and a LINE webhook endpoint.

There are also Python services in the repo. Based on the current structure, those Python files look like legacy or auxiliary services rather than the primary runtime for the dashboard.

## Current Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Primary backend in this repo: Next.js route handlers under `src/app/api`
- Database: MongoDB
- File storage: Vercel Blob
- External integrations: Gemini OCR, LINE Messaging API, DTC GPS API
- Legacy/secondary backend code: FastAPI and Flask Python files

## What This App Does

- Manage master data for `vendors`, `containers`, `customers`, and `users`
- Manage `bookings` across a 5-step operational lifecycle
- Upload container and EIR images
- Use OCR to extract container fields from uploaded images
- Resolve GPS coordinates for trucks using vendor truck `gps_id`
- Expose a LINE webhook route

## Repo Map

```text
.
|-- src/
|   |-- app/
|   |   |-- (dashboard)/        # Main dashboard pages
|   |   |-- api/                # Active Next.js API routes
|   |   `-- login/              # Mock login page
|   |-- components/             # Shared UI components
|   |-- lib/                    # Types, MongoDB client, helpers
|   `-- services/               # Frontend-facing service wrappers
|-- api/                        # FastAPI app for Vercel Python runtime
|-- services/                   # Python data and integration services
|-- handlers/                   # Python handlers
|-- docs/                       # Project documentation
|-- app.py                      # Standalone Flask LINE webhook server
`-- dashboard_html.py           # Standalone dashboard-related script
```

## Primary Entry Points

- Dashboard home: `src/app/(dashboard)/page.tsx`
- Booking management UI: `src/app/(dashboard)/bookings/page.tsx`
- Generic CRUD API: `src/app/api/collections/[collection]/route.ts`
- Record update/delete API: `src/app/api/collections/[collection]/[id]/route.ts`
- Booking container patch API: `src/app/api/bookings/container/route.ts`
- OCR API: `src/app/api/gemini-ocr/route.ts`
- GPS API: `src/app/api/gps/route.ts`
- LINE webhook: `src/app/api/line/webhook/route.ts`

## Quick Start

### 1. Install dependencies

```bash
npm install
```

If you need the Python utilities:

```bash
pip install -r requirements.txt
```

### 2. Create `.env`

Use `.env.example` as a starting point and add the missing values required by the features you want to run.

Minimum commonly used variables:

```env
MONGODB_URI=
MONGODB_DB=eir_scanner
OCR_API_SECRET=
GEMINI_API_KEY=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

Optional or integration-specific variables:

```env
GEMINI_MODEL=
OCR_API_URL=
OPENCLAW_WEBHOOK_URL=
OPENCLAW_API_KEY=
```

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Important Notes

- The Next.js app appears to be the main active application.
- Login is currently mock/session-based on the client side.
- Some API routes currently bypass real authentication checks.
- There are hardcoded credentials/tokens in parts of the source code. They should be moved to environment variables before production hardening.
- Some older Thai text appears with encoding issues in legacy files; prefer the newer docs in `docs/` and `AGENTS.md` as the working reference.

## Recommended Docs To Read Next

- `AGENTS.md` for AI-oriented coding guidance
- `docs/ARCHITECTURE.md` for runtime and structure details
- `docs/API_REFERENCE.md` for active API routes
- `docs/INTEGRATIONS.md` for MongoDB, Blob, Gemini, LINE, and GPS setup notes
