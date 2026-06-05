// web/app/tracks/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

type TrackDetail = Track & {
  lyrics?: string | null;
  artist?: {
    id: string;
    name: string | null;
  } | null;
  album?: {
    id: string;
    title: string;
    coverUrl: string | null;
  } | null;
};

export default function TrackDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const { playNow, current, playing, toggle } = usePlayer();

  useEffect(() => {
    if (!id) return;
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/tracks/${id}`);
        if (!res.ok) {
          setTrack(null);
          return;
        }
        const raw = await res.json();

        // Chuẩn hoá coverUrl & audioUrl thành full URL
        const normalized: TrackDetail = {
          ...raw,
          coverUrl: resolveMediaUrl(raw.coverUrl),
          audioUrl: resolveMediaUrl(raw.audioUrl),
        };

        setTrack(normalized);
      } catch (e) {
        console.error("Fetch track detail error", e);
        setTrack(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, [id]);

  if (!id) return <div className="p-6">Thiếu id bài hát.</div>;
  if (loading) return <div className="p-6">Đang tải bài hát...</div>;
  if (!track) return <div className="p-6">Không tìm thấy bài hát.</div>;

  const isCurrent = current?.id === track.id;
  const isPlaying = isCurrent && playing;

  const handlePlay = () => {
    if (isCurrent) {
      toggle();
    } else {
      // track đã có coverUrl & audioUrl chuẩn
      playNow(track);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover + info */}
        <div className="glass rounded-2xl p-4 flex gap-4 items-center md:items-start">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Bài hát
            </p>
            <h1 className="text-2xl md:text-3xl font-bold">{track.title}</h1>
            <p className="text-sm text-slate-200">
              {track.artist?.name ?? "Unknown Artist"}
              {track.album?.title && (
                <>
                  {" "}
                  • Album{" "}
                  <span className="font-semibold">{track.album.title}</span>
                </>
              )}
            </p>
            <button
              onClick={handlePlay}
              className="mt-3 px-4 py-2 rounded-full btn-primary text-sm"
            >
              {isPlaying ? "Tạm dừng" : "Phát ngay"}
            </button>
          </div>
        </div>

        {/* Lyrics */}
        <div className="glass rounded-2xl p-4 flex-1 max-h-[360px] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">Lời bài hát</h2>
          {track.lyrics ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-100 leading-relaxed">
              {track.lyrics}
            </pre>
          ) : (
            <p className="text-sm text-slate-300">
              Bài hát này chưa có lời. Bạn có thể thêm lyrics sau này từ trang
              quản trị.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
