// web/app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * ✅ Chỗ để bạn chèn hình nền:
 * - Cách 1: đặt ảnh vào web/public rồi dùng "/bg-admin.jpg"
 * - Cách 2: dùng link http(s)
 */
const DASHBOARD_BG_URL = "/bg-admin.jpg"; // <-- đổi đường dẫn ảnh ở đây

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

    fetchStats();
    timer = setInterval(fetchStats, 10000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  const totals = stats?.totals;

  const cards = totals
    ? [
        { label: "NGƯỜI DÙNG", value: totals.users },
        { label: "NGHỆ SĨ", value: totals.artists },
        { label: "BÀI HÁT", value: totals.tracks },
        { label: "ALBUM", value: totals.albums },
        { label: "FOLLOW", value: totals.follows },
        { label: "YÊU THÍCH", value: totals.favorites },
        { label: "TỔNG LƯỢT NGHE", value: totals.listens },
      ]
    : [];

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* ===== BACKGROUND LAYER ===== */}
      <div className="absolute inset-0 -z-10">
        {/* Ảnh nền */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url(${DASHBOARD_BG_URL})` }}
        />
        {/* Overlay gradient xanh-tím giống theme */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2dd4ff]/25 via-[#7c3aed]/20 to-[#22d3ee]/20" />
        {/* Vignette tối để text nổi */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/70" />
        {/* Neon blobs */}
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#2dd4ff]/25 blur-3xl" />
        <div className="absolute -top-28 right-[-120px] h-80 w-80 rounded-full bg-[#7c3aed]/25 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/3 h-96 w-96 rounded-full bg-[#22d3ee]/15 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* ===== HEADER ===== */}
        <header className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-6 py-5 shadow-[0_0_55px_rgba(45,212,255,0.12)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text
                           bg-gradient-to-r from-[#2dd4ff] via-[#7c3aed] to-[#22d3ee]
                           drop-shadow-[0_0_18px_rgba(45,212,255,0.45)]"
              >
                Dashboard tổng quan
              </h1>
              <p className="text-sm text-white/75 mt-2">
                Theo dõi số liệu tổng quan của hệ thống.
              </p>
              <p className="text-[11px] text-white/45 mt-1">
                Auto refresh mỗi 10s (giữ nguyên chức năng).
              </p>
            </div>

            {/* Neon pill (giống tone thanh header tím-xanh bạn gửi) */}
            <div
              className="rounded-full px-4 py-2 text-xs font-semibold text-white/90 border border-white/10
                         bg-gradient-to-r from-[#7c3aed]/35 to-[#2dd4ff]/25
                         shadow-[0_0_28px_rgba(124,58,237,0.25)]"
            >
              Admin • Stats
            </div>
          </div>
        </header>

        {/* ===== CONTENT ===== */}
        {loading && (
          <div className="text-center text-sm text-white/70">
            Đang tải dữ liệu dashboard...
          </div>
        )}

        {totals && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="group relative rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl
                           px-6 py-5 overflow-hidden
                           shadow-[0_0_45px_rgba(45,212,255,0.10)] hover:shadow-[0_0_60px_rgba(45,212,255,0.18)]
                           transition-all"
              >
                {/* Glow gradient border-ish */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity
                             bg-gradient-to-r from-[#2dd4ff]/20 via-[#7c3aed]/20 to-[#22d3ee]/20"
                />
                {/* Inner shine */}
                <div className="pointer-events-none absolute -top-24 -left-24 h-44 w-44 rounded-full bg-[#2dd4ff]/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-44 w-44 rounded-full bg-[#7c3aed]/18 blur-2xl" />

                <div className="relative">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                    {c.label}
                  </div>

                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-3xl font-extrabold text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.20)]">
                      {c.value.toLocaleString("vi-VN")}
                    </div>

                    {/* mini neon line */}
                    <div className="h-[10px] w-20 rounded-full bg-gradient-to-r from-[#2dd4ff] via-[#7c3aed] to-[#22d3ee] opacity-60 blur-[0.2px]" />
                  </div>

                  <div className="mt-3 h-px w-full bg-gradient-to-r from-white/0 via-white/10 to-white/0" />

                  <div className="mt-3 text-[12px] text-white/55">
                    Cập nhật:{" "}
                    <span className="text-white/80">
                      {new Date().toLocaleTimeString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && !totals && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-6 py-5 text-sm text-white/70">
            Không có dữ liệu thống kê (thiếu token hoặc API lỗi). Mở Console để xem log.
          </div>
        )}
      </div>
    </div>
  );
}
