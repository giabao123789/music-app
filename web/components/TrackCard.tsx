"use client";

import { useState } from "react";
import type React from "react";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";
import PlaylistSelectDialog from "./PlaylistSelectDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  track: Track;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
};

// Chuẩn hoá track để bảo đảm luôn đủ field
function normalizeTrack(t: Track): Track {
  return {
    id: t.id,
    title: t.title || "Unknown Title",
    audioUrl: t.audioUrl || "",
    coverUrl: t.coverUrl || "/default-cover.jpg",
    duration:
      typeof t.duration === "number" && Number.isFinite(t.duration)
        ? t.duration
        : 180,
    artist: t.artist ?? { name: "Unknown Artist" },
  };
}

// Lấy JWT từ localStorage / cookie
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage =
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token");

  if (fromStorage) return fromStorage;

  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);

  return null;
}

export default function TrackCard({ track, onHoverStart, onHoverEnd }: Props) {
  const { current, playing, toggle, playNow, addToQueue } = usePlayer();

  const normalized = normalizeTrack(track);

  const isCurrent = current?.id === normalized.id;
  const isPlaying = isCurrent && playing;

  const [fav, setFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);

  // ========= PLAY =========
  const handlePlayClick = () => {
    const t = normalizeTrack(track);

    if (!t.audioUrl) {
      console.error("Track missing audioUrl:", t);
      alert("Bài hát này chưa có đường dẫn audio hợp lệ (audioUrl).");
      return;
    }

    if (isCurrent) {
      toggle();
      return;
    }

    try {
      playNow(t);
    } catch (e) {
      console.error("playNow error:", e, t);
      alert("Không thể phát bài hát này.");
    }
  };

  // ========= HÀNG CHỜ =========
  const handleQueueClick = () => {
    const t = normalizeTrack(track);
    if (!t.audioUrl) {
      alert("Bài hát này chưa có audioUrl hợp lệ, không thể thêm hàng chờ.");
      return;
    }
    addToQueue(t);
  };

  // ========= YÊU THÍCH =========
  const handleFavoriteClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        const data = await res.json().catch(() => null);
        console.error("Favorite API error", { status: res.status, data });

        if (res.status === 401) {
          alert("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        } else {
          alert("Không thể cập nhật yêu thích (API lỗi).");
        }
        return;
      }

      const data = await res.json();
      if (typeof data.liked === "boolean") {
        setFav(data.liked);
      } else {
        setFav((v) => !v);
      }
    } catch (err) {
      console.error("Favorite error:", err);
      alert("Lỗi mạng khi cập nhật yêu thích");
    } finally {
      setFavLoading(false);
    }
  };

  // ========= PLAYLIST =========
  const handleAddToPlaylist = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowPlaylistDialog(true);
  };

  // ========= UI =========
  return (
    <>
      <div
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        className={`
          group relative overflow-hidden
          flex items-center gap-4 px-4 py-3 rounded-2xl
          border border-white/15
          transition-all duration-300
          ${isCurrent && isPlaying ? "trackcard-playing" : "trackcard-idle"}
        `}
      >
        {/* COVER */}
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={normalized.coverUrl}
            alt={normalized.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* BÊN PHẢI */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {normalized.title}
              </p>
              <p className="text-xs text-slate-300 truncate">
                {normalized.artist?.name ?? "Unknown Artist"}
              </p>
            </div>
            <span className="text-xs text-slate-200 flex-shrink-0 whitespace-nowrap">
              {Math.round(normalized.duration)}s
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* PLAY */}
            <button
              type="button"
              onClick={handlePlayClick}
              className="player-play-btn h-9 w-9 rounded-full flex items-center justify-center 
                       shadow-lg shadow-sky-500/40 border border-white/10"
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

            {/* YÊU THÍCH */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              disabled={favLoading}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs border 
              ${fav ? "bg-pink-500 border-pink-500" : "border-white/40"}
              hover:bg-pink-500/80 transition`}
              title="Yêu thích"
            >
              {fav ? "♥" : "♡"}
            </button>

            {/* PLAYLIST */}
            <button
              type="button"
              onClick={handleAddToPlaylist}
              className="px-3 h-8 rounded-full border border-white/40 text-xs hover:bg-white/10 transition"
            >
              Playlist
            </button>

            {/* HÀNG CHỜ */}
            <button
              type="button"
              onClick={handleQueueClick}
              className="px-3 h-8 rounded-full border border-white/40 text-xs hover:bg-white/10 transition"
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

      {/* CSS cho card idle & đang phát */}
      <style jsx>{`
        /* Card bình thường – nền rất trong suốt, không làm mờ logo */
        .trackcard-idle {
          background: rgba(15, 23, 42, 0.18);
        }
        .trackcard-idle:hover {
          background: rgba(15, 23, 42, 0.3);
        }

        /* Card đang phát – gradient tím → xanh đậm hơn nhưng vẫn hơi trong suốt */
        .trackcard-playing {
          background: linear-gradient(
            120deg,
            rgba(168, 85, 247, 0.75),
            rgba(99, 102, 241, 0.78),
            rgba(76, 195, 237, 0.8)
          );
          background-size: 220% 220%;
          animation: trackPlayingGradient 5s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(76, 195, 237, 0.75);
          border-color: rgba(255, 255, 255, 0.3);
        }

        @keyframes trackPlayingGradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </>
  );
}
