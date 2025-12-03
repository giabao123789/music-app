// web/components/PlayerBar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "../app/providers/PlayerProvider";
import PlaylistSelectDialog from "./PlaylistSelectDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type RepeatMode = "off" | "all" | "one";

function fmt(seconds: number) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
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

export default function PlayerBar() {
  const {
    current,
    playing,
    toggle,
    next,
    prev,
    time,
    duration,
    seek,
    volume,
    setVolume,
    queue,
    clearQueue,
    index,
    setIndex,
    setQueue, // dùng để cache lyrics vào queue
  } = usePlayer();

  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [showQueue, setShowQueue] = useState(false);

  const [favLoading, setFavLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);

  // ====== LỜI BÀI HÁT ======
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  // ====== PLAYLIST DIALOG ======
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);

  // khi đổi bài thì reset loading + fav + lyrics
  useEffect(() => {
    setFavLoading(false);
    setPlaylistLoading(false);
    setIsFav(false);

    setShowLyrics(false);
    setLyricsError(null);
    setLyrics(current?.lyrics ?? null);

    // đóng dialog playlist khi đổi bài
    setShowPlaylistDialog(false);
  }, [current?.id, current?.lyrics]);

  if (!current) return null;

  const progress = duration ? (time / duration) * 100 : 0;

  // ------------ điều khiển next/prev có trộn & lặp -------------
  const handleNext = () => {
    if (!queue.length) return;

    if (shuffle && queue.length > 1) {
      let i = index;
      while (i === index) {
        i = Math.floor(Math.random() * queue.length);
      }
      setIndex(i);
      return;
    }

    if (repeat === "one") {
      seek(0);
      return;
    }

    if (repeat === "all") {
      if (index + 1 < queue.length) setIndex(index + 1);
      else setIndex(0);
      return;
    }

    next();
  };

  const handlePrev = () => {
    if (time > 3) {
      seek(0);
      return;
    }

    if (shuffle && queue.length > 1) {
      let i = index;
      while (i === index) {
        i = Math.floor(Math.random() * queue.length);
      }
      setIndex(i);
      return;
    }

    prev();
  };

  const cycleRepeat = () => {
    setRepeat((old) =>
      old === "off" ? "all" : old === "all" ? "one" : "off",
    );
  };

  // ------------ API: yêu thích -------------
  const handleFavorite = async () => {
    if (!current || favLoading) return;
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
        body: JSON.stringify({ trackId: current.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Favorite API error", { status: res.status, data });
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      setIsFav((v) =>
        typeof data.liked === "boolean" ? data.liked : !v,
      );
    } catch (e) {
      console.error(e);
      alert("Không thêm được vào yêu thích (kiểm tra lại API / đăng nhập).");
    } finally {
      setFavLoading(false);
    }
  };

  // ------------ PLAYLIST: mở dialog chọn playlist -------------
  const handleAddToPlaylist = () => {
    if (!current || playlistLoading) return;
    // không gọi API cũ /playlists/default/add-track nữa
    // chỉ mở dialog, việc gọi API đúng /playlists/:id/tracks do PlaylistSelectDialog xử lý
    setShowPlaylistDialog(true);
  };

  // ------------ API: lấy lời bài hát -------------
  const handleToggleLyrics = async () => {
    if (!current) return;

    if (showLyrics) {
      setShowLyrics(false);
      return;
    }

    setShowLyrics(true);
    setLyricsError(null);

    if (lyrics || lyricsLoading) return;

    setLyricsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tracks/${current.id}`);
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const data = await res.json();
      const l: string | null = data.lyrics ?? null;

      setLyrics(l);

      setQueue((q) =>
        q.map((t) => (t.id === current.id ? { ...t, lyrics: l } : t)),
      );
    } catch (err) {
      console.error("Lỗi tải lyrics:", err);
      setLyricsError("Không tải được lời bài hát. Vui lòng thử lại.");
    } finally {
      setLyricsLoading(false);
    }
  };

  const smallBtn =
    "w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-xs text-slate-100/90 bg-white/5 hover:bg-white/10 transition";

  return (
    <>
      {/* PANEL HÀNG CHỜ */}
      {showQueue && (
        <div className="fixed bottom-28 right-4 z-50 w-80 max-h-[60vh] rounded-2xl bg-[#050816]/95 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-semibold">
              Hàng chờ ({queue.length})
            </span>
            <button
              onClick={() => setShowQueue(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-xs"
              title="Đóng"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {queue.length === 0 ? (
              <p className="text-xs text-slate-300 px-1 py-2">
                Chưa có bài nào trong hàng chờ.
              </p>
            ) : (
              queue.map((t, i) => {
                const isCurrent = i === index;
                return (
                  <button
                    key={t.id}
                    onClick={() => setIndex(i)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left text-xs
                      ${
                        isCurrent
                          ? "bg-gradient-to-r from-[#4e148c] via-[#4361ee] to-[#4cc9f0] text-white"
                          : "bg-white/3 hover:bg-white/8 text-slate-100"
                      }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.coverUrl}
                      alt={t.title}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-200/90 truncate">
                        {t.artist?.name ?? "Unknown Artist"}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-200/90">
                      {fmt(t.duration)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {queue.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 flex justify-between items-center text-[11px] text-slate-300">
              <span>{queue.length} bài trong hàng chờ</span>
              <button
                onClick={clearQueue}
                className="underline hover:text-slate-100"
              >
                Xoá hàng chờ
              </button>
            </div>
          )}
        </div>
      )}

      {/* PANEL LỜI BÀI HÁT */}
      {showLyrics && (
        <div
          className="
    fixed top-24 right-6 z-[60]
    w-[380px] max-h-[70vh]
    bg-[#0d0f1a]/90
    border border-white/10
    rounded-2xl backdrop-blur-xl
    shadow-[0_0_25px_rgba(78,20,140,0.5)]
    flex flex-col
    animate-slide-left
  "
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                Lời bài hát - {current.title}
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                {current.artist?.name ?? "Unknown Artist"}
              </div>
            </div>

            <button
              onClick={() => setShowLyrics(false)}
              className="w-8 h-8 flex items-center justify-center 
          rounded-full bg-white/10 hover:bg-white/20 text-xs"
              title="Đóng"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 
      text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
          >
            {lyricsLoading && (
              <p className="text-slate-300 text-sm">
                Đang tải lời bài hát...
              </p>
            )}

            {!lyricsLoading && lyricsError && (
              <p className="text-red-400 text-sm">{lyricsError}</p>
            )}

            {!lyricsLoading &&
              !lyricsError &&
              lyrics &&
              lyrics.trim().length > 0 && <p>{lyrics}</p>}

            {!lyricsLoading &&
              !lyricsError &&
              (!lyrics || lyrics.trim().length === 0) && (
                <p className="text-slate-300 text-sm">
                  Chưa có lời bài hát cho bài này.
                </p>
              )}
          </div>
        </div>
      )}

      {/* THANH PLAYER CHÍNH */}
      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="mx-auto max-w-7xl px-4 pb-4">
          <div
            className="
              rounded-2xl
              bg-gradient-to-r from-[#050816] via-[#020418] to-[#01010f]
              border border-white/10
              shadow-[0_-18px_45px_rgba(0,0,0,0.85)]
              backdrop-blur-xl
              px-4
              pt-3
              pb-4
              space-y-3
            "
          >
            <div className="flex items-center gap-4">
              {/* cover + info */}
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.coverUrl}
                  alt={current.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-lg"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {current.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {current.artist?.name ?? "Unknown Artist"}
                  </div>
                </div>
              </div>

              {/* Controls chính */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3">
                  <button
                    className={`${smallBtn} ${
                      shuffle
                        ? "bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4cc9f0] text-white border-none"
                        : ""
                    }`}
                    onClick={() => setShuffle((v) => !v)}
                    title="Trộn bài"
                  >
                    🔀
                  </button>

                  <button
                    className={smallBtn}
                    onClick={handlePrev}
                    title="Bài trước"
                  >
                    ⏮
                  </button>

                  <button
                    onClick={toggle}
                    className="
                      w-12 h-12 flex items-center justify-center
                      rounded-full
                      text-white text-xl
                      shadow-lg
                      bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4cc9f0]
                      hover:scale-105 hover:brightness-110
                      active:scale-95
                      transition
                    "
                    title={playing ? "Tạm dừng" : "Phát"}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>

                  <button
                    className={smallBtn}
                    onClick={handleNext}
                    title="Bài tiếp"
                  >
                    ⏭
                  </button>

                  <button
                    className={`${smallBtn} ${
                      repeat !== "off"
                        ? "bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4cc9f0] text-white border-none"
                        : ""
                    }`}
                    onClick={cycleRepeat}
                    title={
                      repeat === "off"
                        ? "Lặp: tắt"
                        : repeat === "all"
                        ? "Lặp toàn bộ"
                        : "Lặp 1 bài"
                    }
                  >
                    {repeat === "one" ? "🔁1" : "🔁"}
                  </button>
                </div>

                <div className="w-full flex items-center gap-3">
                  <span className="text-[11px] text-slate-300 w-10 text-right">
                    {fmt(time)}
                  </span>
                  <input
                    type="range"
                    value={progress}
                    max={100}
                    step={0.1}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="player-range flex-1 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 w-10">
                    -{fmt(Math.max(0, duration - time))}
                  </span>
                </div>
              </div>

              {/* Bên phải */}
              <div className="flex flex-col items-end gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFavorite}
                    disabled={favLoading}
                    className={`
                      ${smallBtn}
                      ${isFav ? "bg-pink-500 text-white border-none" : ""}
                    `}
                    title="Thêm vào yêu thích"
                  >
                    {isFav ? "♥" : "♡"}
                  </button>
                  <button
                    onClick={handleAddToPlaylist}
                    disabled={playlistLoading}
                    className={smallBtn}
                    title="Thêm vào playlist"
                  >
                    ➕
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Âm lượng</span>
                  <input
                    type="range"
                    value={Math.round(volume * 100)}
                    max={100}
                    onChange={(e) =>
                      setVolume(Number(e.target.value) / 100)
                    }
                    className="w-28 player-range cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQueue((v) => !v)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15"
                    title="Xem danh sách hàng chờ"
                  >
                    <span>Hàng chờ</span>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-[10px]">
                      {queue.length}
                    </span>
                  </button>

                  <button
                    onClick={handleToggleLyrics}
                    className="text-[11px] px-2 py-1 rounded-full bg_white/5 hover:bg-white/10 border border-white/15"
                    title="Xem lời bài hát"
                  >
                    Lời bài hát
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG CHỌN PLAYLIST */}
      <PlaylistSelectDialog
        trackId={current.id}
        open={showPlaylistDialog}
        onClose={() => setShowPlaylistDialog(false)}
      />
    </>
  );
}
