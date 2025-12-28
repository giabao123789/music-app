// web/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AdminStats = {
  totals: {
    users: number;
    artists: number;
    tracks: number;
    albums: number;
    follows: number;
    favorites: number;
    listens: number;
  };
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const fetchStats = async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken") ||
            localStorage.getItem("mp:token") ||
            localStorage.getItem("token") ||
            localStorage.getItem("jwt") ||
            localStorage.getItem("access_token")
          : null;

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("Admin stats error:", res.status, await res.text());
          setLoading(false);
          return;
        }

        const data = (await res.json()) as AdminStats;
        setStats(data);
      } catch (err) {
        console.error("Admin stats fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    // gọi lần đầu
    fetchStats();

    // gọi lặp lại mỗi 10s để gần realtime
    timer = setInterval(fetchStats, 10000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const totals = stats?.totals;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-sky-300 via-purple-300 to-pink-300 text-transparent bg-clip-text">
          Dashboard tổng quan
        </h1>
        <p className="text-sm text-white/70">
          Theo dõi số liệu tổng quan của hệ thống.
        </p>
      </header>

      {/* Cards tổng */}
      {totals && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { label: "NGƯỜI DÙNG", value: totals.users },
            { label: "NGHỆ SĨ", value: totals.artists },
            { label: "BÀI HÁT", value: totals.tracks },
            { label: "ALBUM", value: totals.albums },
            { label: "FOLLOW", value: totals.follows },
            { label: "YÊU THÍCH", value: totals.favorites },
            { label: "TỔNG LƯỢT NGHE", value: totals.listens },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 border border-white/10 shadow-xl shadow-black/40 px-6 py-4"
            >
              <div className="text-xs uppercase tracking-wide text-white/70 mb-1">
                {c.label}
              </div>
              <div className="text-3xl font-semibold">
                {c.value.toLocaleString("vi-VN")}
              </div>
            </div>
          ))}
        </section>
      )}

      {loading && (
        <div className="text-center text-sm text-white/60">
          Đang tải dữ liệu dashboard...
        </div>
      )}
    </div>
  );
}
