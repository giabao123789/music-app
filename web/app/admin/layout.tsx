// web/app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/tracks", label: "Tracks" },
   { href: "/admin/albums", label: "Albums" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-r from-[#1a0230] via-[#260857] to-[#050014] text-white flex">
        {/* Sidebar */}
        <aside className="w-56 border-r border-white/10 bg-black/30 px-4 py-6">
          <div className="text-lg font-semibold tracking-wide">Admin</div>

          <nav className="mt-6 space-y-2 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-3 py-2 transition-colors",
                    active
                      ? "bg-gradient-to-r from-sky-500/80 to-fuchsia-500/80 shadow-lg shadow-black/40"
                      : "bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Nội dung từng trang admin */}
        <main className="flex-1 px-6 py-6 overflow-y-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
