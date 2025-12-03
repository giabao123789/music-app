// web/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TrackCard from "../components/TrackCard";
import type { Track } from "./providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ==== TYPES ====

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
    title: "Thư viện nhạc miễn phí",
    subtitle: "Hàng trăm bài hát demo để bạn thử giao diện nghe nhạc.",
    image:
      "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 2,
    title: "Upload nhạc cho nghệ sĩ",
    subtitle:
      "Nghệ sĩ có thể đăng nhạc, chỉnh sửa thông tin và quản lý bài hát.",
    image:
      "https://images.pexels.com/photos/7026379/pexels-photo-7026379.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 3,
    title: "Playlist & yêu thích",
    subtitle: "Tạo playlist, lưu bài hát yêu thích và nghe lại bất cứ lúc nào.",
    image:
      "https://images.pexels.com/photos/164716/pexels-photo-164716.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    id: 4,
    title: "Giao diện dark mode hiện đại",
    subtitle: "Thiết kế lấy cảm hứng từ Spotify / Zing MP3.",
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
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

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
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const top12 = sortedByNew.slice(0, 12);

    return top12 as unknown as Track[];
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

    // albumMatches: hiện tại chưa fetch album riêng nên để trống,
    // sau này có dữ liệu album thì thêm vào đây.

    const merged = [...trackMatches, ...artistMatches].slice(0, 6);
    return merged;
  }, [q, tracks, artists]);

  // ===== 4 playlist hệ thống =====
  const topHitsPlaylist = homePlaylists.find(
    (p) => p.name === "Top Hits Việt Nam",
  );
  const balladPlaylist = homePlaylists.find(
    (p) => p.name === "Ballad Việt Buồn",
  );
  const rapPlaylist = homePlaylists.find((p) => p.name === "Rap Việt Bật Lửa");
  const indiePlaylist = homePlaylists.find(
    (p) => p.name === "Indie Việt Đêm Khuya",
  );

  // ⛔ tất cả hook đã được khai báo xong ở trên
  if (!mounted) return null;

  return (
    <div className="min-h-screen flex text-slate-50 bg-transparent">
      {/* ==== SIDEBAR TRÁI ==== */}
      <aside className="w-64 sidebar-gradient border-r border-white/10 px-4 py-6 space-y-6 hidden md:flex flex-col">
        <nav className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-widest text-slate-300 mb-1">
            Thư viện
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md glass font-medium"
          >
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
              Đang đăng nhập:{" "}
              <span className="font-semibold text-slate-50">{user.email}</span>
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
                placeholder="           Tìm kiếm bài hát, nghệ sĩ..."
                className="input-glass pl-10 text-sm"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-200 text-sm">
                🔍
              </span>

              {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
              {q.length > 0 && searchResults.length > 0 && (
                <div className="absolute mt-2 left-0 right-0 rounded-2xl bg-[#050816]/95 border border-white/10 shadow-2xl backdrop-blur-xl max-h-80 overflow-y-auto z-30">
                  <div className="px-3 py-2 border-b border-white/10 text-[11px] text-slate-300">
                    Kết quả cho:{" "}
                    <span className="font-semibold text-slate-100">
                      “{search}”
                    </span>
                  </div>
                  <ul className="py-1 text-sm">
                    {searchResults.map((item) => {
                      const icon =
                        item.type === "track"
                          ? "🎵"
                          : item.type === "artist"
                          ? "👤"
                          : "💿";
                      const href =
                        item.type === "artist"
                          ? `/artists/${item.id}`
                          : "#"; // sau này có trang track/album thì chỉnh tiếp

                      const content = (
                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                              {icon}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-slate-300 truncate">
                                {item.subtitle}
                              </div>
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
                          {href === "#" ? content : (
                            <Link href={href} onClick={() => setSearch("")}>
                              {content}
                            </Link>
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
            <h1 className="text-2xl font-semibold mb-2">
              Xin chào,{" "}
              <span className="text-emerald-300 text-[#4CC3ED]">
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
                <div
                  key={slide.id}
                  className="min-w-full flex flex-col md:flex-row"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full md:w-1/2 h-40 md:h-56 object-cover"
                  />
                  <div className="flex-1 p-4 md:p-6 flex flex-col justify-center bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/95">
                    <div className="text-xs uppercase tracking-widest text-[#4CC3ED] mb-1">
                      Music App
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-1">
                      {slide.title}
                    </h2>
                    <p className="text-sm text-slate-200 max-w-xl">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* nút prev/next */}
            <button
              onClick={() =>
                setCurrentSlide(
                  (currentSlide - 1 + SLIDES.length) % SLIDES.length,
                )
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

            {/* dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentSlide
                      ? "bg-emerald-400"
                      : "bg-slate-500 hover:bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </section>

          {/* ==== “Có thể bạn thích” ==== */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Có thể bạn thích</h2>

            {recommendSlides.length === 0 ? (
              <p className="text-sm text-slate-300">
                Chưa có bài hát gợi ý nào.
              </p>
            ) : (
              <div className="relative w-full overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(-${recommendSlide * 100}%)`,
                  }}
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
                          (recommendSlide - 1 + recommendSlides.length) %
                            recommendSlides.length,
                        )
                      }
                      className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 items-center justify-center text-slate-100 text-lg"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setRecommendSlide(
                          (recommendSlide + 1) % recommendSlides.length,
                        )
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
                            idx === recommendSlide
                              ? "bg-emerald-400"
                              : "bg-slate-500 hover:bg-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* ==== "Gợi ý bài hát" – dựa trên lịch sử nghe ==== */}
          <section className="space-y-3">
            <div className="flex items-center justify_between">
              <h2 className="text-lg font-semibold">Gợi ý bài hát</h2>

              {recSlides.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setRecSlide(
                        (prev) =>
                          (prev - 1 + recSlides.length) % recSlides.length,
                      )
                    }
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-xs"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() =>
                      setRecSlide((prev) => (prev + 1) % recSlides.length)
                    }
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-xs"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {recSlides.length === 0 ? (
              <p className="text-sm text-slate-300">
                Hãy nghe thử vài bài, hệ thống sẽ gợi ý dựa trên lịch sử nghe
                của bạn.
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

          {/* ==== KHU NGHỆ SĨ ==== */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {search ? "Nghệ sĩ phù hợp" : "Nghệ sĩ nổi bật"}
              </h2>
              <Link
                href="/artists"
                className="text-xs text-emerald-300 hover:underline"
              >
                Xem tất cả
              </Link>
            </div>

            {loading && artists.length === 0 ? (
              <div className="text-slate-300 text-sm">
                Đang tải danh sách nghệ sĩ...
              </div>
            ) : filteredArtists.length === 0 ? (
              <div className="text-slate-300 text-sm">
                Không tìm thấy nghệ sĩ nào.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredArtists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artists/${a.id}`}
                    className="flex flex-col items-center text-center glass rounded-xl p-3 hover:bg-white/5"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-700 mb-2 flex items-center justify-center text-xl font-bold">
                      {a.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.avatar}
                          alt={a.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        a.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="font-medium text-sm truncate w-full">
                      {a.name}
                    </div>
                    {a.displayName && (
                      <div className="text-xs text-slate-300 truncate w-full">
                        {a.displayName}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      {a.tracksCount} bài hát
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
