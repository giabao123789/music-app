"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type React from "react";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";
import PlaylistSelectDialog from "./PlaylistSelectDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  track: Track;

  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

function normalizeTrack(t: Track): Track {
  return {
    id: t.id,
    title: t.title || "Unknown Title",
    audioUrl: t.audioUrl || "",
    coverUrl: t.coverUrl || "/default-cover.jpg",
    duration: typeof t.duration === "number" ? t.duration : 180,
    artist: t.artist ?? { name: "Unknown Artist" },
    ...(t as any), // giữ nguyên field khác (genre, artistId,...)
  };
}

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const storage =
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token");
  if (storage) return storage;

  const cookie = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return cookie ? decodeURIComponent(cookie[1]) : null;
}

function genreLabel(genre?: string | null) {
  if (!genre) return null;
  const g = String(genre).toUpperCase();
  const map: Record<string, string> = {
    POP: "Pop",
    RNB: "R&B",
    INDIE: "Indie",
    EDM: "EDM",
    RAP: "Rap",
    BALLAD: "Ballad",
  };
  return map[g] ?? null; // ✅ không hiển thị OTHER/Khác
}

// ✅ NEW: format duration seconds -> mm:ss
function formatDuration(seconds: number | null | undefined): string {
  const s = typeof seconds === "number" && Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function TrackCard({ track, onHoverStart, onHoverEnd }: Props) {
  const { current, playing, toggle, playNow, addToQueue } = usePlayer();
  const normalized = useMemo(() => normalizeTrack(track), [track]);

  const isCurrent = current?.id === normalized.id;
  const isPlaying = isCurrent && playing;

  const [fav, setFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);

  // ✅ cover url resolve cho /uploads
  const coverSrc = useMemo(() => {
    const raw = normalized.coverUrl || "";
    if (!raw) return "/default-cover.jpg";
    if (
      raw.startsWith("/uploads") ||
      raw.startsWith("uploads/") ||
      raw.startsWith("uploads")
    ) {
      return resolveMediaUrl(raw.startsWith("/") ? raw : `/${raw}`);
    }
    return raw;
  }, [normalized.coverUrl]);

  // ✅ lấy artistId theo nhiều kiểu data khác nhau (không phá code cũ)
  const artistId = useMemo(() => {
    const anyT = track as any;
    const anyN = normalized as any;
    return (
      anyT?.artistId ||
      anyN?.artistId ||
      anyT?.artist?.id ||
      anyN?.artist?.id ||
      ""
    );
  }, [track, normalized]);

  const artistName = normalized.artist?.name || "Unknown Artist";

  // ✅ badge genre lấy từ track.genre hoặc normalized.genre
  const badge = useMemo(() => {
    const anyT = track as any;
    const anyN = normalized as any;
    return genreLabel(anyT?.genre ?? anyN?.genre ?? null);
  }, [track, normalized]);

  // ✅ popularity (lượt nghe) - hiện cho mọi role, null-safe
  const popularity = useMemo(() => {
    const anyT = track as any;
    const anyN = normalized as any;
    const p = anyT?.popularity ?? anyN?.popularity;
    return typeof p === "number" && Number.isFinite(p) && p >= 0 ? p : null;
  }, [track, normalized]);

  // PLAY
  const handlePlayClick = () => {
    const t = normalizeTrack(track);
    if (!t.audioUrl) return alert("Bài hát này chưa có đường dẫn audio hợp lệ.");
    if (isCurrent) return toggle();
    playNow(t);
  };

  const handleQueueClick = () => {
    const t = normalizeTrack(track);
    if (!t.audioUrl) return alert("Audio không hợp lệ.");
    addToQueue(t);
  };

  const handleFavoriteClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/favorites/toggle`, {
        method: "POST",
        headers,
        body: JSON.stringify({ trackId: normalized.id }),
      });

      if (!res.ok) {
        alert("Không thể cập nhật yêu thích.");
        return;
      }
      const data = await res.json();
      setFav(data.liked ?? !fav);
    } catch (err) {
      console.error("Favorite API error", err);
      alert("Không thể cập nhật yêu thích.");
    } finally {
      setFavLoading(false);
    }
  };

  // ✅ cả title + artist đều đi tới trang nghệ sĩ
  const ArtistLinkWrap = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    if (!artistId) return <span className={className}>{children}</span>;
    return (
      <Link href={`/artists/${artistId}`} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <>
      <div
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        className={`group relative overflow-hidden
          flex items-center gap-4 px-4 py-3 rounded-2xl
          border border-white/10 transition-all duration-300
          trackcard-surface
          ${isCurrent && isPlaying ? "trackcard-playing" : "trackcard-idle"}`}
      >
        {/* COVER */}
        <div className="relative h-14 w-14 rounded-xl trackcard-cover-wrapper shrink-0">
          <img
            src={coverSrc}
            alt={normalized.title}
            className="w-full h-full object-cover rounded-xl transition duration-300 group-hover:brightness-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/default-cover.jpg";
            }}
          />
        </div>

        {/* RIGHT */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* TITLE -> ARTIST PAGE */}
              <ArtistLinkWrap className="block font-semibold text-sm truncate hover:text-sky-300 transition cursor-pointer">
                {normalized.title}
              </ArtistLinkWrap>

              {/* ARTIST -> ARTIST PAGE */}
              <ArtistLinkWrap className="block text-xs text-slate-300 truncate hover:text-indigo-300 transition cursor-pointer">
                {artistName}
              </ArtistLinkWrap>
            </div>

            {/* META RIGHT */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {badge && (
                <span className="genre-badge text-[11px] px-2 py-1 rounded-full border">
                  {badge}
                </span>
              )}

              {/* 👂 lượt nghe - hiện cho mọi role */}
              {popularity !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-slate-950/40 px-2 py-0.5 text-[11px] text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.18)]">
                  <span className="opacity-80">👂</span>
                  <span className="font-semibold">
                    {popularity.toLocaleString("vi-VN")}
                  </span>
                  <span className="opacity-70">lượt nghe</span>
                </span>
              )}

              {/* ✅ CHANGED: mm:ss thay vì "Xs" */}
              <span className="text-xs text-slate-200 tabular-nums">
                {formatDuration(normalized.duration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* PLAY */}
            <button
              onClick={handlePlayClick}
              className="player-play-btn h-9 w-9 rounded-full flex items-center justify-center
                       shadow-lg shadow-sky-500/40 border border-white/10
                       bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500
                       hover:shadow-sky-400/70 transition-all duration-200"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-900">
                  <rect x="6" y="5" width="4" height="14" rx="1.5" />
                  <rect x="14" y="5" width="4" height="14" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-900">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* FAVORITE (no pink) */}
            <button
              onClick={handleFavoriteClick}
              disabled={favLoading}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs border transition
              ${
                fav
                  ? "border-cyan-300/80 bg-cyan-400/25 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.45)]"
                  : "border-white/35 text-slate-200 hover:border-cyan-300/70 hover:bg-white/5"
              }`}
              title="Yêu thích"
            >
              {fav ? "♥" : "♡"}
            </button>

            <button
              onClick={() => setShowPlaylistDialog(true)}
              className="px-3 h-8 rounded-full border border-white/25 text-xs hover:bg-white/10 transition"
            >
              Playlist
            </button>

            <button
              onClick={handleQueueClick}
              className="px-3 h-8 rounded-full border border-white/25 text-xs hover:bg-white/10 transition"
            >
              + Hàng chờ
            </button>
          </div>
        </div>
      </div>

      <PlaylistSelectDialog
        trackId={normalized.id}
        open={showPlaylistDialog}
        onClose={() => setShowPlaylistDialog(false)}
      />

      {/* STYLES */}
      <style jsx>{`
        .trackcard-surface {
          backdrop-filter: blur(14px);
        }

        .trackcard-idle {
          background: radial-gradient(
              circle at top left,
              rgba(56, 189, 248, 0.12),
              transparent 45%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(129, 140, 248, 0.16),
              transparent 55%
            ),
            rgba(15, 23, 42, 0.9);
          transform: translateY(0);
          box-shadow: 0 0 0 rgba(15, 23, 42, 0);
        }

        .trackcard-idle:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.85),
            0 0 20px rgba(56, 189, 248, 0.45);
          border-color: rgba(148, 163, 184, 0.6);
        }

        .trackcard-playing {
          background: linear-gradient(
            120deg,
            #22d3ee 0%,
            #3b82f6 40%,
            #7c3aed 100%
          );
          background-size: 260% 260%;
          animation: neonMove 4.2s linear infinite,
            neonPulse 1.9s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.9),
            0 0 55px rgba(124, 58, 237, 0.85);
          border-color: rgba(255, 255, 255, 0.32);
        }

        .trackcard-playing::before {
          content: "";
          position: absolute;
          inset: -25%;
          background: radial-gradient(
            circle at center,
            rgba(34, 211, 238, 0.35),
            rgba(124, 58, 237, 0.12),
            transparent 70%
          );
          opacity: 0.6;
          filter: blur(24px);
          z-index: -1;
          animation: neonHalo 3.4s ease-in-out infinite;
        }

        .trackcard-cover-wrapper {
          background: radial-gradient(
            circle at center,
            rgba(56, 189, 248, 0.18),
            rgba(15, 23, 42, 1)
          );
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.5);
        }

        .trackcard-cover-wrapper::before {
          content: "";
          position: absolute;
          inset: -18%;
          border-radius: 999px;
          background: radial-gradient(
            circle at center,
            rgba(56, 189, 248, 0.4),
            transparent 60%
          );
          opacity: 0;
          filter: blur(18px);
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .group:hover .trackcard-cover-wrapper::before {
          opacity: 1;
        }

        .genre-badge {
          border-color: rgba(56, 189, 248, 0.45);
          background: linear-gradient(
            120deg,
            rgba(34, 211, 238, 0.16),
            rgba(59, 130, 246, 0.14),
            rgba(124, 58, 237, 0.16)
          );
          color: rgba(224, 242, 254, 0.95);
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.18),
            0 0 24px rgba(124, 58, 237, 0.12);
        }

        @keyframes neonMove {
          0% {
            background-position: 0% 20%;
          }
          50% {
            background-position: 100% 20%;
          }
          100% {
            background-position: 0% 20%;
          }
        }

        @keyframes neonPulse {
          0% {
            box-shadow: 0 0 18px rgba(34, 211, 238, 0.55),
              0 0 32px rgba(124, 58, 237, 0.45);
          }
          50% {
            box-shadow: 0 0 34px rgba(34, 211, 238, 0.98),
              0 0 68px rgba(124, 58, 237, 0.95);
          }
          100% {
            box-shadow: 0 0 18px rgba(34, 211, 238, 0.55),
              0 0 32px rgba(124, 58, 237, 0.45);
          }
        }

        @keyframes neonHalo {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            opacity: 0.3;
          }
        }
      `}</style>
    </>
  );
}
