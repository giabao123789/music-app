// web/app/artist/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type OverviewData = {
  artist?: {
    id: string;
    name: string;
    avatar: string | null;
    totalPlays?: number; 
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

type ArtistNotification = {
  id: string;
  artistId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string | null;
  readAt: string | null;
  entity?: any;
  payload?: any;
};

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

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function formatTimeAgo(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;

  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;

  return new Date(iso).toLocaleString();
}

type ConfirmState =
  | null
  | {
      title: string;
      description?: string;
      confirmText?: string;
      danger?: boolean;
      onConfirm: () => Promise<void> | void;
    };

export default function ArtistHomePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
const totalPlays = overview?.artist?.totalPlays ?? null;


  // avatar fallback
  const [avatarBroken, setAvatarBroken] = useState(false);

  // notifications
  const [notiItems, setNotiItems] = useState<ArtistNotification[]>([]);
  const [loadingNoti, setLoadingNoti] = useState(false);
  const [notiError, setNotiError] = useState<string | null>(null);

  // filters + paging
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [page, setPage] = useState(1);

  // modal confirm đẹp
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const unreadCount = useMemo(
    () => notiItems.filter((n) => !n.readAt).length,
    [notiItems]
  );

  useEffect(() => {
    setMounted(true);
    const { token, user } = getStoredAuth();
    setToken(token);
    setUser(user);
  }, []);

  // ===== overview =====
  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== "ARTIST") return;

    let cancelled = false;

    async function fetchOverview() {
      try {
        setLoadingOverview(true);
        setOverviewError(null);

        const res = await fetch(`${API_BASE}/artist/me/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("[Artist] /artist/me/overview error", res.status, text);
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
          setAvatarBroken(false);

          if (typeof window !== "undefined" && data.artist?.id) {
            localStorage.setItem("artistId", data.artist.id);
          }
        }
      } catch (e) {
        console.error("[Artist] overview fetch error", e);
        if (!cancelled) setOverviewError("Lỗi mạng khi tải thông tin nghệ sĩ.");
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    }

    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  // ===== notifications loader =====
  const fetchNotifications = async (opts?: { resetPage?: boolean }) => {
    if (!token) return;

    const nextPage = opts?.resetPage ? 1 : page;
    const limit = viewAll ? 200 : 20;

    try {
      setLoadingNoti(true);
      setNotiError(null);

      const res = await fetch(
        `${API_BASE}/artist/me/notifications?limit=${limit}&page=${nextPage}&onlyUnread=${
          onlyUnread ? 1 : 0
        }`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[Artist] notifications error", res.status, text);
        setNotiError("Chưa lấy được thông báo (API đang lỗi hoặc chưa có).");
        return;
      }

      const data = await res.json();
      const items: ArtistNotification[] = Array.isArray(data?.items)
        ? data.items
        : [];

      setNotiItems(items);
      setPage(nextPage);
    } catch (e) {
      console.error("[Artist] notifications fetch error", e);
      setNotiError("Lỗi mạng khi tải thông báo.");
    } finally {
      setLoadingNoti(false);
    }
  };

  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== "ARTIST") return;

    fetchNotifications({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, onlyUnread, viewAll]);

  const refreshNoti = async () => {
    await fetchNotifications({ resetPage: true });
  };

  const markRead = async (id: string) => {
    if (!token) return;

    // optimistic
    setNotiItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n
      )
    );

    try {
      const res = await fetch(`${API_BASE}/artist/me/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[Artist] markRead failed", res.status, text);
      }
    } catch (e) {
      console.error("[Artist] markRead error", e);
    }
  };

  const markAllRead = async () => {
    if (!token) return;

    setNotiItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() }
      )
    );

    try {
      const res = await fetch(`${API_BASE}/artist/me/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[Artist] read-all failed", res.status, text);
      }
    } catch (e) {
      console.error("[Artist] read-all error", e);
    }
  };

  const deleteOne = async (id: string) => {
    if (!token) return;

    setConfirm({
      title: "Xoá thông báo này?",
      description: "Hành động này không hoàn tác.",
      confirmText: "Xoá",
      danger: true,
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          const res = await fetch(`${API_BASE}/artist/me/notifications/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.warn("[Artist] delete one failed", res.status, text);
          }

          // update UI
          setNotiItems((prev) => prev.filter((n) => n.id !== id));
        } finally {
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  const deleteAll = async () => {
    if (!token) return;

    setConfirm({
      title: "Xoá TẤT CẢ thông báo?",
      description: "Hành động này không hoàn tác.",
      confirmText: "Xoá tất cả",
      danger: true,
      onConfirm: async () => {
        try {
          setConfirmBusy(true);
          const res = await fetch(`${API_BASE}/artist/me/notifications`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.warn("[Artist] delete-all failed", res.status, text);
          }

          setNotiItems([]);
        } finally {
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  if (!mounted) return null;

  if (!token || !user) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(60%_50%_at_100%_20%,rgba(168,85,247,0.14),transparent_55%),linear-gradient(to_bottom,#030712,#020617,#000)] flex items-center justify-center text-sm text-white">
        <div className="bg-slate-950/55 border border-cyan-400/20 rounded-3xl px-6 py-4 shadow-[0_0_40px_rgba(34,211,238,0.18)] text-center">
          <p className="mb-2 text-slate-200">Bạn cần đăng nhập để vào Trang nghệ sĩ.</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 px-4 py-2 text-xs font-semibold shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:opacity-95"
          >
            Đến trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== "ARTIST") {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(60%_50%_at_100%_20%,rgba(168,85,247,0.14),transparent_55%),linear-gradient(to_bottom,#030712,#020617,#000)] flex items-center justify-center text-sm text-white">
        <div className="bg-slate-950/55 border border-cyan-400/20 rounded-3xl px-6 py-4 shadow-[0_0_40px_rgba(34,211,238,0.16)] text-center max-w-md">
          <p className="mb-2 text-slate-200">
            Chỉ tài khoản có vai trò <b className="text-cyan-200">ARTIST</b> mới truy cập được Trang nghệ sĩ.
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

  const avatarUrl = !avatarBroken
    ? resolveMediaUrl(overview?.artist?.avatar ?? null)
    : "";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[radial-gradient(90%_70%_at_50%_0%,rgba(34,211,238,0.16),transparent_58%),radial-gradient(65%_55%_at_100%_10%,rgba(168,85,247,0.14),transparent_55%),radial-gradient(60%_50%_at_0%_30%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(to_bottom,#020617,#050a1a,#000)] px-4 pb-32 pt-8 text-slate-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* HEADER CARD */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/70 via-blue-500/50 to-violet-500/60 p-[1px] shadow-[0_0_55px_rgba(34,211,238,0.20)]">
          <div className="relative flex flex-col gap-4 rounded-[22px] bg-slate-950/85 px-6 py-5 md:flex-row md:items-center">
            {/* soft glow */}
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

            {/* Avatar / initial */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full blur-xl bg-cyan-400/20" />
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-900 border border-cyan-300/50 shadow-[0_0_28px_rgba(34,211,238,0.25)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={artistName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <span className="text-3xl font-bold text-cyan-200">
                    {artistName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Text bên phải */}
            <div className="flex-1 space-y-1 md:ml-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
                Trang nghệ sĩ
              </div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Xin chào, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200">{artistName}</span>
              </h1>
              <p className="text-xs text-slate-300">
                Bạn đang đăng nhập với email{" "}
                <span className="font-medium text-sky-200">{user.email}</span>{" "}
                (vai trò <b className="text-cyan-200">ARTIST</b>).
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-200">
                {totalTracks != null && (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/5 px-3 py-1 text-slate-200">
                    {totalTracks} bài hát đã đăng
                  </span>
                )}
                {durationText && (
                  <span className="rounded-full border border-violet-300/20 bg-violet-500/5 px-3 py-1 text-slate-200">
                    Tổng thời lượng ~ {durationText}
                  </span>
                )}
                {totalPlays != null && (
                  <span className="rounded-full border border-violet-300/20 bg-violet-500/5 px-3 py-1 text-slate-200">
                   Tổng lượt nghe: {totalPlays.toLocaleString("vi-VN")} 
                  </span>
                )}
                {loadingOverview && (
                  <span className="text-cyan-200/80">Đang tải thông tin tổng quan…</span>
                )}
                {overviewError && (
                  <span className="text-amber-200/90">{overviewError}</span>
                )}
              </div>
            </div>

            {/* Nút bên phải */}
            <div className="flex flex-col gap-2 md:items-end">
              <button
                onClick={() => router.push("/artist/upload")}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 px-4 py-2 text-xs font-semibold shadow-[0_0_26px_rgba(34,211,238,0.25)] hover:opacity-95"
              >
                + Đến trang upload nhạc
              </button>
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center rounded-full border border-cyan-300/25 bg-slate-950/40 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-white/10"
              >
                ⟵ Quay lại
              </button>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="rounded-2xl border border-cyan-400/25 bg-slate-950/60 p-4 shadow-[0_0_40px_rgba(34,211,238,0.14)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Thông báo{" "}
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-cyan-400/10 border border-cyan-300/25 px-2 py-0.5 text-[11px] text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
                    {unreadCount} mới
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 mt-1">
                Thông báo khi admin sửa/xoá track, và các thay đổi liên quan.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyUnread((v) => !v)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    onlyUnread
                      ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.14)]"
                      : "border-slate-700/60 bg-slate-900/35 text-slate-200 hover:bg-slate-900/55",
                  ].join(" ")}
                >
                  {onlyUnread ? "Đang lọc: Chưa đọc" : "Chỉ chưa đọc"}
                </button>

                <button
                  type="button"
                  onClick={() => setViewAll((v) => !v)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition",
                    viewAll
                      ? "border-violet-300/35 bg-violet-500/10 text-violet-200 shadow-[0_0_16px_rgba(168,85,247,0.14)]"
                      : "border-slate-700/60 bg-slate-900/35 text-slate-200 hover:bg-slate-900/55",
                  ].join(" ")}
                >
                  {viewAll ? "Đang xem: Tất cả" : "Xem tất cả"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshNoti}
                className="rounded-full border border-cyan-300/20 bg-slate-900/35 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900/55"
              >
                {loadingNoti ? "Đang tải..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={markAllRead}
                disabled={notiItems.length === 0 || unreadCount === 0}
                className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-400/15 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(34,211,238,0.10)]"
              >
                Đã đọc tất cả
              </button>

              <button
                type="button"
                onClick={deleteAll}
                disabled={notiItems.length === 0}
                className="rounded-full border border-rose-300/25 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xoá tất cả
              </button>
            </div>
          </div>

          {notiError && (
            <div className="mt-3 rounded-md border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {notiError}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {notiItems.length === 0 && !loadingNoti && (
              <div className="text-xs text-slate-400">Chưa có thông báo nào.</div>
            )}

            {notiItems.map((n) => {
              const isUnread = !n.readAt;
              return (
                <div
                  key={n.id}
                  className={[
                    "rounded-xl border px-3 py-2 transition",
                    isUnread
                      ? "border-cyan-300/25 bg-cyan-400/8 shadow-[0_0_22px_rgba(34,211,238,0.10)]"
                      : "border-white/10 bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => markRead(n.id)}
                      className="min-w-0 flex-1 text-left hover:opacity-95"
                      title="Bấm để đánh dấu đã đọc"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-100 truncate">
                          {n.title || "Thông báo"}
                        </div>
                        {isUnread && (
                          <span className="rounded-full bg-cyan-400/10 border border-cyan-300/25 px-2 py-0.5 text-[10px] text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.12)]">
                            Mới
                          </span>
                        )}
                      </div>

                      <div className="mt-1 whitespace-pre-line text-xs text-slate-300">
                        {n.message || ""}
                      </div>

                      <div className="mt-2 text-[11px] text-slate-400">
                        {formatTimeAgo(n.createdAt)} • {n.type}
                      </div>
                    </button>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-[10px] text-slate-400">
                        {n.readAt ? "Đã đọc" : "Chưa đọc"}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteOne(n.id)}
                        className="rounded-full border border-rose-300/25 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-500/15"
                        title="Xoá thông báo"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* GỢI Ý HƯỚNG DẪN */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-300/15 bg-slate-950/70 p-4 text-sm text-slate-200 shadow-[0_0_26px_rgba(34,211,238,0.08)]">
            <h2 className="mb-2 text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-violet-200">
              Bạn có thể làm gì?
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300">
              <li>Upload bài hát mới ở trang “Upload nhạc”.</li>
              <li>Chỉnh sửa lại thông tin bài hát đã đăng.</li>
              <li>Sau này có thể tạo album, gán bài vào album, quản lý lời bài hát…</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-violet-300/20 bg-[radial-gradient(100%_80%_at_10%_10%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(90%_70%_at_90%_30%,rgba(168,85,247,0.12),transparent_55%),linear-gradient(to_bottom,rgba(2,6,23,0.5),rgba(2,6,23,0.85))] p-4 text-sm text-slate-200 shadow-[0_0_28px_rgba(168,85,247,0.10)]">
            <h2 className="mb-2 text-base font-semibold text-violet-100">
              Mẹo nhỏ
            </h2>
            <p className="text-xs text-slate-200">
              Hãy dùng cùng một <b className="text-cyan-200">audioUrl</b> dạng{" "}
              <span className="font-mono text-[11px] bg-black/40 px-1 rounded border border-cyan-300/15">
                /music/ten-bai-hat.mp3
              </span>{" "}
              để phát được trực tiếp trong player của app.
            </p>
          </div>
        </section>
      </div>

      {/* ===== Modal confirm đẹp (không dùng window.confirm) ===== */}
      {confirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => (!confirmBusy ? setConfirm(null) : null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-300/20 bg-slate-950/85 p-4 shadow-[0_0_55px_rgba(34,211,238,0.14)]">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-white">
                  {confirm.title}
                </div>
                {confirm.description && (
                  <div className="mt-1 text-xs text-slate-300">
                    {confirm.description}
                  </div>
                )}
              </div>
              <button
                className="rounded-full border border-cyan-300/20 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/60"
                onClick={() => (!confirmBusy ? setConfirm(null) : null)}
              >
                ✕
              </button>
            </div>

            <div className="relative mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-full border border-cyan-300/15 bg-slate-900/35 px-4 py-2 text-xs text-slate-200 hover:bg-slate-900/55 disabled:opacity-50"
                disabled={confirmBusy}
                onClick={() => setConfirm(null)}
              >
                Huỷ
              </button>

              <button
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50 shadow-[0_0_22px_rgba(34,211,238,0.12)]",
                  confirm.danger
                    ? "bg-rose-500/90 text-white hover:bg-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.16)]"
                    : "bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 hover:opacity-95",
                ].join(" ")}
                disabled={confirmBusy}
                onClick={async () => {
                  try {
                    setConfirmBusy(true);
                    await confirm.onConfirm();
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
              >
                {confirmBusy ? "Đang xử lý..." : confirm.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
