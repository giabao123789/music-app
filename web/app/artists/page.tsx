// web/app/artists/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ARTISTS_BG =
  "/bg-artists.jpg"; // đổi ảnh tại đây (uploads / public / link ngoài)
// Chuẩn hoá URL media
function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";

  // Nếu đã là link đầy đủ -> giữ nguyên
  if (/^https?:\/\//i.test(raw)) return raw;

  // Nếu path bắt đầu bằng "/" -> ghép API_BASE
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;

  // Còn lại -> ghép API_BASE + "/"
  return `${API_BASE}/${raw}`;
}

type ArtistItem = {
  id: string;
  name: string;
  avatar: string | null;
  tracksCount: number;
  // totalPlays?: number; // (chưa có)
};

// Lấy tên chính từ chuỗi nhiều ca sĩ
function getPrimaryName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  let s = fullName;
  if (s.includes(",")) s = s.split(",")[0];
  if (s.includes("&")) s = s.split("&")[0];
  return s.trim();
}

function isCombinedName(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.includes(",") || name.includes("&");
}

type SortKey = "TRACKS_DESC" | "AZ" | "PLAYS_DESC";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ✅ NEW: sort dropdown
  const [sortKey, setSortKey] = useState<SortKey>("TRACKS_DESC");

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

  // ✅ baseArtists: lọc nghệ sĩ ghép + SORT theo dropdown
  const baseArtists = useMemo(() => {
    const list = artists.filter((a) => !isCombinedName(a.name));

    const sorted = [...list].sort((a, b) => {
      if (sortKey === "AZ") {
        const an = getPrimaryName(a.name) || a.name || "";
        const bn = getPrimaryName(b.name) || b.name || "";
        return an.localeCompare(bn, "vi", { sensitivity: "base" });
      }

      if (sortKey === "PLAYS_DESC") {
        // ⛔ Chưa có dữ liệu lượt nghe -> tạm fallback: tracksCount
        // Khi backend có totalPlays, chỉ cần đổi thành:
        // return (b.totalPlays || 0) - (a.totalPlays || 0);
        return (b.tracksCount || 0) - (a.tracksCount || 0);
      }

      // default: tracks desc
      return (b.tracksCount || 0) - (a.tracksCount || 0);
    });

    return sorted;
  }, [artists, sortKey]);

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
    [baseArtists]
  );

  return (  
    
    <div
      className="
        min-h-screen pb-32
        bg-[radial-gradient(90%_65%_at_50%_0%,rgba(191,59,169,0.18),transparent_58%),
            radial-gradient(60%_50%_at_100%_20%,rgba(168,85,247,0.14),transparent_55%),
            radial-gradient(60%_50%_at_0%_30%,rgba(34,211,238,0.10),transparent_55%),
            linear-gradient(to_bottom,#05010a,#0b021c,#05010a)]
      "
    >
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        {/* Header */}
        <section className="mb-8 md:mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                Nghệ sĩ
              </h1>

              <p className="text-sm md:text-base text-white/65 max-w-2xl">
                Khám phá danh sách nghệ sĩ phát hành solo (The Weeknd, JENNIE…).
                Các tên kết hợp nhiều nghệ sĩ như{" "}
                <span className="text-white/75">
                  “The Weeknd, JENNIE, Lily Rose Depp”
                </span>{" "}
                sẽ được tự động ẩn để danh sách gọn và dễ tìm hơn.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 text-xs md:text-sm text-white/70">
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur">
                  {baseArtists.length} nghệ sĩ
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur">
                  {totalTracks} bài hát
                </span>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-white/55 text-xs">Sắp xếp:</span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="
                    rounded-xl
                    bg-white/5
                    border border-[#bf3ba9]/45
                    px-3 py-2
                    text-xs text-white/90
                    outline-none
                    backdrop-blur
                    focus:border-[#bf3ba9]
                    focus:ring-2 focus:ring-[#bf3ba9]/40
                    transition-all
                  "
                >
                  <option
                    value="TRACKS_DESC"
                    style={{ backgroundColor: "#12051f", color: "#fff" }}
                  >
                    Nhiều bài hát nhất
                  </option>
                  <option
                    value="AZ"
                    style={{ backgroundColor: "#12051f", color: "#fff" }}
                  >
                    A → Z
                  </option>
                 
                </select>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/70">
                🔍
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nghệ sĩ theo tên..."
                className="
                  w-full pl-9 pr-3 py-2.5 rounded-xl
                  bg-white/5 border border-white/10
                  text-sm text-white placeholder:text-white/40
                  outline-none backdrop-blur
                  focus:border-[#bf3ba9]/80 focus:ring-2 focus:ring-[#bf3ba9]/35
                  transition-all
                "
              />
            </div>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-white/70">
              <div className="h-8 w-8 rounded-full border-2 border-[#bf3ba9] border-t-transparent animate-spin" />
              <span>Đang tải danh sách nghệ sĩ...</span>
            </div>
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="py-16 text-center text-white/60">
            <p className="text-sm">
              Không tìm thấy nghệ sĩ nào cho từ khóa{" "}
              <span className="font-semibold text-white/85">“{search}”</span>.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredArtists.map((artist) => {
              const primaryName = getPrimaryName(artist.name);

              // FIX avatar: luôn đi qua resolveMediaUrl nếu là /uploads...
              const avatarSrc =
                artist.avatar &&
                (artist.avatar.startsWith("/uploads") ||
                  artist.avatar.startsWith("uploads"))
                  ? resolveMediaUrl(artist.avatar)
                  : artist.avatar || "/default-artist.jpg";

              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="
                    group
                    rounded-2xl
                    border border-white/10
                    bg-white/5
                    backdrop-blur
                    p-3
                    flex flex-col items-center text-center
                    hover:bg-white/10
                    hover:border-[#bf3ba9]/55
                    transition-all
                    shadow-sm
                    hover:shadow-lg hover:shadow-[#bf3ba9]/25
                  "
                >
                  <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden bg-black/35 border border-white/15 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc}
                      alt={primaryName || artist.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {/* glow ring */}
                    <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[#bf3ba9]/25 group-hover:ring-[#bf3ba9]/45 transition" />
                  </div>

                  <p className="text-sm md:text-[15px] font-semibold text-white line-clamp-1">
                    {primaryName || artist.name}
                  </p>
                  <p className="text-[11px] text-white/65 mt-1">
                    {artist.tracksCount} bài hát
                  </p>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
