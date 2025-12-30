// web/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TrackCard from "../components/TrackCard";
import type { Track } from "./providers/PlayerProvider";
import ArtistCollectionsRow from "../components/ArtistCollectionsRow";
import FollowedArtistRow from "@/components/FollowedArtistRow";
import { usePlayer } from "@/app/providers/PlayerProvider";
import DailyMixCard from "@/components/DailyMixCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

/** ✅ 1 HÀM DUY NHẤT: coverUrl từ API (/uploads/...) hoặc từ web/public (/genres/..., /music/...) */
function resolveCoverSrc(raw?: string | null) {
  if (!raw) return "/default-cover.jpg";

  // normalize windows path -> url path
  let s = String(raw).trim().replaceAll("\\", "/");

  // url ngoài
  if (/^https?:\/\//i.test(s)) return s;

  // đảm bảo có dấu /
  if (!s.startsWith("/")) s = `/${s}`;

  // cover nằm trong uploads của API
  if (s.startsWith("/uploads")) {
    // encode path để không lỗi với khoảng trắng / unicode / ( )
    return `${API_BASE}${encodeURI(s)}`;
  }

  // cover local trong web/public (vd: /covers/..., /images/..., /genres/...)
  return encodeURI(s);
}

type HomePlaylist = {
  id: string;
  name: string;
  tracks: Track[];
};

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ARTIST" | "ADMIN";
  verified: boolean;
};

type ArtistItem = {
  id: string;
  name: string;
  avatar: string | null;
  displayName: string | null;
  tracksCount: number;
};

type TrackItem = {
  id: string;
  title: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
  genre?: string | null;
  popularity?: number | null;
  artist?: {
    id: string;
    name: string;
  } | null;
};

type SearchResult = {
  type: "track" | "artist" | "album";
  id: string;
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
};

