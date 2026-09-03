# Architecture

## Overview

The repository currently contains two implementation tracks:

- Primary app: Next.js App Router application under `src/`
- Secondary or legacy services: Python apps under `api/`, `services/`, `handlers/`, and root `app.py`

The active user workflow appears to be centered on the Next.js dashboard.

## Structure

```text
src/
  proxy.ts                     # auth gate (Next 16 "proxy", formerly middleware)
  app/
    login/                     # sign-in page (outside the dashboard shell)
    (dashboard)/
      bookings/
      containers/
      customers/
      drivers/[id]/
      line/
      users/                   # user + permission admin (needs users:manage)
      vendors/
      layout.tsx               # wraps children in AuthProvider + auth Gate
      page.tsx
    api/
      auth/login/ | auth/logout/ | auth/me/
      users/ | users/[id]/
      bookings/container/
      collections/[collection]/
      collections/[collection]/[id]/
      gemini-ocr/
      gps/
      gps/history/
      gps/history-raw/
      image/[filename]/
      upload-image/
    globals.css
    layout.tsx
  components/
  documents/
    gps/
  lib/
    auth/
      permissions.ts           # roles, ROLE_PERMISSIONS, can()
      password.ts              # scrypt hash/verify (node runtime)
      session.ts               # JWT sign/verify + cookie opts (edge-safe)
      guard.ts                 # requireAuth / requirePermission for routes
      context.tsx              # client AuthProvider + useAuth
    api.ts
    containerValidation.ts
    gpsUtils.ts
    mongodb.ts
    types.ts

api/
  index.py

services/
  db.py
  line_client.py
  ocr_client.py

handlers/
  image.py

app.py
dashboard_html.py
```

## Main Runtime Responsibilities

### Next.js UI

Files under `src/app/(dashboard)` render the operational dashboard and master-data screens.

The largest and most stateful page is:

- `src/app/(dashboard)/bookings/page.tsx`

This page handles:

- booking creation and editing
- driver and truck selection
- image upload
- OCR result application
- loading and return process updates
- quick GPS opening for assigned trucks

### Next.js API Layer

Files under `src/app/api` act as the main in-repo backend for the dashboard.

Key responsibilities:

- Generic MongoDB CRUD for allowed collections
- Booking container patch endpoint
- OCR orchestration with Gemini
- File upload to Vercel Blob
- Image proxying from private Blob storage
- GPS lookup using DTC API

### Shared Type And Data Layer

Files under `src/lib` define common models and utilities:

- `types.ts` is the domain model reference
- `mongodb.ts` manages the MongoDB connection and allowed collections
- `api.ts` is the client-side wrapper used by React pages

## Data Flow

### Master data CRUD

1. A dashboard page calls helpers from `src/lib/api.ts`
2. Request hits `/api/collections/[collection]`
3. Route validates collection name against `ALLOWED`
4. Route reads or writes MongoDB using `getCollection()`
5. Results return to the UI as plain JSON

### Booking + image + OCR

1. User uploads EIR or container image
2. UI sends file to `/api/upload-image`
3. File is stored in Vercel Blob under `itl-files/`
4. UI stores proxy URL returned by the API
5. OCR button sends image base64 payload to `/api/gemini-ocr`
6. OCR route calls Gemini and validates extracted fields
7. UI merges returned values into the booking form

### GPS lookup

1. Booking page reads selected vendor and assigned truck
2. It finds `gps_id` from `vendor.trucks[]`
3. UI calls `/api/gps` with that `gps_id`
4. Route calls the shared DTC GPS helper in `src/lib/dtcGps.ts`
5. UI opens Google Maps using returned coordinates

### LINE webhook

The current tree does not contain an active Next.js LINE webhook route.

The legacy Flask app in `app.py` contains the remaining LINE webhook flow.

## Auth Model

- Session: signed JWT (HS256, `jose`) in the httpOnly `fcl_session` cookie,
  signed with `AUTH_SECRET`. Passwords scrypt-hashed with `node:crypto`.
- `src/proxy.ts` verifies the cookie for every route (cheap, no DB) and blocks
  unauthenticated access. Per-permission checks run inside each route handler
  (`src/lib/auth/guard.ts`), which re-loads the user from Mongo.
- Authorization: one `role` per user (`admin | manager | operator | viewer`)
  plus an additive `permissions[]`. `ROLE_PERMISSIONS` and `can()` in
  `src/lib/auth/permissions.ts` are the single source of truth, shared by the
  server guards and the client `AuthProvider` (`src/lib/auth/context.tsx`).
- `users` CRUD is isolated in `/api/users` (hashing + password projection);
  the generic `/api/collections/users` path is blocked.

## Legacy Python Services

### `api/index.py`

FastAPI app that provides:

- generic CRUD
- booking container patch endpoint
- ISO 6346 container validation
- LINE webhook handling

### `services/db.py`

Python MongoDB CRUD layer with:

- collection mapping
- dedup logic
- record querying
- booking container patching

### `app.py`

Standalone Flask LINE webhook bridge that forwards requests to OpenClaw and replies to LINE.

## Architectural Cautions

- The repo has duplicated backend responsibilities in TypeScript and Python
- The Next.js app enforces auth; the legacy Python API (`api/index.py`) does not
- Integration tokens should be migrated to environment variables consistently
- When fixing bugs, always confirm which runtime path is actually used first
