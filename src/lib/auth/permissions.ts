/**
 * Role + permission model.
 *
 * A user has exactly one `role` (a preset bundle of permissions) plus an
 * optional `permissions[]` array that grants *extra* permissions on top of the
 * role. Effective permissions = role bundle ∪ user overrides.
 *
 * Both the API route guards (`src/lib/auth/guard.ts`) and the client UI
 * (`src/lib/auth/context.tsx`) resolve access through `can()` so the rules stay
 * in one place.
 */

export const PERMISSIONS = [
  "bookings:read",
  "bookings:write",
  "bookings:delete",
  "customers:read",
  "customers:write",
  "vendors:read",
  "vendors:write",
  "containers:read",
  "containers:write",
  "gps:read",
  "ocr:use",
  "users:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["admin", "manager", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];

/** Wildcard marker — `admin` holds this and passes every `can()` check. */
export const ALL_PERMISSIONS = "*" as const;

const READ_ONLY: Permission[] = [
  "bookings:read",
  "customers:read",
  "vendors:read",
  "containers:read",
  "gps:read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly (Permission | typeof ALL_PERMISSIONS)[]> = {
  admin: [ALL_PERMISSIONS],
  manager: [
    ...READ_ONLY,
    "bookings:write",
    "bookings:delete",
    "customers:write",
    "vendors:write",
    "containers:write",
    "ocr:use",
  ],
  operator: [...READ_ONLY, "bookings:write", "ocr:use"],
  viewer: [...READ_ONLY],
};

export interface PermissionSubject {
  role: Role;
  permissions?: string[];
}

/** Full set of permission strings a user effectively holds. */
export function effectivePermissions(subject: PermissionSubject): Set<string> {
  const fromRole = ROLE_PERMISSIONS[subject.role] ?? [];
  const set = new Set<string>(fromRole);
  for (const p of subject.permissions ?? []) set.add(p);
  return set;
}

/** True if the subject may perform `permission`. Admin (`*`) passes everything. */
export function can(subject: PermissionSubject | null | undefined, permission: Permission): boolean {
  if (!subject) return false;
  const set = effectivePermissions(subject);
  return set.has(ALL_PERMISSIONS) || set.has(permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Permission required to read/write a generic collection through
 * `/api/collections/[collection]`. `users` is intentionally absent — it must go
 * through `/api/users`, which hashes passwords and strips them from responses.
 */
export function collectionPermission(
  collection: string,
  action: "read" | "write" | "delete"
): Permission | null {
  const map: Record<string, string> = {
    vendors: "vendors",
    containers: "containers",
    customers: "customers",
    bookings: "bookings",
    shipments: "bookings",
  };
  const prefix = map[collection];
  if (!prefix) return null;
  if (action === "delete") {
    // Only bookings has a dedicated delete permission; others fold into write.
    return prefix === "bookings" ? "bookings:delete" : (`${prefix}:write` as Permission);
  }
  return `${prefix}:${action}` as Permission;
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}