const SLIDES = [
  {
    id: 1,
    title: "Khám Phá Kho Nhạc Số Hoàn Toàn Miễn Phí",
    subtitle:
      "Tận hưởng hàng nghìn bản nhạc Demo chất lượng cao với giao diện trình phát nhạc mượt mà.",
    image:
      "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 2,
    title: "Nâng Tầm Nghệ Sĩ - Lan Tỏa Đam Mê",
    subtitle:
      "Dễ dàng đăng tải tác phẩm, tùy chỉnh thông tin và tiếp cận cộng đồng người nghe chuyên nghiệp.",

    image:
      "https://toigingiuvedep.vn/wp-content/uploads/2021/05/hinh-anh-nen-am-nhac-3d.jpg",
  },
  {
    id: 3,
    title: "Không Gian Âm Nhạc Của Riêng Bạn",
    subtitle:
      "Tự do tạo lập Playlist theo tâm trạng và lưu trữ thư viện nhạc yêu thích mọi lúc mọi nơi.",
    image:
      "https://img.lovepik.com/bg/20240328/Boosting-Creativity-Brain-Wearing-Headphones-in-3D-Music-Illustration-with_5589349_wh1200.jpg",
  },
  {
    id: 4,
    title: "Thiết Kế Tinh Tế - Trải Nghiệm Hoàn Mỹ",
    subtitle:
      "Giao diện Dark Mode thời thượng, tối ưu hóa theo phong cách của các nền tảng âm nhạc hàng đầu.",

    image:
      "https://images.pexels.com/photos/164829/pexels-photo-164829.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Playlist đề xuất từ backend
  const [homePlaylists, setHomePlaylists] = useState<HomePlaylist[]>([]);

  // Slider “Có thể bạn thích”
  const [recommendSlide, setRecommendSlide] = useState(0);
  const [recommendPaused, setRecommendPaused] = useState(false);

  // Slider gợi ý bài hát (theo lịch sử nghe)
  const [recentTracks, setRecentTracks] = useState<TrackItem[]>([]);
  const [recSlide, setRecSlide] = useState(0);
  const [recPaused, setRecPaused] = useState(false);

  // ===== Lấy user, artists, tracks =====
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const rawUser = localStorage.getItem("currentUser");
    const token = localStorage.getItem("accessToken");

    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        setUser(null);
      }
    }

    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const fetchAll = async () => {
      try {
        setLoading(true);

        const [artistsRes, tracksRes] = await Promise.all([
          fetch(`${API_BASE}/artists`),
          fetch(`${API_BASE}/tracks`, { headers }),
        ]);

        const artistsJson = await artistsRes.json();
        const tracksJson = await tracksRes.json();

        if (artistsRes.ok) setArtists(artistsJson);
        else console.error("artists error:", artistsJson);

        if (tracksRes.ok) setTracks(tracksJson);
        else console.error("tracks error:", tracksJson);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  function pickArtistIdFromTrack(t: any): string {
    return t?.artistId || t?.artist?.id || t?.artist?.artistId || "";
  }

  // ===== Lấy playlist home từ /playlists/home =====
  useEffect(() => {
    async function fetchHome() {
      try {
        const res = await fetch(`${API_BASE}/playlists/home`);
        if (!res.ok) {
          console.error("Fetch /playlists/home failed:", res.status);
          return;
        }
        const data = await res.json();
        const normalized: HomePlaylist[] = Array.isArray(data) ? data : [data];
        setHomePlaylists(normalized);
      } catch (e) {
        console.error("Fetch /playlists/home failed:", e);
      }
    }
    fetchHome();
  }, []);

  // =========================================================
  // 🔥 "CÓ THỂ BẠN THÍCH" – 12 BÀI, ƯU TIÊN BÀI MỚI UPLOAD
  // =========================================================
  const youMayLikeTracks: Track[] = useMemo(() => {
    if (!tracks.length) return [];
    const sortedByNew = [...tracks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sortedByNew.slice(0, 12) as unknown as Track[];
  }, [tracks]);

  const recommendSlides: Track[][] = useMemo(() => {
    const slides: Track[][] = [];
    for (let i = 0; i < youMayLikeTracks.length; i += 6) {
      slides.push(youMayLikeTracks.slice(i, i + 6));
    }
    return slides;
  }, [youMayLikeTracks]);

  useEffect(() => {
    if (recommendSlides.length <= 1 || recommendPaused) return;
    const timer = setInterval(() => {
      setRecommendSlide((prev) => (prev + 1) % recommendSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [recommendSlides.length, recommendPaused]);

  // ===== Mapping lịch sử nghe gần đây (mp:recent) -> TrackItem =====
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tracks.length) return;

    try {
      const raw = localStorage.getItem("mp:recent");
      if (!raw) return;

      const ids: string[] = JSON.parse(raw);
      if (!Array.isArray(ids)) return;

      const map = new Map(tracks.map((t) => [t.id, t]));
      const ordered: TrackItem[] = ids
        .map((id) => map.get(id))
        .filter(Boolean) as TrackItem[];

      setRecentTracks(ordered);
    } catch (e) {
      console.error("parse mp:recent failed", e);
    }
  }, [tracks]);

  // ===== auto slide banner trên cùng =====
  useEffect(() => {
    if (SLIDES.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ===== Tính slide cho "Gợi ý bài hát" – dựa trên lịch sử nghe =====
  const recSlides = useMemo(() => {
    const base = (recentTracks.length ? recentTracks : tracks).slice(0, 24);
    if (!base.length) return [];

    const shuffled = [...base];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const groups: TrackItem[][] = [];
    for (let i = 0; i < shuffled.length; i += 3) {
      groups.push(shuffled.slice(i, i + 3));
    }
    return groups;
  }, [recentTracks, tracks]);

  useEffect(() => {
    if (recSlides.length <= 1 || recPaused) return;
    const timer = setInterval(() => {
      setRecSlide((prev) => (prev + 1) % recSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [recSlides.length, recPaused]);

  // ====== SEARCH LOGIC (không dùng hook sau return) ======
  const q = search.trim().toLowerCase();

  const filteredArtists =
    q.length === 0
      ? artists.slice(0, 6)
      : artists.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.displayName || "").toLowerCase().includes(q),
        );

  const searchResults: SearchResult[] = useMemo(() => {
    if (!q) return [];

    const trackMatches: SearchResult[] = tracks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 6)
      .map((t) => ({
        type: "track",
        id: t.id,
        title: t.title,
        subtitle: t.artist?.name ?? "Bài hát",
        coverUrl: t.coverUrl,
      }));

    const artistMatches: SearchResult[] = artists
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.displayName || "").toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map((a) => ({
        type: "artist",
        id: a.id,
        title: a.name,
        subtitle: a.displayName || "Nghệ sĩ",
        coverUrl: a.avatar,
      }));

    return [...trackMatches, ...artistMatches].slice(0, 6);
  }, [q, tracks, artists]);

  // ===== 4 playlist hệ thống =====
  const topHitsPlaylist = homePlaylists.find((p) => p.name === "Top Hits Việt Nam");
  const balladPlaylist = homePlaylists.find((p) => p.name === "Ballad Việt Buồn");
  const rapPlaylist = homePlaylists.find((p) => p.name === "Rap Việt Bật Lửa");
  const indiePlaylist = homePlaylists.find((p) => p.name === "Indie Việt Đêm Khuya");

  // =========================================================
  // 🎧 PLAYLIST GỢI Ý THEO GENRE
  // =========================================================
  const GENRE_META = [
    { key: "POP", label: "Pop", image: "/genres/POP.jpg" },
    { key: "RNB", label: "R&B", image: "/genres/RNB.jpg" },
    { key: "INDIE", label: "Indie", image: "/genres/INDIE.jpg" },
    { key: "EDM", label: "EDM", image: "/genres/EDM.jpg" },
    { key: "RAP", label: "Rap", image: "/genres/RAP.jpg" },
    { key: "BALLAD", label: "Ballad", image: "/genres/BALLAD.jpg" },
  ] as const;

  const [genreTab, setGenreTab] = useState<(typeof GENRE_META)[number]["key"]>("POP");

  const normalizeGenreKey = (g: any): string => String(g || "").toUpperCase().trim();

  const genreBuckets = useMemo(() => {
    const map = new Map<string, TrackItem[]>();
    for (const g of GENRE_META) map.set(g.key, []);

    for (const t of tracks) {
      const key = normalizeGenreKey((t as any).genre);
      if (!map.has(key)) continue;
      map.get(key)!.push(t);
    }

    for (const g of GENRE_META) {
      const arr = map.get(g.key)!;
      arr.sort((a, b) => {
        const pa = typeof (a as any).popularity === "number" ? (a as any).popularity : 0;
        const pb = typeof (b as any).popularity === "number" ? (b as any).popularity : 0;
        if (pb !== pa) return pb - pa;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      map.set(g.key, arr);
    }

    return map;
  }, [tracks]);

  const genreTracksToShow: TrackItem[] = useMemo(() => {
    const list = genreBuckets.get(genreTab) || [];
    return list.slice(0, 12);
  }, [genreBuckets, genreTab]);

  const genreSlides: TrackItem[][] = useMemo(() => {
    const slides: TrackItem[][] = [];
    for (let i = 0; i < genreTracksToShow.length; i += 6) {
      slides.push(genreTracksToShow.slice(i, i + 6));
    }
    return slides;
  }, [genreTracksToShow]);

  const [genreSlide, setGenreSlide] = useState(0);
  const { playNow, addToQueue } = usePlayer();

  // ✅ FIX: define playFromSearch (đang bị gọi nhưng chưa khai báo)
  const playFromSearch = (item: SearchResult) => {
    if (!item || item.type !== "track") return;

    const t = tracks.find((x) => x.id === item.id);
    if (!t) {
      console.warn("[SEARCH] Track not found:", item.id);
      return;
    }

    playNow(t as any);
    setSearch(""); // đóng dropdown
  };

  const [openGenre, setOpenGenre] = useState<string | null>(null);

  const pickMosaic = (list: TrackItem[], n: number) => {
    const out: TrackItem[] = [];
    for (let i = 0; i < list.length && out.length < n; i++) out.push(list[i]);
    while (out.length < n) out.push(list[out.length - 1] || (list[0] as any));
    return out.filter(Boolean);
  };

  const handlePlayGenre = (genreKey: string) => {
    const list = (genreBuckets.get(genreKey) || []).slice(0, 30);
    if (!list.length) return;

    list.forEach((t) => addToQueue(t as any));
    playNow(list[0] as any);
  };

  useEffect(() => {
    setGenreSlide(0);
  }, [genreTab]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex text-slate-50 bg-transparent">
      {/* ==== SIDEBAR TRÁI ==== */}
      <aside className="w-64 sidebar-gradient border-r border-white/10 px-4 py-6 space-y-6 hidden md:flex flex-col">
        <nav className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-widest text-slate-300 mb-1">Thư viện</div>
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md glass font-medium">
            <span>Khám phá</span>
          </Link>
          <Link
            href="/favorites"
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-slate-100/80"
          >
            <span>Yêu thích</span>
          </Link>
          <Link
            href="/playlists"
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-slate-100/80"
          >
            <span>Playlist</span>
          </Link>
          <Link
            href="/artists"
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 text-slate-100/80"
          >
            <span>Nghệ sĩ</span>
          </Link>
        </nav>

        <div className="border-t border-white/10 pt-4 mt-auto text-xs text-slate-200/70">
          {user ? (
            <div>
              Đang đăng nhập: <span className="font-semibold text-slate-50">{user.email}</span>
            </div>
          ) : (
            <div>Hãy đăng nhập để lưu playlist, yêu thích...</div>
          )}
        </div>
      </aside>

      {/* ==== MAIN CONTENT ==== */}
      <main className="flex-1 flex flex-col bg-transparent">
        {/* Thanh tìm kiếm trên cùng */}
        <header className="px-4 md:px-8 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="           🔍Tìm kiếm bài hát, nghệ sĩ..."
                className="input-glass pl-10 text-sm"
              />

              {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
              {q.length > 0 && searchResults.length > 0 && (
                <div className="absolute mt-2 left-0 right-0 rounded-2xl bg-[#050816]/95 border border-white/10 shadow-2xl backdrop-blur-xl max-h-80 overflow-y-auto z-30">
                  <div className="px-3 py-2 border-b border-white/10 text-[11px] text-slate-300">
                    Kết quả cho:{" "}
                    <span className="font-semibold text-slate-100">“{search}”</span>
                  </div>

                  <ul className="py-1 text-sm">
                    {searchResults.map((item) => {
                      const icon =
                        item.type === "track" ? "🎵" : item.type === "artist" ? "👤" : "💿";

                      const href = item.type === "artist" ? `/artists/${item.id}` : "#";

                      const content = (
                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer">
                          {item.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveCoverSrc(item.coverUrl)}
                              alt={item.title || "cover"}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "/default-cover.jpg";
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                              {icon}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-[11px] text-slate-300 truncate">{item.subtitle}</div>
                            )}
                          </div>

                          <div className="text-[10px] uppercase tracking-wide text-slate-400">
                            {item.type === "track"
                              ? "Bài hát"
                              : item.type === "artist"
                              ? "Nghệ sĩ"
                              : "Album"}
                          </div>
                        </div>
                      );

                      return (
                        <li key={`${item.type}-${item.id}`}>
                          {item.type === "artist" ? (
                            <Link href={`/artists/${item.id}`} onClick={() => setSearch("")}>
                              {content}
                            </Link>
                          ) : item.type === "track" ? (
                            <button
                              type="button"
                              onClick={() => playFromSearch(item)}
                              className="w-full text-left"
                            >
                              {content}
                            </button>
                          ) : (
                            // album (nếu bạn chưa có route album) thì giữ nguyên như cũ: không làm gì
                            content
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Nội dung chính */}
        <div className="flex-1 px-4 md:px-8 py-6 space-y-8 overflow-y-auto">
          {/* Chào user */}
          {user && (
            <h1 className="mb-2 text-2xl font-semibold text-slate-100">
              Xin chào,{" "}
              <span className="font-bold text-[#4CC9ED] drop-shadow-[0_0_10px_rgba(76,201,237,0.6)]">
                {user.name || user.email}
              </span>
            </h1>
          )}

          {/* ==== BANNER SLIDER ==== */}
          <section className="relative w-full overflow-hidden rounded-2xl glass">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {SLIDES.map((slide) => (
                <div key={slide.id} className="min-w-full flex flex-col md:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full md:w-1/2 h-40 md:h-56 object-cover"
                  />
                  <div className="flex-1 p-4 md:p-6 flex flex-col justify-center bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/95">
                    <div className="text-xs uppercase tracking-widest text-[#4CC3ED] mb-1">
                      Music Website
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-1">{slide.title}</h2>
                    <p className="text-sm text-slate-200 max-w-xl">{slide.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length)
              }
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-slate-100 text-lg"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrentSlide((currentSlide + 1) % SLIDES.length)}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-slate-100 text-lg"
            >
              ›
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentSlide ? "bg-[#4CC3ED]" : "bg-slate-500 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </section>

          {/* ==== “Có thể bạn thích” ==== */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Có thể bạn thích</h2>

            {recommendSlides.length === 0 ? (
              <p className="text-sm text-slate-300">Chưa có bài hát gợi ý nào.</p>
            ) : (
              <div className="relative w-full overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${recommendSlide * 100}%)` }}
                >
                  {recommendSlides.map((group, idx) => (
                    <div key={idx} className="min-w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.map((t) => (
                          <TrackCard
                            key={t.id}
                            track={t}
                            onHoverStart={() => setRecommendPaused(true)}
                            onHoverEnd={() => setRecommendPaused(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {recommendSlides.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setRecommendSlide(
                          (recommendSlide - 1 + recommendSlides.length) % recommendSlides.length,
                        )
                      }
                      className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-slate-100 text-lg"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setRecommendSlide((recommendSlide + 1) % recommendSlides.length)
                      }
                      className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-slate-100 text-lg"
                    >
                      ›
                    </button>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                      {recommendSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setRecommendSlide(idx)}
                          className={`w-2 h-2 rounded-full ${
                            idx === recommendSlide ? "bg-[#4CC3ED]" : "bg-slate-500 hover:bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ==== "Gợi ý bài hát" ==== */}
          <section className="space-y-3">
            <div className="flex items-center justify_between">
              <h2 className="text-lg font-semibold">Đã nghe gần đây</h2>

              {recSlides.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setRecSlide((prev) => (prev - 1 + recSlides.length) % recSlides.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-xs"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setRecSlide((prev) => (prev + 1) % recSlides.length)}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-xs"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {recSlides.length === 0 ? (
              <p className="text-sm text-slate-300">
                Hãy nghe thử vài bài, hệ thống sẽ gợi ý dựa trên lịch sử nghe của bạn.
              </p>
            ) : (
              <div className="relative overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${recSlide * 100}%)` }}
                >
                  {recSlides.map((group, idx) => (
                    <div
                      key={idx}
                      className="min-w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {group.map((t) => (
                        <TrackCard
                          key={t.id}
                          track={t as any}
                          onHoverStart={() => setRecPaused(true)}
                          onHoverEnd={() => setRecPaused(false)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="mt-8">
            <DailyMixCard />
          </section>

          {/* ============================
              🔥 TOP NGHE NHIỀU NHẤT
          ============================ */}
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">🔥 Bài hát được nghe nhiều nhất</h2>
                <p className="text-xs text-slate-300">Xếp hạng dựa trên tổng lượt nghe</p>
              </div>
            </div>

            <div className="space-y-2">
              {[...(tracks ?? [])]
                .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
                .slice(0, 10)
                .map((track, idx) => {
                  const artistId = pickArtistIdFromTrack(track as any);
                  const artistName = (track as any)?.artist?.name ?? "Unknown Artist";
                  const rank = idx + 1;

                  return (
                    <div
                      key={track.id}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3 border border-white/10 ${
                        rank <= 3
                          ? "bg-gradient-to-r from-fuchsia-600/30 via-purple-600/25 to-indigo-600/30 shadow-lg"
                          : "bg-slate-900/60"
                      }`}
                    >
                      <div
                        className={`w-8 text-center text-lg font-extrabold ${
                          rank === 1
                            ? "text-yellow-400"
                            : rank === 2
                            ? "text-slate-300"
                            : rank === 3
                            ? "text-orange-400"
                            : "text-slate-500"
                        }`}
                      >
                        #{rank}
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveCoverSrc((track as any)?.coverUrl)}
                        className="h-12 w-12 rounded-lg object-cover"
                        alt={track.title || "cover"}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/default-cover.jpg";
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        {artistId ? (
                          <Link
                            href={`/artists/${artistId}`}
                            className="block truncate font-medium text-white hover:text-sky-300 transition"
                            title={track.title}
                          >
                            {track.title}
                          </Link>
                        ) : (
                          <div className="truncate font-medium text-white">{track.title}</div>
                        )}

                        {artistId ? (
                          <Link
                            href={`/artists/${artistId}`}
                            className="block truncate text-xs text-slate-300 hover:text-indigo-300 transition"
                            title={artistName}
                          >
                            {artistName}
                          </Link>
                        ) : (
                          <div className="truncate text-xs text-slate-300">{artistName}</div>
                        )}
                      </div>

                      <div className="hidden sm:flex items-center gap-1 text-xs text-sky-300">
                        👂 {track.popularity ?? 0}
                      </div>

                      <button
                        onClick={() => playNow(track as any)}
                        className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-900 font-bold hover:scale-105 transition"
                      >
                        ▶
                      </button>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ==== PLAYLIST THEO THỂ LOẠI ==== */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <h2 className="mt-1 text-lg font-semibold">
                  Playlist gợi ý theo <span className="text-[#4CC9ED]">thể loại</span>
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {GENRE_META.map((g) => {
                  const active = genreTab === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setGenreTab(g.key)}
                      className={`h-8 px-3 rounded-full text-xs border transition ${
                        active
                          ? "border-sky-400/50 bg-sky-500/15 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.18)]"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {GENRE_META.map((g) => {
                const list = genreBuckets.get(g.key) || [];
                const top = list.slice(0, 50);
                const mosaic = pickMosaic(top, 4);
                const count = top.length;
                const isOpen = openGenre === g.key;

                return (
                  <div
                    key={g.key}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 backdrop-blur-xl
                               shadow-[0_0_40px_rgba(56,189,248,0.10)] hover:shadow-[0_0_55px_rgba(124,58,237,0.18)]
                               transition"
                  >
                    <div
                      className="pointer-events-none absolute -inset-20 opacity-40 blur-3xl"
                      style={{
                        background:
                          "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(124,58,237,0.35), transparent 55%)",
                      }}
                    />

                    <div className="relative p-4 flex gap-4">
                      <div className="shrink-0 w-[92px] h-[92px] rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.image}
                          alt={g.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/default-cover.jpg";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.35em] text-slate-300/80">
                              PLAYLIST
                            </div>
                            <div className="mt-1 text-base font-semibold truncate">{g.label} Mix</div>
                            <div className="mt-1 text-xs text-slate-300/80">
                              {count
                                ? `Top ${Math.min(50, count)} bài ${g.label.toLowerCase()} hot nhất`
                                : "Chưa có bài nào trong thể loại này"}
                            </div>
                          </div>

                          <span className="text-[11px] px-2 py-1 rounded-full border border-sky-400/25 bg-slate-950/40 text-sky-200">
                            {count} bài
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handlePlayGenre(g.key)}
                            disabled={!count}
                            className="h-9 px-4 rounded-full text-sm font-semibold text-slate-950
                                       bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500
                                       shadow-lg shadow-sky-500/25 hover:brightness-110 transition
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ▶ Play
                          </button>
                        </div>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="relative border-t border-white/10 p-4 bg-slate-950/25">
                        {top.length ? (
                          <div className="space-y-3">
                            {top.slice(0, 8).map((t) => (
                              <TrackCard key={t.id} track={t as any} />
                            ))}
                            {top.length > 8 && (
                              <div className="text-xs text-slate-300/80">+{top.length - 8} bài nữa…</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-300">Chưa có bài nào trong {g.label}.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ==== 4 PLAYLIST HỆ THỐNG ==== */}
          {topHitsPlaylist && topHitsPlaylist.tracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Top Hits Việt Nam</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topHitsPlaylist.tracks.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </section>
          )}

          {balladPlaylist && balladPlaylist.tracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Ballad Việt Buồn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {balladPlaylist.tracks.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </section>
          )}

          {rapPlaylist && rapPlaylist.tracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Rap Việt Bật Lửa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rapPlaylist.tracks.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </section>
          )}

          {indiePlaylist && indiePlaylist.tracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Indie Việt Đêm Khuya</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {indiePlaylist.tracks.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            </section>
          )}

          <ArtistCollectionsRow limit={12} visible={4} />
          <FollowedArtistRow visibleDesktop={5} />
        </div>
      </main>
    </div>
  );
}
