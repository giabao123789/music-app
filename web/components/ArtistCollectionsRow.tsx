"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePlayer, Track as PlayerTrack } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ArtistRow = {
  id: string;
  name: string;
  avatar?: string | null;
  mainGenre?: string | null;
  followersCount?: number;
  tracksCount?: number;
  albumsCount?: number;
};

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// palette neon-ish (giữ tone xanh tím, vẫn có vài màu spotify vibe)
const PALETTE = [
  { a: "#22d3ee", b: "#a855f7" },
  { a: "#60a5fa", b: "#22d3ee" },
  { a: "#818cf8", b: "#22d3ee" },
  { a: "#fbbf24", b: "#fde047" },
  { a: "#fb7185", b: "#f97316" },
  { a: "#f472b6", b: "#a78bfa" },
];

function pickColors(index: number) {
  return PALETTE[index % PALETTE.length];
}

function pickSubtitle(a: ArtistRow) {
  if (a.mainGenre) return `The essential ${a.name} • ${a.mainGenre}`;
  if (typeof a.tracksCount === "number" && a.tracksCount > 0)
    return `The essential tracks, all in one playlist. (${a.tracksCount} tracks)`;
  return "The essential tracks, all in one playlist.";
}

export default function ArtistCollectionsRow({
  title = "Tuyển tập nhạc hay nhất của các nghệ sĩ",
  subtitle = "Tập hợp các bài hát hàng đầu của một nghệ sĩ.",
  limit = 12,
  visibleDesktop = 5, // ✅ desktop 5 card/slide (bạn muốn 4 thì đổi = 4)
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  visibleDesktop?: 4 | 5;
}) {
  const { playNow, addToQueue } = usePlayer();

  const [items, setItems] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [playLoadingId, setPlayLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/artists`, { cache: "no-store" });
        const data = res.ok ? await res.json() : [];
        if (!alive) return;

        const arr: ArtistRow[] = Array.isArray(data) ? data : [];

        // ✅ ưu tiên nghệ sĩ nhiều bài hát trước
        arr.sort((a, b) => {
          const ta = a.tracksCount ?? 0;
          const tb = b.tracksCount ?? 0;
          if (tb !== ta) return tb - ta;

          const fa = a.followersCount ?? 0;
          const fb = b.followersCount ?? 0;
          if (fb !== fa) return fb - fa;

          return String(a.name || "").localeCompare(String(b.name || ""));
        });

        setItems(arr.slice(0, Math.max(1, limit)));
        setPage(0);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [limit]);

  // pages theo desktop visible (mobile sẽ tự wrap 2 cột)
  const totalPages = useMemo(() => {
    if (!items.length) return 0;
    return Math.max(1, Math.ceil(items.length / Math.max(1, visibleDesktop)));
  }, [items.length, visibleDesktop]);

  const go = (next: number) => setPage(clamp(next, 0, Math.max(0, totalPages - 1)));

  const handlePlayArtist = async (artist: ArtistRow, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!artist?.id) return;

    try {
      setPlayLoadingId(artist.id);

      // ✅ lấy track của nghệ sĩ (public)
      const res = await fetch(`${API_BASE}/artists/${artist.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không tải được track của nghệ sĩ.");

      const data = await res.json();
      const tracksRaw: any[] = Array.isArray(data?.tracks) ? data.tracks : [];

      if (!tracksRaw.length) {
        alert("Nghệ sĩ này chưa có bài hát.");
        return;
      }

      // map sang Track type của PlayerProvider (giữ null-safe)
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
          artist: { name: artist.name ?? null, ...(t.artist ? { id: t.artist.id } : {}) } as any,
        }))
        .filter((t) => t.id && t.audioUrl);

      if (!mapped.length) {
        alert("Các bài hát của nghệ sĩ thiếu audioUrl hợp lệ.");
        return;
      }

      // ✅ play bài đầu + add các bài còn lại vào hàng chờ (không đụng PlayerProvider)
      playNow(mapped[0]);
      for (let i = 1; i < mapped.length; i++) addToQueue(mapped[i]);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Không thể phát nhạc của nghệ sĩ.");
    } finally {
      setPlayLoadingId(null);
    }
  };

  const renderSkeleton = () => {
    const count = visibleDesktop;
    return (
      <div
        className={`grid gap-5`}
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-full">
            <div className="h-[260px] rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            <div className="mt-2 h-9 rounded-lg border border-white/5 bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] text-slate-300/80">{subtitle}</div>
          <h2 className="mt-1 text-[26px] font-extrabold bg-gradient-to-r from-sky-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
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
            className="ml-2 text-[12px] text-slate-300 hover:text-sky-300 transition"
          >
            Hiện tất cả
          </Link>
        </div>
      </div>

      {/* ✅ 1 slide = 4/5 card, không kéo dài */}
      <div className="relative overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-1">{renderSkeleton()}</div>
        ) : (
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: totalPages }).map((_, p) => {
              const slice = items.slice(p * visibleDesktop, p * visibleDesktop + visibleDesktop);

              return (
                <div key={p} className="min-w-full">
                  {/* mobile: 2 cột, desktop: 4/5 cột */}
                  <div
                    className="grid gap-5"
                    style={{ gridTemplateColumns: `repeat(${visibleDesktop}, minmax(0, 1fr))` }}
                  >
                    {slice.map((a, idx) => {
                      const avatar = a.avatar ? resolveMediaUrl(a.avatar) : "/default-cover.jpg";
                      const colors = pickColors(p * visibleDesktop + idx);

                      return (
                        <div key={a.id} className="w-full">
                          <Link
                            href={`/artists/${a.id}`}
                            className="group block overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 backdrop-blur-xl
                                       hover:shadow-[0_18px_44px_rgba(0,0,0,0.75),0_0_26px_rgba(56,189,248,0.18)] transition"
                          >
                            {/* CARD */}
                            <div className="relative h-[260px]">
                              {/* header trắng */}
                              <div className="relative h-[62px] bg-white">
                                <div className="absolute left-3 top-3 h-5 w-5 rounded-full bg-black/90 flex items-center justify-center">
                                  <div className="h-2.5 w-2.5 rounded-full bg-white/95" />
                                </div>

                                <div className="h-full w-full flex items-center justify-center">
                                  <div className="text-[22px] font-extrabold tracking-[0.22em] text-black">
                                    THIS IS
                                  </div>
                                </div>
                              </div>

                              {/* ảnh + play */}
                              <div className="relative h-[138px] flex items-center justify-center">
                                <div className="absolute inset-0 bg-slate-950/60" />
                                <div
                                  className="absolute inset-0 opacity-70"
                                  style={{
                                    background: `radial-gradient(circle at 30% 20%, ${colors.a}33, transparent 60%),
                                                 radial-gradient(circle at 80% 80%, ${colors.b}2b, transparent 60%)`,
                                  }}
                                />

                                <div className="relative h-[120px] w-[120px] rounded-xl overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
                                  <img
                                    src={avatar}
                                    alt={a.name}
                                    className="h-full w-full object-cover transition duration-300 group-hover:brightness-110"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = "/default-cover.jpg";
                                    }}
                                  />
                                </div>

                                {/* ✅ Play button */}
                                <button
                                  onClick={(e) => handlePlayArtist(a, e)}
                                  className="absolute right-3 bottom-3 h-11 w-11 rounded-full
                                             border border-white/15 bg-slate-950/40 backdrop-blur
                                             shadow-[0_0_18px_rgba(56,189,248,0.25)]
                                             hover:bg-white/10 transition flex items-center justify-center"
                                  title="Phát nhạc của nghệ sĩ"
                                >
                                  {playLoadingId === a.id ? (
                                    <span className="text-[11px] text-slate-200">...</span>
                                  ) : (
                                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-sky-200">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  )}
                                </button>
                              </div>

                              {/* dải màu + tên */}
                              <div
                                className="relative h-[60px]"
                                style={{
                                  background: `linear-gradient(90deg, ${colors.a}, ${colors.b})`,
                                }}
                              >
                                <div className="absolute inset-0 opacity-20 bg-black" />
                                <div className="absolute inset-0 flex items-end px-4 pb-3">
                                  <div className="text-[18px] md:text-[20px] font-extrabold text-black truncate">
                                    {a.name}
                                  </div>
                                </div>
                              </div>

                              {/* glow */}
                              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                                <div
                                  className="absolute -inset-10 blur-2xl"
                                  style={{
                                    background: `radial-gradient(circle at 20% 20%, ${colors.a}40, transparent 60%),
                                                 radial-gradient(circle at 70% 80%, ${colors.b}36, transparent 60%)`,
                                  }}
                                />
                              </div>
                            </div>
                          </Link>

                          {/* subtitle */}
                          <div className="mt-2 text-[13px] text-slate-300 leading-snug line-clamp-2">
                            {pickSubtitle(a)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
                      ? "w-7 border-sky-300/40 bg-gradient-to-r from-sky-400/90 via-indigo-400/90 to-purple-400/90 shadow-[0_0_14px_rgba(56,189,248,0.25)]"
                      : "w-2.5 border-white/15 bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label={`Page ${i + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* mobile: tự về 2 cột cho đẹp (không kéo dài) */}
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
