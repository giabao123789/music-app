"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePlayer, Track as PlayerTrack } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ArtistRow = {
  id: string;
  name: string;
  avatar?: string | null;
  tracksCount?: number | null;
  followersCount?: number | null;
};

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

async function fetchJsonTry(urls: string[], headers: Record<string, string>) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers, cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`${res.status} ${res.statusText}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Cannot fetch");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function FollowedArtistRow({
  title = "Nghệ sĩ bạn đã follow",
  subtitle = "Danh sách nghệ sĩ bạn đang theo dõi.",
  visibleDesktop = 5, // 4 hoặc 5
}: {
  title?: string;
  subtitle?: string;
  visibleDesktop?: 4 | 5;
}) {
  const { playNow, addToQueue } = usePlayer();

  const [items, setItems] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [playLoadingId, setPlayLoadingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const token = useMemo(() => getAuthToken(), []);
  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setErr(null);
      setLoading(true);

      try {
        // ✅ Ưu tiên endpoint bạn đang gọi trên FE: /artists/following
        // ✅ fallback thêm /artist/me/following (an toàn)
        const data = await fetchJsonTry(
          [
            `${API_BASE}/artists/following`,
            `${API_BASE}/artist/me/following`,
          ],
          authHeaders
        );

        if (!alive) return;

        let arr: any[] = [];
        if (Array.isArray(data)) arr = data;
        else if (Array.isArray(data?.artists)) arr = data.artists;
        else if (Array.isArray(data?.data)) arr = data.data;
        else arr = [];

        const mapped: ArtistRow[] = arr
          .map((x: any) => x?.artist ?? x)
          .filter(Boolean)
          .map((a: any) => ({
            id: String(a.id ?? a._id ?? ""),
            name: String(a.name ?? "Unknown Artist"),
            avatar: (a.avatar ?? a.image ?? a.coverUrl ?? null) as any,
            tracksCount:
              typeof a.tracksCount === "number"
                ? a.tracksCount
                : typeof a?._count?.tracks === "number"
                ? a._count.tracks
                : null,
            followersCount:
              typeof a.followersCount === "number"
                ? a.followersCount
                : typeof a?._count?.followers === "number"
                ? a._count.followers
                : null,
          }))
          .filter((a) => a.id);

        setItems(mapped);
        setPage(0);
      } catch (e: any) {
        if (!alive) return;
        setItems([]);
        setErr(
          token
            ? "Không tải được danh sách follow."
            : "Bạn cần đăng nhập để xem nghệ sĩ đã follow."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authHeaders, token]);

  const totalPages = useMemo(() => {
    if (!items.length) return 0;
    return Math.max(1, Math.ceil(items.length / Math.max(1, visibleDesktop)));
  }, [items.length, visibleDesktop]);

  const go = (next: number) => setPage(clamp(next, 0, Math.max(0, totalPages - 1)));

  // ✅ Bấm Play trên card nghệ sĩ: lấy tracks của artist rồi play track đầu
  const handlePlayArtist = async (artist: ArtistRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artist?.id) return;

    try {
      setPlayLoadingId(artist.id);

      // public endpoint artist detail (đang dùng trong app của bạn)
      const detail = await fetchJsonTry(
        [
          `${API_BASE}/artists/${artist.id}`,
          `${API_BASE}/artist/${artist.id}`,
        ],
        {}
      );

      const tracksRaw: any[] = Array.isArray(detail?.tracks) ? detail.tracks : [];
      if (!tracksRaw.length) {
        alert("Nghệ sĩ này chưa có bài hát.");
        return;
      }

      const mapped: PlayerTrack[] = tracksRaw
        .map((t: any) => ({
          id: String(t.id ?? ""),
          title: String(t.title ?? "Unknown Title"),
          duration: typeof t.duration === "number" ? t.duration : 0,
          coverUrl: String(t.coverUrl ?? artist.avatar ?? "/default-cover.jpg"),
          audioUrl: String(t.audioUrl ?? ""),
          lyrics: typeof t.lyrics === "string" ? t.lyrics : null,
          popularity: typeof t.popularity === "number" ? t.popularity : null,
          genre: t.genre ?? null,
          artist: t.artist?.name
            ? { name: t.artist.name }
            : { name: artist.name ?? null },
        }))
        .filter((t) => t.id && t.audioUrl);

      if (!mapped.length) {
        alert("Các bài hát của nghệ sĩ thiếu audioUrl hợp lệ.");
        return;
      }

      playNow(mapped[0]);
      for (let i = 1; i < mapped.length; i++) addToQueue(mapped[i]);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Không thể phát nhạc của nghệ sĩ.");
    } finally {
      setPlayLoadingId(null);
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] text-slate-300/80">{subtitle}</div>
          <h2 className="mt-1 text-[22px] font-extrabold bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page <= 0}
            className="h-9 w-9 rounded-full border border-white/15 bg-slate-950/50 text-slate-100 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Trước"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= totalPages - 1}
            className="h-9 w-9 rounded-full border border-white/15 bg-slate-950/50 text-slate-100 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Sau"
          >
            ›
          </button>

          <Link
            href="/artists"
            className="ml-2 text-[12px] text-slate-300 hover:text-cyan-300 transition"
          >
            Xem nghệ sĩ
          </Link>
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
          {err}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl">
        {loading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${visibleDesktop}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: visibleDesktop }).map((_, i) => (
              <div
                key={i}
                className="h-[210px] rounded-2xl border border-white/10 bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-200">
            Chưa follow nghệ sĩ nào.
          </div>
        ) : (
          <>
            {/* ✅ slide */}
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${page * 100}%)` }}
            >
              {Array.from({ length: totalPages }).map((_, p) => {
                const slice = items.slice(
                  p * visibleDesktop,
                  p * visibleDesktop + visibleDesktop
                );

                return (
                  <div key={p} className="min-w-full">
                    <div
                      className="grid gap-4"
                      style={{
                        gridTemplateColumns: `repeat(${visibleDesktop}, minmax(0, 1fr))`,
                      }}
                    >
                      {slice.map((a) => {
                        const avatar = a.avatar
                          ? resolveMediaUrl(a.avatar)
                          : "/default-cover.jpg";

                        return (
                          <Link
                            key={a.id}
                            href={`/artists/${a.id}`}
                            className="group relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/55 backdrop-blur-xl
                                       hover:border-cyan-300/35 hover:shadow-[0_18px_44px_rgba(0,0,0,0.75),0_0_26px_rgba(34,211,238,0.18)] transition"
                          >
                            {/* khác UI: FOLLOWING label */}
                            <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[10px] text-slate-200">
                              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                              <span className="font-semibold tracking-widest">
                                FOLLOWING
                              </span>
                            </div>

                            {/* ảnh */}
                            <div className="relative h-[130px]">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-indigo-500/10 to-purple-500/15" />
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                                <div className="absolute -inset-10 blur-2xl bg-gradient-to-r from-cyan-400/25 via-sky-400/10 to-purple-500/20" />
                              </div>

                              <div className="relative h-full w-full flex items-center justify-center">
                                <div className="h-[92px] w-[92px] rounded-2xl overflow-hidden border border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
                                  <img
                                    src={avatar}
                                    alt={a.name}
                                    className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        "/default-cover.jpg";
                                    }}
                                  />
                                </div>
                              </div>

                              {/* ✅ Play */}
                              <button
                                onClick={(e) => handlePlayArtist(a, e)}
                                className="absolute right-3 bottom-3 z-10 h-11 w-11 rounded-full
                                           border border-white/15 bg-slate-950/45 backdrop-blur
                                           shadow-[0_0_18px_rgba(34,211,238,0.18)]
                                           hover:bg-white/10 transition flex items-center justify-center"
                                title="Phát nhạc nghệ sĩ"
                              >
                                {playLoadingId === a.id ? (
                                  <span className="text-[11px] text-slate-200">
                                    ...
                                  </span>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5 fill-cyan-200"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* info */}
                            <div className="px-4 pb-4 pt-3">
                              <div className="font-semibold text-slate-50 truncate">
                                {a.name}
                              </div>
                              <div className="mt-1 text-[12px] text-slate-300">
                                {typeof a.tracksCount === "number" ? (
                                  <span className="opacity-90">
                                    {a.tracksCount} bài hát
                                  </span>
                                ) : (
                                  <span className="opacity-70">
                                    Your followed artist
                                  </span>
                                )}
                                {typeof a.followersCount === "number" && (
                                  <span className="opacity-60">
                                    {" "}
                                    • {a.followersCount.toLocaleString("vi-VN")}{" "}
                                    follow
                                  </span>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* dots */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const active = i === page;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(i)}
                      className={`h-2.5 rounded-full border transition ${
                        active
                          ? "w-7 border-cyan-300/40 bg-gradient-to-r from-cyan-400/90 via-sky-400/90 to-indigo-400/90 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
                          : "w-2.5 border-white/15 bg-white/10 hover:bg-white/20"
                      }`}
                      aria-label={`Page ${i + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* mobile 2 cột */}
      <style jsx>{`
        @media (max-width: 768px) {
          section :global(.grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}
