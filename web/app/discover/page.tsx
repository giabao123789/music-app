"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";
import TrackCard from "@/components/TrackCard";
import { usePlayer, type Track as PlayerTrack } from "@/app/providers/PlayerProvider";

type ArtistItem = {
  id: string;
  name: string;
  avatar: string | null;
  tracksCount?: number;
  albumsCount?: number;
};

type RawTrack = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl?: string | null;
  duration?: number | null;
  artist?: { id: string; name: string | null } | null;
};

function mapToPlayerTrack(t: RawTrack): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    duration: t.duration ?? 0,
    coverUrl: t.coverUrl ? `${API_BASE}${t.coverUrl}` : "/default-cover.jpg",
    audioUrl: t.audioUrl ? `${API_BASE}${t.audioUrl}` : "",
    artist: { name: t.artist?.name ?? null },
  };
}

export default function DiscoverPage() {
  const router = useRouter();
  const { playNow, setQueue } = usePlayer();

  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [trendingTracks, setTrendingTracks] = useState<RawTrack[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [searchTracks, setSearchTracks] = useState<RawTrack[]>([]);
  const [searchArtists, setSearchArtists] = useState<ArtistItem[]>([]);

  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ========== FETCH TRENDING ========== */
  useEffect(() => {
    let cancelled = false;

    async function fetchTrending() {
      try {
        setTrendingLoading(true);
        setErrorMsg(null);

        // 1. thử /tracks/trending
        let res = await fetch(`${API_BASE}/tracks/trending`);

        // nếu 404 thì thử fallback /tracks
        if (!res.ok && res.status === 404) {
          res = await fetch(`${API_BASE}/tracks`);
        }

        if (!res.ok) {
          throw new Error("Không thể tải danh sách trending.");
        }

        const json = await res.json();
        if (cancelled) return;

        const list: RawTrack[] = (json || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          audioUrl: t.audioUrl,
          coverUrl: t.coverUrl,
          duration: t.duration,
          artist: t.artist
            ? { id: t.artist.id, name: t.artist.name }
            : null,
        }));

        setTrendingTracks(list);
      } catch (e) {
        console.error("fetchTrending error", e);
        if (!cancelled) {
          setErrorMsg("Không thể tải danh sách nhạc nổi bật.");
        }
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    }

    fetchTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ========== FETCH ARTISTS ========== */
  useEffect(() => {
    let cancelled = false;

    async function fetchArtists() {
      try {
        setArtistsLoading(true);
        const res = await fetch(`${API_BASE}/artist`);
        if (!res.ok) throw new Error();

        const json = await res.json();
        if (cancelled) return;

        const list: ArtistItem[] = (json || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          avatar: a.avatar ?? null,
          tracksCount: a.tracksCount ?? a._count?.tracks ?? 0,
          albumsCount: a.albumsCount ?? a._count?.albums ?? 0,
        }));

        setArtists(list);
      } catch (e) {
        console.error("fetchArtists error", e);
      } finally {
        if (!cancelled) setArtistsLoading(false);
      }
    }

    fetchArtists();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ========== SEARCH HANDLER ========== */
  const performSearch = async () => {
    const q = search.trim();
    if (!q) {
      setSearchTracks([]);
      setSearchArtists([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setErrorMsg(null);

    try {
      // ----- SEARCH TRACKS -----
      async function searchTracksCall() {
        // ưu tiên /tracks/search?q=...
        let res = await fetch(
          `${API_BASE}/tracks/search?q=${encodeURIComponent(q)}`
        );

        // fallback /tracks?search=...
        if (!res.ok && res.status === 404) {
          res = await fetch(
            `${API_BASE}/tracks?search=${encodeURIComponent(q)}`
          );
        }

        if (!res.ok) {
          console.error("search tracks error status", res.status);
          return;
        }

        const json = await res.json();
        if (cancelled) return;

        const list: RawTrack[] = (json || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          audioUrl: t.audioUrl,
          coverUrl: t.coverUrl,
          duration: t.duration,
          artist: t.artist
            ? { id: t.artist.id, name: t.artist.name }
            : null,
        }));

        setSearchTracks(list);
      }

      // ----- SEARCH ARTISTS -----
      async function searchArtistsCall() {
        // nếu backend bạn hỗ trợ query ?search= thì nó sẽ match
        const res = await fetch(
          `${API_BASE}/artist?search=${encodeURIComponent(q)}`
        );

        if (!res.ok) {
          console.error("search artists error status", res.status);
          return;
        }

        const json = await res.json();
        if (cancelled) return;

        const list: ArtistItem[] = (json || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          avatar: a.avatar ?? null,
          tracksCount: a.tracksCount ?? a._count?.tracks ?? 0,
          albumsCount: a.albumsCount ?? a._count?.albums ?? 0,
        }));

        setSearchArtists(list);
      }

      await Promise.all([searchTracksCall(), searchArtistsCall()]);
    } catch (e) {
      console.error("performSearch error", e);
      if (!cancelled) {
        setErrorMsg("Không thể tìm kiếm. Thử lại sau nhé.");
      }
    } finally {
      if (!cancelled) setIsSearching(false);
    }

    return () => {
      cancelled = true;
    };
  };

  const handlePlayTrack = (track: RawTrack, list: RawTrack[]) => {
    const queue = list.map(mapToPlayerTrack);
    const first = queue.find((t) => t.id === track.id) ?? queue[0];
    setQueue(queue);
    playNow(first);
  };

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-b from-[#061c2c] via-[#020918] to-black text-slate-50">
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute right-0 top-52 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 pb-24">
        {/* HEADER + SEARCH BAR */}
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-cyan-300/80">
              Discover
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_0_24px_rgba(56,189,248,0.8)]">
              Khám phá nhạc mới
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Tìm kiếm bài hát, nghệ sĩ và nghe ngay những bản nhạc nổi bật.
            </p>
          </div>

          <div className="w-full md:w-[320px]">
            <div className="flex items-center rounded-full border border-cyan-500/60 bg-slate-950/80 px-3 py-1.5 shadow-[0_0_20px_rgba(56,189,248,0.35)]">
              <span className="mr-2 text-xs text-cyan-300/80">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") performSearch();
                }}
                placeholder="Tìm bài hát, nghệ sĩ..."
                className="flex-1 bg-transparent text-xs text-slate-50 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={performSearch}
                disabled={isSearching}
                className="ml-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60"
              >
                Tìm
              </button>
            </div>
            {isSearching && (
              <p className="mt-1 text-[11px] text-cyan-200/80">
                Đang tìm kiếm...
              </p>
            )}
          </div>
        </header>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-[11px] text-red-100">
            {errorMsg}
          </div>
        )}

        {/* KẾT QUẢ SEARCH (NẾU CÓ) */}
        {search.trim() && (searchTracks.length > 0 || searchArtists.length > 0) && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow shadow-black/60">
            <h2 className="mb-3 text-sm font-semibold text-white">
              Kết quả cho &quot;{search.trim()}&quot;
            </h2>

            <div className="grid gap-4 md:grid-cols-[2fr,1.4fr]">
              {/* Tracks */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  Bài hát
                </h3>
                {searchTracks.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Không tìm thấy bài hát nào.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {searchTracks.map((t) => (
                      <div
                        key={t.id}
                        className="group flex cursor-pointer items-stretch gap-2 rounded-2xl bg-slate-900/80 hover:bg-slate-900/95"
                        onDoubleClick={() =>
                          handlePlayTrack(t, searchTracks)
                        }
                      >
                        <div className="flex-1">
                          <TrackCard track={mapToPlayerTrack(t)} />
                        </div>
                        <div className="flex items-center pr-3">
                          <button
                            onClick={() => handlePlayTrack(t, searchTracks)}
                            className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 opacity-0 shadow group-hover:opacity-100 transition-opacity"
                          >
                            ▶ Phát
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Artists */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  Nghệ sĩ
                </h3>
                {searchArtists.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Không tìm thấy nghệ sĩ nào.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {searchArtists.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => router.push(`/artists/${a.id}`)}
                        className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-3 text-xs text-slate-100 hover:border-cyan-400/70 hover:bg-slate-900/90"
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-full border border-cyan-400/70 bg-slate-900/80">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              a.avatar ? `${API_BASE}${a.avatar}` : "/default-artist.png"
                            }
                            alt={a.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="max-w-[120px] truncate text-[13px] font-semibold">
                            {a.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {a.tracksCount ?? 0} bài • {a.albumsCount ?? 0} album
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TRENDING SECTION */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Nhạc nổi bật hôm nay
            </h2>
            {trendingTracks.length > 0 && (
              <button
                onClick={() => {
                  const queue = trendingTracks.map(mapToPlayerTrack);
                  setQueue(queue);
                  playNow(queue[0]);
                }}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow hover:brightness-110"
              >
                ▶ Phát tất cả
              </button>
            )}
          </div>

          {trendingLoading ? (
            <p className="text-xs text-slate-400">Đang tải nhạc nổi bật...</p>
          ) : trendingTracks.length === 0 ? (
            <p className="text-xs text-slate-500">
              Chưa có dữ liệu trending. Hãy thêm một vài bài hát trước nhé.
            </p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {trendingTracks.map((t) => (
                <div
                  key={t.id}
                  className="group flex cursor-pointer items-stretch gap-2 rounded-2xl bg-slate-950/80 hover:bg-slate-900/90"
                  onDoubleClick={() => handlePlayTrack(t, trendingTracks)}
                >
                  <div className="flex-1">
                    <TrackCard track={mapToPlayerTrack(t)} />
                  </div>
                  <div className="flex items-center pr-3">
                    <button
                      onClick={() => handlePlayTrack(t, trendingTracks)}
                      className="rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 opacity-0 shadow group-hover:opacity-100 transition-opacity"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ARTISTS SECTION */}
       
      </div>
    </div>
  );
}
