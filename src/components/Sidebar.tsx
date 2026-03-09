"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import { Truck, Package, ClipboardList, LayoutDashboard, Users, Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Truck },
  { href: "/containers", label: "Containers", icon: Package },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderLinks = (onClick?: () => void) =>
    NAV.map(({ href, label, icon: Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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

  return (
    <>
      {/* Mobile top bar */}
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

      {/* Mobile drawer */}
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
            <div className="px-5 py-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">FCL System v2.0</p>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-[var(--sidebar-bg)] flex-col min-h-screen md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-5 border-b border-slate-700">
          <h1 className="text-white font-bold text-base leading-tight">FCL Management</h1>
          <p className="text-slate-400 text-xs mt-0.5">Full Container Load System</p>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
          {renderLinks()}
        </nav>
        <div className="px-5 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">FCL System v2.0</p>
        </div>
      </aside>
    </>
  );
}
