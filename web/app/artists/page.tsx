// web/app/artists/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ArtistItem = {
  id: string;
  name: string;
  avatar: string | null;
  tracksCount: number;
};

// Lấy tên chính từ chuỗi nhiều ca sĩ (nếu còn)
function getPrimaryName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  let s = fullName;
  if (s.includes(",")) s = s.split(",")[0];
  if (s.includes("&")) s = s.split("&")[0];
  return s.trim();
}

// Kiểm tra tên có phải dạng ghép nhiều người không
function isCombinedName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.includes(",") || name.includes("&");
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchArtists() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/artist`);
        if (!res.ok) throw new Error("Failed to fetch artists");
        const data = await res.json();
        if (!cancelled) {
          setArtists(data || []);
        }
      } catch (err) {
        console.error("Error loading artists:", err);
        if (!cancelled) setArtists([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchArtists();
    return () => {
      cancelled = true;
    };
  }, []);

  // 💡 Bỏ hết những artist tên kiểu "A, B, C" hoặc có "&"
  const baseArtists = useMemo(
    () => artists.filter((a) => !isCombinedName(a.name)),
    [artists],
  );

  const filteredArtists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseArtists;

    return baseArtists.filter((a) => {
      const full = a.name?.toLowerCase() ?? "";
      const primary = getPrimaryName(a.name).toLowerCase();
      return full.includes(q) || primary.includes(q);
    });
  }, [baseArtists, search]);

  const totalTracks = useMemo(
    () => baseArtists.reduce((sum, a) => sum + (a.tracksCount || 0), 0),
    [baseArtists],
  );

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-b from-[#080013] via-[#0b021c] to-[#05010a]">
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        {/* Header */}
        <section className="mb-8 md:mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                Nghệ sĩ
              </h1>
              <p className="text-sm md:text-base text-white/60 max-w-xl">
                Trang này chỉ hiển thị nghệ sĩ riêng lẻ (The Weeknd, JENNIE…).
                Những tên ghép như &quot;The Weeknd, JENNIE, Lily Rose Depp&quot;
                sẽ được ẩn đi.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 text-xs md:text-sm text-white/60">
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  {baseArtists.length} nghệ sĩ
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  {totalTracks} bài hát
                </span>
              </div>
              <span className="text-[11px] md:text-xs">
                Dữ liệu đồng bộ từ Prisma Studio
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                🔍
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nghệ sĩ theo tên..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-violet-400/80 focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-white/60">
              <div className="h-8 w-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <span>Đang tải danh sách nghệ sĩ...</span>
            </div>
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="py-16 text-center text-white/50">
            <p className="text-sm">
              Không tìm thấy nghệ sĩ nào phù hợp với từ khóa{" "}
              <span className="font-semibold text-white/80">
                “{search}”
              </span>
              .
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredArtists.map((artist) => {
              const primaryName = getPrimaryName(artist.name);
              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="group rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col items-center text-center hover:bg-white/10 hover:border-violet-400/60 transition-all shadow-sm hover:shadow-lg hover:shadow-violet-900/40"
                >
                  <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-black/40 border border-white/20 mb-3">
                    {artist.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artist.avatar}
                        alt={primaryName || artist.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        🎤
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <p className="text-sm md:text-[15px] font-semibold text-white line-clamp-1">
                      {primaryName || artist.name}
                    </p>
                    <p className="text-[11px] text-white/60 mt-1">
                      {artist.tracksCount} bài hát
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
