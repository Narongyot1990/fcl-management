import Link from "next/link";
import { Truck, Package, ClipboardList, FileText, ArrowRight } from "lucide-react";

const CARDS = [
  {
    href: "/vendors",
    icon: Truck,
    title: "Vendors",
    desc: "Manage vendor short codes, truck plates, and driver contacts.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/containers",
    icon: Package,
    title: "Containers",
    desc: "Define container codes and size classifications.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/bookings",
    icon: ClipboardList,
    title: "Bookings",
    desc: "Create and manage full EIR bookings across all 5 lifecycle sections.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/eir",
    icon: FileText,
    title: "EIR Records",
    desc: "Query, edit, and delete OCR-extracted Equipment Interchange Receipts.",
    color: "bg-amber-50 text-amber-600",
  },
];

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          EIR Control System — manage vendors, containers, bookings, and records.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {CARDS.map(({ href, icon: Icon, title, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white rounded-2xl border border-[var(--border)] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shrink-0`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">{title}</h2>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{desc}</p>
              </div>
              <ArrowRight
                size={16}
                className="text-[var(--muted)] group-hover:text-blue-600 group-hover:translate-x-1 transition-all mt-1 shrink-0"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
