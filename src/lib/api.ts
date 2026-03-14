import type { ApiResponse, Collection } from "./types";

const BASE = "/api/collections";

function getKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("eir_api_key") ?? "";
}

function headers(): HeadersInit {
  const userStr = typeof window !== "undefined" ? sessionStorage.getItem("itl_user") : null;
  const user = userStr ? JSON.parse(userStr) : null;
  
  return {
    "Content-Type": "application/json",
    "X-API-Key": getKey(),
    "x-itl-role": user?.role || "",
    "x-itl-branch": user?.branch || "",
  };
}

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

export async function listRecords<T>(
  collection: Collection,
  filters: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
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
