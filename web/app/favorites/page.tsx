// web/app/favorites/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type FavoriteItem = {
  id: string; // track id
  title: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: string | null;
  genre?: string | null;
  artist?: {
    id: string;
    name: string;
  } | null;
  favoritedAt?: string; // backend đang trả "favoritedAt" (Date)
};

function getTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function formatDuration(sec?: number | null) {
  const s = typeof sec === "number" && Number.isFinite(sec) ? sec : 0;
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function FavoritesPage() {
  const player = usePlayer();

  const [tracks, setTracks] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");

  // ===== Fetch favorites =====
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token = getTokenFromStorage();
        if (!token) {
          setError("Bạn cần đăng nhập để xem danh sách yêu thích.");
          setTracks([]);
          return;
        }

        const res = await fetch(`${API_BASE}/favorites`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            // ignore
          }
          console.error("Favorites list API error", { status: res.status, data });
          throw new Error(`Lỗi API (status ${res.status})`);
        }

        const data: FavoriteItem[] = (await res.json()) || [];
        if (!cancelled) setTracks(data);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || "Không tải được danh sách yêu thích.");
          setTracks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== Search filter =====
  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return tracks;

    return tracks.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const artist = (t.artist?.name || "").toLowerCase();
      return title.includes(keyword) || artist.includes(keyword);
    });
  }, [tracks, q]);

  // ===== Play one =====
  const playOne = (t: FavoriteItem) => {
    player.playNow({
      id: t.id,
      title: t.title,
      duration: t.duration,
      coverUrl: t.coverUrl,
      audioUrl: t.audioUrl,
      lyrics: t.lyrics ?? null,
      genre: t.genre ?? null,
      artist: t.artist ? { name: t.artist.name } : null,
    });
  };

  // ===== Play all favorites (filtered list) =====
  const playAll = () => {
    const list = filtered;
    if (!list.length) return;

    // cách tương thích với PlayerProvider hiện tại:
    // - clearQueue()
    // - playNow bài đầu để bật playing = true
    // - addToQueue các bài còn lại
    player.clearQueue();

    const first = list[0];
    player.playNow({
      id: first.id,
      title: first.title,
      duration: first.duration,
      coverUrl: first.coverUrl,
      audioUrl: first.audioUrl,
      lyrics: first.lyrics ?? null,
      genre: first.genre ?? null,
      artist: first.artist ? { name: first.artist.name } : null,
    });

    for (let i = 1; i < list.length; i++) {
      const t = list[i];
      player.addToQueue({
        id: t.id,
        title: t.title,
        duration: t.duration,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        lyrics: t.lyrics ?? null,
        genre: t.genre ?? null,
        artist: t.artist ? { name: t.artist.name } : null,
      });
    }
  };

  // ===== Remove favorite (toggle) =====
  const removeFavorite = async (trackId: string) => {
    const token = getTokenFromStorage();
    if (!token) {
      alert("Bạn cần đăng nhập lại.");
      return;
    }

    try {
      setBusyId(trackId);

      const res = await fetch(`${API_BASE}/favorites/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("remove favorite error", txt);
        alert("Xoá khỏi yêu thích thất bại.");
        return;
      }

      const data: any = await res.json().catch(() => null);

      // toggle trả { liked: false } khi xoá
      if (data && data.liked === false) {
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      } else {
        // nếu backend trả khác (vẫn ok) thì cứ remove khỏi UI cho chắc
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      }
    } catch (e) {
      console.error(e);
      alert("Có lỗi khi xoá khỏi yêu thích.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04131f] via-[#020916] to-black pb-32 text-slate-50">
      {/* Neon glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-6 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-80px] top-28 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute left-1/3 bottom-[-120px] h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(circle_at_20%_85%,rgba(99,102,241,0.10),transparent_60%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 md:pt-12">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80">
              Library
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_24px_rgba(56,189,248,0.55)] md:text-4xl">
              Yêu thích
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Những bài bạn đã nhấn tim ♥ sẽ xuất hiện ở đây.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo tên bài hát / nghệ sĩ..."
                className="w-full rounded-full border border-cyan-500/35 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60 sm:w-80"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </div>
            </div>

            <button
              onClick={playAll}
              disabled={loading || filtered.length === 0}
              className="rounded-full bg-gradient-to-r from-[#4CC3ED] via-[#22d3ee] to-[#6366f1] px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
            >
              ▶ Play all
            </button>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-sm text-cyan-200/80">
            Đang tải danh sách yêu thích...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-10 text-center text-sm text-slate-300">
            Bạn chưa có bài hát yêu thích nào.
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <>
            {/* Meta */}
            <div className="mb-3 flex items-center justify-between text-[12px] text-slate-300">
              <div>
                Tổng:{" "}
                <span className="font-semibold text-cyan-200">
                  {tracks.length}
                </span>
                {q.trim() ? (
                  <>
                    {" "}
                    • Kết quả:{" "}
                    <span className="font-semibold text-cyan-200">
                      {filtered.length}
                    </span>
                  </>
                ) : null}
              </div>

              {q.trim() && (
                <button
                  onClick={() => setQ("")}
                  className="rounded-full border border-slate-700/60 bg-slate-950/60 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900"
                >
                  Xoá tìm kiếm
                </button>
              )}
            </div>

            {/* List */}
            <div className="space-y-3">
              {filtered.map((t) => {
                const coverSrc = t.coverUrl
                  ? resolveMediaUrl(t.coverUrl)
                  : "/default-cover.jpg";

                return (
                  <div
                    key={t.id}
                    className="group flex gap-3 rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-3 shadow-[0_0_24px_rgba(56,189,248,0.10)] backdrop-blur-sm hover:border-cyan-400/40 hover:bg-slate-950/75"
                  >
                    {/* Cover */}
                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-900/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverSrc}
                        alt={t.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">
                            {t.title}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-300">
                            <span className="truncate">
                              {t.artist?.name || "Unknown Artist"}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="font-mono text-[11px] text-cyan-200/90">
                              {formatDuration(t.duration)}
                            </span>
                            {t.genre ? (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200">
                                  {t.genre}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => playOne(t)}
                            className="rounded-full bg-cyan-400/15 px-3 py-1.5 text-[12px] font-semibold text-cyan-100 hover:bg-cyan-400/25"
                            title="Phát ngay"
                          >
                            ▶ Play
                          </button>

                          <button
                            onClick={() => removeFavorite(t.id)}
                            disabled={busyId === t.id}
                            className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-60"
                            title="Xoá khỏi yêu thích"
                          >
                            {busyId === t.id ? "..." : "✕ Xoá"}
                          </button>
                        </div>
                      </div>

                      {/* subtle hint */}
                      <div className="mt-2 h-px w-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-300">
                Không tìm thấy kết quả phù hợp.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
