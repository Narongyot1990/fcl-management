import type { ApiResponse, Collection } from "./types";

const BASE = "/api/collections";

type ListValue = string | number | boolean | undefined | null;

function headers(): HeadersInit {
  // Auth travels in the httpOnly `fcl_session` cookie, sent automatically on
  // same-origin requests.
  return { "Content-Type": "application/json" };
}

async function handleRes<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== "undefined") {
    // Session expired or missing — bounce to login, preserving where we were.
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
    throw new Error("401: session expired");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export async function listRecords<T>(
  collection: Collection,
  filters: Record<string, ListValue> = {},
  options: Record<string, ListValue> = {}
): Promise<ApiResponse<T>> {
  const params = new URLSearchParams(
    Object.entries({ ...filters, ...options }).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = String(value);
        }
        return acc;
      },
      {}
    )
  );
  const url = `${BASE}/${collection}${params.size ? `?${params}` : ""}`;
  const res = await fetch(url, { headers: headers() });
  return handleRes<ApiResponse<T>>(res);
}

export async function createRecord<T>(
  collection: Collection,
  data: Record<string, unknown>
): Promise<{ created: boolean; record: T }> {
  const res = await fetch(`${BASE}/${collection}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleRes(res);
}

export async function updateRecord(
  collection: Collection,
  id: string,
  data: Record<string, unknown>
): Promise<{ updated: boolean }> {
  const res = await fetch(`${BASE}/${collection}/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handleRes(res);
}

export async function deleteRecord(
  collection: Collection,
  id: string
): Promise<{ deleted: boolean }> {
  const res = await fetch(`${BASE}/${collection}/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return handleRes(res);
}

export interface CreateShipmentResult<TBooking, TShipment> {
  created?: boolean;
  booking?: TBooking;
  shipment?: TShipment;
  needsConfirmation?: boolean;
  booking_no?: string;
  existingShipmentCount?: number;
  nextShipmentNo?: number;
}

export async function createShipment<TBooking, TShipment>(
  payload: Record<string, unknown>
): Promise<CreateShipmentResult<TBooking, TShipment>> {
  const res = await fetch(`/api/bookings/create-shipment`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}

export async function listBookingsGrouped<T>(
  filters: Record<string, ListValue> = {},
  options: Record<string, ListValue> = {}
): Promise<ApiResponse<T>> {
  const params = new URLSearchParams(
    Object.entries({ ...filters, ...options }).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = String(value);
        }
        return acc;
      },
      {}
    )
  );
  const res = await fetch(`/api/bookings/list${params.size ? `?${params}` : ""}`, { headers: headers() });
  return handleRes<ApiResponse<T>>(res);
}

// ── User management (requires users:manage) ─────────────────────────────────

export interface UserRecord {
  _id: string;
  username: string;
  name: string;
  role: string;
  permissions: string[];
  active: boolean;
  last_login_at: string | null;
  created_at: string | null;
}

export async function listUsers(): Promise<{ count: number; records: UserRecord[] }> {
  const res = await fetch("/api/users", { headers: headers() });
  return handleRes(res);
}

export async function createUser(data: Record<string, unknown>): Promise<{ created: boolean; record: UserRecord }> {
  const res = await fetch("/api/users", { method: "POST", headers: headers(), body: JSON.stringify(data) });
  return handleRes(res);
}

export async function updateUser(id: string, data: Record<string, unknown>): Promise<{ updated: boolean }> {
  const res = await fetch(`/api/users/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(data) });
  return handleRes(res);
}

export async function deleteUser(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers: headers() });
  return handleRes(res);
}
