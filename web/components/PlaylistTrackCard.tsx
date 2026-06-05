// web/components/PlaylistTrackCard.tsx
"use client";

import { useState } from "react";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  track: Track;
  playlistId: string;
  onRemoved: () => void;
};

// Chuẩn hoá track cho chắc
function normalizeTrack(t: Track): Track {
  return {
    id: t.id,
    title: t.title || "Unknown Title",
    audioUrl: t.audioUrl || "",
    coverUrl: t.coverUrl || "/default-cover.jpg",
    duration:
      typeof t.duration === "number" && Number.isFinite(t.duration)
        ? t.duration
        : 0,
    artist: t.artist ?? { name: "Unknown Artist" },
    lyrics: t.lyrics ?? undefined,
  };
}

export default function PlaylistTrackCard({
  track,
  playlistId,
  onRemoved,
}: Props) {
  const { playNow } = usePlayer();
  const [removing, setRemoving] = useState(false);

  const normalized = normalizeTrack(track);

  const handlePlay = () => {
    console.log("[PlaylistTrackCard] PLAY clicked", {
      playlistId,
      trackId: normalized.id,
      audioUrl: normalized.audioUrl,
    });

    if (!normalized.audioUrl) {
      alert("Bài hát này chưa có audioUrl hợp lệ.");
      console.error("Invalid track:", normalized);
      return;
    }

    playNow(normalized);
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);

    console.log("[PlaylistTrackCard] REMOVE clicked", {
      playlistId,
      trackId: normalized.id,
      url: `${API_BASE}/playlists/${playlistId}/tracks/${normalized.id}`,
    });

    try {
      const res = await fetch(
        `${API_BASE}/playlists/${playlistId}/tracks/${normalized.id}`,
        {
          method: "DELETE",
        }
      );

      console.log(
        "[PlaylistTrackCard] DELETE response status =",
        res.status
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Remove track API error raw body:", text);
        alert(
          `Không xoá được bài hát khỏi playlist (status ${res.status}).`
        );
        return;
      }

      // Xoá thành công -> báo cho parent xoá khỏi state
      onRemoved();
    } catch (err) {
      console.error("Remove track fetch error:", err);
      alert("Lỗi xoá bài (mạng / server).");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl border border-white/5 transition">
      {/* COVER */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={normalized.coverUrl}
        alt={normalized.title}
        className="w-14 h-14 rounded-lg object-cover shadow"
      />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">
          {normalized.title}
        </p>
        <p className="text-zinc-300 text-xs truncate">
          {normalized.artist?.name || "Unknown Artist"}
        </p>
      </div>

      {/* PLAY */}
      <button
        type="button"
        onClick={handlePlay}
        className="p-2 rounded-full bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4CC3ED] text-white text-xs shadow hover:scale-105 transition"
      >
        ▶
      </button>

      {/* REMOVE */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs transition"
      >
        ✕
      </button>
    </div>
  );
}
