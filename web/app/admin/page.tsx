"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { API_BASE } from "@/lib/config";

async function authFetch(path: string) {
  return fetch(API_BASE + path, {
    credentials: "include",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    authFetch("/admin/stats").then(async (res) => {
      setStats(await res.json());
    });
  }, []);

  if (!stats) return <AdminGuard><div className="p-6 text-blue-100">Đang tải...</div></AdminGuard>;

  return (
    <AdminGuard>
      <div className="p-6 text-blue-100">
        <h1 className="text-3xl mb-6 font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            ["Người dùng", stats.users],
            ["Nghệ sĩ", stats.artists],
            ["Bài hát", stats.tracks],
            ["Album", stats.albums],
          ].map(([label, value]) => (
            <div
              key={label}
              className="p-4 bg-slate-900 border border-cyan-500 rounded-xl shadow-lg"
            >
              <p className="text-cyan-300">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Top artists */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2 text-cyan-300">Top nghệ sĩ</h2>
          {stats.topArtists.map((a: any) => (
            <div key={a.id} className="p-3 bg-slate-800 mb-2 rounded border border-cyan-600">
              {a.name}
            </div>
          ))}
        </div>

        {/* Top tracks */}
        <div>
          <h2 className="text-xl font-bold mb-2 text-cyan-300">Top bài hát</h2>
          {stats.topTracks.map((t: any) => (
            <div key={t.id} className="p-3 bg-slate-800 mb-2 rounded border border-cyan-600">
              {t.title}
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
