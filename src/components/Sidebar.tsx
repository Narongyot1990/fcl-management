"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import { Truck, Package, ClipboardList, Users, Menu, X, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import type { Permission } from "@/lib/auth/permissions";

const NAV: { href: string; label: string; icon: typeof Truck; permission: Permission }[] = [
  { href: "/bookings", label: "Bookings", icon: ClipboardList, permission: "bookings:read" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { href: "/vendors", label: "Vendors", icon: Truck, permission: "vendors:read" },
  { href: "/containers", label: "Containers", icon: Package, permission: "containers:read" },
  { href: "/users", label: "Users", icon: ShieldCheck, permission: "users:manage" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((item) => can(item.permission));

  const renderLinks = (onClick?: () => void) =>
    items.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            active
              ? "bg-blue-600 text-white font-medium"
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          )}
        >
          <Icon size={16} />
          {label}
        </Link>
      );
    });

  const userFooter = (
    <div className="px-4 py-4 border-t border-slate-700">
      {user && (
        <div className="mb-2">
          <p className="text-sm text-slate-200 font-medium truncate">{user.name}</p>
          <p className="text-[11px] text-slate-500 capitalize">{user.role}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => logout()}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)] border-b border-slate-700 px-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">FCL Management</h1>
          <p className="text-slate-400 text-[10px]">Full Container Load System</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-200 hover:bg-slate-700"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-[var(--sidebar-bg)] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h1 className="text-white font-bold text-base leading-tight">FCL Management</h1>
                <p className="text-slate-400 text-xs mt-0.5">Full Container Load System</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-200 hover:bg-slate-700"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
              {renderLinks(() => setMobileOpen(false))}
            </nav>
            {userFooter}
          </aside>
        </div>
      )}

      <aside className="hidden md:flex w-60 shrink-0 bg-[var(--sidebar-bg)] flex-col min-h-screen md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-5 border-b border-slate-700">
          <h1 className="text-white font-bold text-base leading-tight">FCL Management</h1>
          <p className="text-slate-400 text-xs mt-0.5">Full Container Load System</p>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
          {renderLinks()}
        </nav>
        {userFooter}
      </aside>
    </>
  );
}
