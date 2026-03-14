"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useState } from "react";
import { Truck, Package, ClipboardList, LayoutDashboard, Users, Menu, X, MessageSquare, LogOut, Building2, User as UserIcon } from "lucide-react";
import { useEffect } from "react";
import type { UserRole } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Truck },
  { href: "/containers", label: "Containers", icon: Package },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/line", label: "LINE Bot", icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; name: string; role: UserRole; branch?: string } | null>(null);

  useEffect(() => {
    const userStr = sessionStorage.getItem("itl_user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("itl_user");
    window.location.href = "/login";
  };

  const handleBranchChange = (branch: string) => {
    if (!user || user.role !== "admin") return;
    const newUser = { ...user, branch };
    sessionStorage.setItem("itl_user", JSON.stringify(newUser));
    setUser(newUser);
    window.location.reload(); // Reload to refresh all API data with new branch
  };

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
          {user?.role === "admin" && (
            <div className="px-3 mb-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Building2 size={12} /> View Branch
              </label>
              <select 
                value={user.branch || ""} 
                onChange={e => handleBranchChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="">All Branches</option>
                <option value="Bangkok">Bangkok</option>
                <option value="Laem Chabang">Laem Chabang</option>
                <option value="Chiang Mai">Chiang Mai</option>
              </select>
            </div>
          )}
          {renderLinks()}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-blue-400">
              <UserIcon size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter truncate">
                {user?.role} {user?.branch ? `• ${user.branch}` : ""}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={14} /> Leave System
          </button>
        </div>
      </aside>
    </>
  );
}
