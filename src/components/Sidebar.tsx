"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Truck, Package, ClipboardList, FileText, LayoutDashboard } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendors", label: "Vendors", icon: Truck },
  { href: "/containers", label: "Containers", icon: Package },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/eir", label: "EIR Records", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-[var(--sidebar-bg)] flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-slate-700">
        <h1 className="text-white font-bold text-base leading-tight">EIR Control</h1>
        <p className="text-slate-400 text-xs mt-0.5">Equipment Interchange Receipt</p>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
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
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">EIR System v2.0</p>
      </div>
    </aside>
  );
}
