import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-neutral-800 p-4">
        <h1 className="font-bold mb-4 text-lg">Admin</h1>
        <nav className="space-y-2 text-sm">
          <Link href="/admin/users" className="block hover:underline">
            Người dùng
          </Link>
          <Link href="/admin/artists" className="block hover:underline">
            Nghệ sĩ
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
