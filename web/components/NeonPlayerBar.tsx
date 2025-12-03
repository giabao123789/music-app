// components/NeonPlayerBar.tsx
"use client";

import React, { useMemo } from "react";
import { usePlayer } from "@/app/providers/PlayerProvider";
import { API_BASE } from "@/lib/config";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NeonPlayerBar() {
  const {
    current,
    queue,
    playing,
    toggle,
    next,
    prev,
    time,
    duration,
    seek,
    volume,
    setVolume,
    clearQueue,
  } = usePlayer();

  // nếu chưa có gì trong queue -> ẩn player
  const hasSomething = queue.length > 0 || current;
  const progressPct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.max(0, Math.min(100, (time / duration) * 100));
  }, [time, duration]);

  if (!hasSomething) return null;

  // xử lý cover: có thể là absolute hoặc relative
  const coverUrl = useMemo(() => {
    if (!current?.coverUrl) return "/default-cover.jpg";
    if (
      current.coverUrl.startsWith("http://") ||
      current.coverUrl.startsWith("https://")
    ) {
      return current.coverUrl;
    }
    return `${API_BASE}${current.coverUrl}`;
  }, [current]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto mb-3 flex max-w-6xl justify-center px-3">
        <div className="pointer-events-auto flex w-full flex-col gap-2 rounded-3xl border border-cyan-500/50 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-sky-950/90 p-3 shadow-[0_0_40px_rgba(56,189,248,0.7)] backdrop-blur-xl">
          {/* Hàng trên: info + controls + volume */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* LEFT: thumbnail + title */}
            <div className="flex min-w-0 flex-1 items-center gap-3 md:w-1/3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border border-cyan-400/70 bg-slate-800/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={current?.title || "current"}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-50 md:text-sm">
                  {current?.title || "Chưa chọn bài hát"}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {current?.artist?.name || "Unknown Artist"}
                </div>
                <div className="mt-1 text-[10px] text-cyan-300/80">
                  {queue.length} bài trong hàng đợi
                </div>
              </div>
            </div>

            {/* CENTER: controls */}
            <div className="hidden flex-col items-center gap-2 md:flex md:w-1/3">
              <div className="flex items-center gap-3 text-xs text-slate-100">
                <button
                  onClick={prev}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-800"
                  title="Bài trước"
                >
                  ⏮
                </button>
                <button
                  onClick={toggle}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 text-sm font-bold text-slate-950 shadow-lg hover:brightness-110"
                  title={playing ? "Tạm dừng" : "Phát"}
                >
                  {playing ? "⏸" : "▶"}
                </button>
                <button
                  onClick={next}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-800"
                  title="Bài tiếp theo"
                >
                  ⏭
                </button>
                <span className="ml-2 hidden text-[11px] text-slate-400 md:inline">
                  {formatTime(time)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* RIGHT: time (mobile) + volume + clear */}
            <div className="flex w-auto items-center justify-end gap-3 md:w-1/3">
              {/* time cho mobile */}
              <span className="text-[10px] text-slate-400 md:hidden">
                {formatTime(time)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">
                  {volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={(e) =>
                    setVolume(Number(e.target.value || 0) / 100)
                  }
                  className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-700 outline-none accent-cyan-400 md:w-28"
                />
              </div>

              {/* Clear queue */}
              <button
                onClick={clearQueue}
                className="hidden rounded-full border border-slate-600/70 bg-slate-950/80 px-3 py-1 text-[10px] text-slate-300 hover:border-red-400 hover:text-red-200 md:inline-block"
                title="Xoá hàng đợi"
              >
                Xoá queue
              </button>
            </div>
          </div>

          {/* Hàng dưới: progress bar */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-10 text-right md:w-12">{formatTime(time)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressPct}
              onChange={(e) => seek(Number(e.target.value || 0))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 outline-none accent-cyan-400"
            />
            <span className="w-10 md:w-12">{formatTime(duration)}</span>
          </div>

          {/* Lyrics preview nếu có */}
          {current?.lyrics && (
            <div className="max-h-20 overflow-y-auto text-[11px] leading-snug text-slate-200/90 md:max-h-24">
              <p className="line-clamp-3 whitespace-pre-line">
                {current.lyrics}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
