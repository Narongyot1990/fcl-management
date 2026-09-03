"use client";
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import { listUsers, createUser, updateUser, deleteUser, type UserRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth/context";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS, ALL_PERMISSIONS, type Role } from "@/lib/auth/permissions";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField, Input, Select } from "@/components/FormField";

interface UserForm {
  username: string;
  name: string;
  role: Role;
  password: string;
  permissions: string[];
  active: boolean;
}

const EMPTY: UserForm = {
  username: "",
  name: "",
  role: "operator",
  password: "",
  permissions: [],
  active: true,
};

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }));

function roleGrants(role: Role): Set<string> {
  const set = new Set<string>(ROLE_PERMISSIONS[role]);
  return set;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listUsers();
      setRecords(res.records);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(u: UserRecord) {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      role: (ROLES as readonly string[]).includes(u.role) ? (u.role as Role) : "viewer",
      password: "",
      permissions: u.permissions ?? [],
      active: u.active,
    });
    setModalOpen(true);
  }

  const grantedByRole = roleGrants(form.role);
  const roleIsAdmin = grantedByRole.has(ALL_PERMISSIONS);

  function togglePermission(p: string) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(p)
        ? prev.permissions.filter((x) => x !== p)
        : [...prev.permissions, p],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Only send overrides that the role doesn't already grant.
      const extraPermissions = form.permissions.filter((p) => !grantedByRole.has(p));
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          permissions: extraPermissions,
          active: form.active,
        };
        if (form.password) payload.password = form.password;
        await updateUser(editing._id, payload);
      } else {
        await createUser({
          username: form.username,
          name: form.name || form.username,
          role: form.role,
          password: form.password,
          permissions: extraPermissions,
          active: form.active,
        });
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Users" subtitle="Accounts, roles and permissions" onAdd={openCreate} addLabel="Add user" />

      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="hidden overflow-hidden border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Extra permissions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="w-24 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  No users yet.
                </td>
              </tr>
            ) : (
              records.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.name}</div>
                    <div className="font-mono text-xs text-slate-500">{u.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                      <ShieldCheck size={12} />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.permissions.length > 0 ? u.permissions.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.active
                          ? "rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                      }
                    >
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u._id === me?.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        title={u._id === me?.id ? "You cannot delete yourself" : "Delete"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {records.map((u) => (
          <div key={u._id} className="border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{u.name}</div>
                <div className="font-mono text-xs text-slate-500">{u.username}</div>
                <div className="mt-1 text-xs capitalize text-slate-600">
                  {u.role} · {u.active ? "Active" : "Disabled"}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => openEdit(u)} className="p-1.5 text-slate-400 hover:text-blue-600">
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(u)}
                  disabled={u._id === me?.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.username}` : "Add user"}
        size="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Username" required>
              <Input
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="e.g. somchai"
                disabled={!!editing}
                required
              />
            </FormField>
            <FormField label="Full name">
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Display name"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Role" required>
              <Select
                options={ROLE_OPTIONS}
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
              />
            </FormField>
            <FormField label={editing ? "New password (leave blank to keep)" : "Password"} required={!editing}>
              <div className="relative">
                <KeyRound size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  className="pl-8"
                  required={!editing}
                  autoComplete="new-password"
                />
              </div>
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Account active
          </label>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-600">Permissions</p>
            {roleIsAdmin ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                The <strong>admin</strong> role grants every permission.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {PERMISSIONS.map((p) => {
                  const fromRole = grantedByRole.has(p);
                  const checked = fromRole || form.permissions.includes(p);
                  return (
                    <label
                      key={p}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                        fromRole ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={fromRole}
                        onChange={() => togglePermission(p)}
                      />
                      <span className="font-mono">{p}</span>
                      {fromRole && <span className="ml-auto text-[10px] uppercase">role</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Save" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        message={`Delete "${deleteTarget?.username}"? They will lose access immediately.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
