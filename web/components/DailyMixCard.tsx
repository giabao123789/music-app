"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  let s = String(raw).trim().replaceAll("\\", "/");
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.startsWith("/uploads")) return `${API_BASE}${encodeURI(s)}`;
  return encodeURI(s);
}

type DailyMixResponse = {
  id: string;
  title: string;
  subtitle?: string;
  genres?: string[];
  tracks: Track[];
};

export default function DailyMixCard() {
  const { playNow, addToQueue } = usePlayer();
  const [data, setData] = useState<DailyMixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cover = useMemo(() => {
    const first = data?.tracks?.[0] as any;
    const raw = first?.coverUrl || null;
    const src = resolveMediaUrl(raw);
    return src || "/default-cover.jpg";
  }, [data]);

  useEffect(() => {
    const token = getTokenFromStorage();
    if (!token) return;

    setLoading(true);
    setErr(null);

    fetch(`${API_BASE}/recommendations/daily`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.text().catch(() => "")) || "Không tải được Daily Mix");
        return r.json();
      })
      .then((json) => setData(json))
      .catch((e) => setErr(e.message || "Daily Mix error"))
      .finally(() => setLoading(false));
  }, []);

  const handlePlayAll = () => {
    const list = (data?.tracks || []).filter((t) => t?.audioUrl);
    if (!list.length) return alert("Daily Mix chưa có track hợp lệ để phát.");

    // chuẩn hoá url để Player luôn chơi được
    const normalized = list.map((t: any) => ({
      ...t,
      coverUrl: t.coverUrl ? resolveMediaUrl(t.coverUrl) : t.coverUrl,
      audioUrl: t.audioUrl ? resolveMediaUrl(t.audioUrl) : t.audioUrl,
    }));

    playNow(normalized[0]);
    for (let i = 1; i < normalized.length; i++) addToQueue(normalized[i]);
  };

  if (!getTokenFromStorage()) return null;

  return (
    <div className="rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950/70 via-indigo-950/50 to-sky-950/50 p-5 shadow-[0_0_60px_rgba(56,189,248,0.12)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300/80">
            Gợi ý cho bạn
          </div>
          <div className="mt-1 text-2xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            {data?.title || "Daily Mix"}
          </div>
          <div className="mt-1 text-sm text-slate-300">
            {loading ? "Đang tạo playlist..." : data?.subtitle || "Dựa trên bài bạn thích & nghệ sĩ bạn follow"}
          </div>

          {err && (
            <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handlePlayAll}
            disabled={loading || !(data?.tracks?.length)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 hover:brightness-110 disabled:opacity-60"
            title="Play all"
          >
            <span className="text-base">▶</span>
            Play all
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_22px_rgba(56,189,248,0.25)]">
          <img
            src={cover}
            alt="Daily Mix cover"
            className="h-full w-full object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/default-cover.jpg")}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
        </div>

        <div className="min-w-0">
          <div className="text-xs text-slate-300">
            {data?.tracks?.length ? `🎵 ${data.tracks.length} bài` : "Chưa có bài nào"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Tip: nghe hơn 50% bài để tăng chính xác gợi ý (mình sẽ làm Listening History cho bạn sau).
          </div>
        </div>
      </div>
    </div>
  );
}
