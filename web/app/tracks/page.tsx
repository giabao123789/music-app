// web/app/tracks/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Chuẩn hoá URL media
function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

// format duration
function formatDuration(sec?: number | null) {
  const s = Number(sec ?? 0) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

type TrackItem = {
  id: string;
  title: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  popularity?: number; // lượt nghe
  createdAt?: string | null;

  artist?: {
    id: string;
    name: string;
  } | null;
};

type SortKey = "PLAYS_DESC" | "NEWEST" | "AZ";

export default function TracksPage() {
  const player = usePlayer();

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("PLAYS_DESC");

  useEffect(() => {
    let cancelled = false;

    async function fetchTracks() {
      try {
        setLoading(true);

        // ✅ endpoint phổ biến: /tracks
        // Nếu backend bạn dùng endpoint khác, đổi tại đây (vd: /track, /music, /tracks/public ...)
        const res = await fetch(`${API_BASE}/tracks`, { cache: "no-store" });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("[TracksPage] fetch /tracks failed", res.status, text);
          if (!cancelled) setTracks([]);
          return;
        }

        const data = await res.json();

        // hỗ trợ cả dạng array và dạng {items:[]}
        const items: TrackItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];

        if (!cancelled) setTracks(items);
      } catch (e) {
        console.error("[TracksPage] fetch error", e);
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTracks();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ play track (KHÔNG mở tab mới)
  const playOne = (t: TrackItem) => {
    if (!player) return;

    const normalizedTrack = {
      id: t.id,
      title: t.title,
      duration: t.duration,
      coverUrl: t.coverUrl,
      audioUrl: t.audioUrl,
      popularity: t.popularity ?? 0,
      artist: t.artist ? { name: t.artist.name } : null,
    };

    // ưu tiên đúng API của PlayerProvider bạn đang dùng
    if (typeof (player as any).setQueue === "function") {
      (player as any).setQueue([normalizedTrack]);
    }
    if (typeof (player as any).setCurrentTrack === "function") {
      (player as any).setCurrentTrack(normalizedTrack);
    } else if (typeof (player as any).playTrack === "function") {
      (player as any).playTrack(normalizedTrack);
    }
    if (typeof (player as any).setIsPlaying === "function") {
      (player as any).setIsPlaying(true);
    } else if (typeof (player as any).setPlaying === "function") {
      (player as any).setPlaying(true);
    }
  };

  const baseTracks = useMemo(() => {
    const list = [...tracks];

    // sort
    list.sort((a, b) => {
      if (sortKey === "AZ") {
        return (a.title || "").localeCompare(b.title || "", "vi", {
          sensitivity: "base",
        });
      }

      if (sortKey === "NEWEST") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }

      // PLAYS_DESC
      return (b.popularity || 0) - (a.popularity || 0);
    });

    return list;
  }, [tracks, sortKey]);

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseTracks;

    return baseTracks.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const artist = (t.artist?.name || "").toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [baseTracks, search]);

  const totalTracks = baseTracks.length;

  const totalDuration = useMemo(
    () => baseTracks.reduce((sum, t) => sum + (Number(t.duration) || 0), 0),
    [baseTracks]
  );

  const totalDurationText = useMemo(() => {
    const sec = totalDuration || 0;
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m} phút ${r}s`;
  }, [totalDuration]);

  const totalPlays = useMemo(
    () => baseTracks.reduce((sum, t) => sum + (Number(t.popularity) || 0), 0),
    [baseTracks]
  );

  return (
    <div className="min-h-screen pb-32 px-4">
      {/* ✅ nền gradient hồng + có chỗ chèn background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(191,59,169,0.25), transparent 60%)," +
            "radial-gradient(60% 50% at 100% 20%, rgba(255,79,216,0.18), transparent 55%)," +
            "radial-gradient(60% 50% at 0% 30%, rgba(236,72,153,0.12), transparent 55%)," +
            "linear-gradient(to bottom, #120015, #0b021c, #05010a)",
        }}
      />

      {/* Nếu bạn muốn chèn background ảnh, bật đoạn này và thay url */}
      {/* <div
        className="fixed inset-0 -z-20 opacity-20"
        style={{
          backgroundImage: "url(/bg-pink.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      /> */}

      <div className="max-w-6xl mx-auto pt-8 md:pt-12">
        {/* Header */}
        <section className="mb-8 md:mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                Bài hát
              </h1>

              <p className="text-sm md:text-base text-white/60 max-w-2xl">
                Danh sách toàn bộ bài hát trong hệ thống. Bạn có thể tìm kiếm theo
                tên bài hoặc nghệ sĩ, và sắp xếp theo lượt nghe / mới nhất / A-Z.
              </p>

              {/* Search */}
              <div className="mt-6">
                <div className="relative max-w-xl">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-80">
                    🔎
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm bài hát hoặc nghệ sĩ..."
                    className="
                      w-full pl-9 pr-3 py-2.5 rounded-xl
                      bg-white/5 backdrop-blur-xl
                      border border-pink-400/20
                      text-sm text-white placeholder:text-white/35
                      outline-none
                      focus:border-[#bf3ba9]/80 focus:ring-2 focus:ring-[#bf3ba9]/35
                      transition-all
                    "
                  />
                </div>
              </div>
            </div>

            {/* Stats + Sort */}
            <div className="flex flex-col md:items-end gap-3">
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs">
                  {totalTracks} bài hát
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs">
                  Tổng thời lượng ~ {totalDurationText}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#bf3ba9]/10 border border-[#bf3ba9]/25 text-pink-200 text-xs shadow-[0_0_18px_rgba(191,59,169,0.18)]">
                  🔥 {totalPlays.toLocaleString("vi-VN")} lượt nghe
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">Sắp xếp:</span>
               <select
  value={sortKey}
  onChange={(e) => setSortKey(e.target.value as SortKey)}
  className="
    rounded-xl
    bg-[#2a0f3f]           /* nền tím đậm */
    border border-[#bf3ba9]/50
    px-3 py-2
    text-xs text-white
    outline-none
    focus:border-[#bf3ba9]
    focus:ring-2 focus:ring-[#bf3ba9]/40
    transition-all
  "
>
                  <option value="PLAYS_DESC">Lượt nghe nhiều nhất</option>
                  <option value="NEWEST">Mới nhất</option>
                  <option value="AZ">A → Z</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-white/60">
              <div className="h-8 w-8 rounded-full border-2 border-[#bf3ba9] border-t-transparent animate-spin" />
              <span>Đang tải danh sách bài hát...</span>
            </div>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="py-16 text-center text-white/50">
            <p className="text-sm">
              Không tìm thấy bài hát nào cho từ khóa{" "}
              <span className="font-semibold text-white/80">“{search}”</span>.
            </p>
          </div>
        ) : (
          <section
            className="
              grid gap-5
              grid-cols-2
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
            "
          >
            {filteredTracks.map((t) => {
              const coverSrc = t.coverUrl
                ? resolveMediaUrl(t.coverUrl)
                : "/default-cover.jpg";

              const plays = Number(t.popularity || 0);

              return (
                <div
                  key={t.id}
                  className="
                    group rounded-2xl overflow-hidden
                    bg-white/5 backdrop-blur-xl
                    border border-pink-400/20
                    hover:bg-white/10 hover:border-[#bf3ba9]/60
                    transition-all
                    shadow-[0_0_30px_rgba(191,59,169,0.14)]
                  "
                >
                  {/* ✅ bấm ảnh = play */}
                  <button
                    type="button"
                    onClick={() => playOne(t)}
                    className="relative w-full aspect-square overflow-hidden"
                    title="Bấm để phát"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverSrc}
                      alt={t.title}
                      className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                    />

                    {/* plays badge */}
                    <div className="absolute top-2 right-2 rounded-full px-2 py-1 text-[11px] bg-[#bf3ba9]/35 border border-[#bf3ba9]/40 text-white shadow-[0_0_14px_rgba(191,59,169,0.25)]">
                      🔥 {plays.toLocaleString("vi-VN")}
                    </div>

                    {/* duration */}
                    <div className="absolute bottom-2 right-2 rounded-full px-2 py-1 text-[11px] bg-black/45 border border-white/10 text-white/90">
                      {formatDuration(t.duration)}
                    </div>

                    {/* hover play overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-[#bf3ba9]/70 border border-white/20 flex items-center justify-center shadow-[0_0_24px_rgba(191,59,169,0.45)]">
                        <span className="text-white text-lg">▶</span>
                      </div>
                    </div>
                  </button>

                  <div className="p-3">
                    <div className="text-sm font-semibold text-white line-clamp-1">
                      {t.title}
                    </div>

                    {/* ✅ bấm tên nghệ sĩ = vào trang nghệ sĩ */}
                    {t.artist?.id ? (
                      <Link
                        href={`/artists/${t.artist.id}`}
                        className="mt-1 block text-[12px] text-white/60 hover:text-[#bf3ba9] transition-colors line-clamp-1"
                        title="Bấm để vào trang nghệ sĩ"
                      >
                        {t.artist?.name || "Nghệ sĩ"}
                      </Link>
                    ) : (
                      <div className="mt-1 text-[12px] text-white/50 line-clamp-1">
                        Nghệ sĩ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
