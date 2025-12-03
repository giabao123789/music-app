// web/app/artist/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type OverviewData = {
  artist?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  stats?: {
    totalTracks: number;
    totalDuration: number;
  };
};

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ARTIST" | "ADMIN";
  verified: boolean;
};

// Đọc token & user từ localStorage
function getStoredAuth() {
  if (typeof window === "undefined") {
    return { token: null as string | null, user: null as CurrentUser | null };
  }

  const token =
    localStorage.getItem("mp:token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    null;

  let user: CurrentUser | null = null;
  const rawUser =
    localStorage.getItem("currentUser") ||
    localStorage.getItem("mp:currentUser");

  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export default function ArtistHomePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Lấy token + user
  useEffect(() => {
    setMounted(true);
    const { token, user } = getStoredAuth();
    setToken(token);
    setUser(user);
  }, []);

  // Gọi API /artist/me/overview, đồng thời LƯU artistId vào localStorage
  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== "ARTIST") return;

    let cancelled = false;

    async function fetchOverview() {
      try {
        setLoadingOverview(true);
        setOverviewError(null);

        const res = await fetch(`${API_BASE}/artist/me/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(
            "[Artist] /artist/me/overview error",
            res.status,
            text
          );
          if (!cancelled) {
            setOverviewError(
              "Không đọc được thông tin tổng quan (API chưa cấu hình hoặc đang lỗi)."
            );
          }
          return;
        }

        const data = (await res.json()) as OverviewData;

        if (!cancelled) {
          setOverview(data);

          // 🔥 LƯU ARTIST ID để Nav dùng cho link "Trang của tôi"
          if (typeof window !== "undefined" && data.artist?.id) {
            localStorage.setItem("artistId", data.artist.id);
          }
        }
      } catch (e) {
        console.error("[Artist] overview fetch error", e);
        if (!cancelled) {
          setOverviewError("Lỗi mạng khi tải thông tin nghệ sĩ.");
        }
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    }

    fetchOverview();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  if (!mounted) return null;

  // Chưa đăng nhập
  if (!token || !user) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-violet-900 via-purple-900 to-black flex items-center justify-center text-sm text-white">
        <div className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 shadow-xl text-center">
          <p className="mb-2">Bạn cần đăng nhập để vào Trang nghệ sĩ.</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-full bg-white text-violet-700 px-4 py-2 text-xs font-semibold hover:bg-slate-100"
          >
            Đến trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Không phải ARTIST
  if (user.role !== "ARTIST") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-violet-900 via-purple-900 to-black flex items-center justify-center text-sm text-white">
        <div className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 shadow-xl text-center max-w-md">
          <p className="mb-2">
            Chỉ tài khoản có vai trò <b>ARTIST</b> mới truy cập được Trang nghệ
            sĩ.
          </p>
        </div>
      </div>
    );
  }

  const artistName =
    overview?.artist?.name || user.name || user.email.split("@")[0];

  const totalTracks = overview?.stats?.totalTracks ?? null;
  const totalDuration = overview?.stats?.totalDuration ?? null;
  const durationText =
    totalDuration != null
      ? `${Math.floor(totalDuration / 60)} phút ${totalDuration % 60}s`
      : null;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#020617] via-[#0b1120] to-black px-4 pb-32 pt-8 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* HEADER CARD */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#4CC3ED] via-[#6366f1] to-[#a855f7] p-[1px] shadow-2xl shadow-blue-900/40">
          <div className="relative flex flex-col gap-4 rounded-[22px] bg-slate-950/90 px-6 py-5 md:flex-row md:items-center">
            {/* Avatar / initial */}
            <div className="flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-900 border border-cyan-400/60 shadow-lg shadow-cyan-500/60">
                {overview?.artist?.avatar ? (
                  <img
                    src={overview.artist.avatar}
                    alt={artistName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-cyan-300">
                    {artistName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Text bên phải */}
            <div className="flex-1 space-y-1 md:ml-4">
              <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
                Trang nghệ sĩ
              </div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Xin chào, {artistName}
              </h1>
              <p className="text-xs text-slate-300">
                Bạn đang đăng nhập với email{" "}
                <span className="font-medium text-sky-200">
                  {user.email}
                </span>{" "}
                (vai trò <b>ARTIST</b>).
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-200">
                {totalTracks != null && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">
                    {totalTracks} bài hát đã đăng
                  </span>
                )}
                {durationText && (
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">
                    Tổng thời lượng ~ {durationText}
                  </span>
                )}
                {loadingOverview && (
                  <span className="text-cyan-300/80">
                    Đang tải thông tin tổng quan…
                  </span>
                )}
                {overviewError && (
                  <span className="text-amber-300/90">
                    {overviewError}
                  </span>
                )}
              </div>
            </div>

            {/* Nút bên phải */}
            <div className="flex flex-col gap-2 md:items-end">
              <button
                onClick={() => router.push("/artist/upload")}
                className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 px-4 py-2 text-xs font-semibold shadow-lg shadow-cyan-500/40 hover:bg-slate-100"
              >
                + Đến trang upload nhạc
              </button>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/10"
              >
                ⟵ Quay lại
              </button>
            </div>
          </div>
        </section>

        {/* GỢI Ý HƯỚNG DẪN */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-200">
            <h2 className="mb-2 text-base font-semibold text-white">
              Bạn có thể làm gì?
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
              <li>Upload bài hát mới ở trang “Upload nhạc”.</li>
              <li>Chỉnh sửa lại thông tin bài hát đã đăng.</li>
              <li>
                Sau này có thể tạo album, gán bài vào album, quản lý lời bài
                hát…
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-900/40 via-slate-950 to-slate-950 p-4 text-sm text-slate-200">
            <h2 className="mb-2 text-base font-semibold text-cyan-100">
              Mẹo nhỏ
            </h2>
            <p className="text-xs text-slate-200">
              Hãy dùng cùng một <b>audioUrl</b> dạng{" "}
              <span className="font-mono text-[11px] bg-black/40 px-1 rounded">
                /music/ten-bai-hat.mp3
              </span>{" "}
              để phát được trực tiếp trong player của app.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
