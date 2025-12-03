"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePlayer, Track } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PlaylistTrackApi = {
  id: string;
  title: string;
  coverUrl?: string | null;
  audioUrl: string;
  duration?: number | null;
  genre?: string | null;
  artist?: { name: string | null } | null;
};

type PlaylistDetailResponse = {
  id: string;
  name: string;
  tracks: PlaylistTrackApi[];
};

// Track phía frontend có thêm genre để mix màu
type TrackWithGenre = Track & { genre?: string | null };

// ===== GRADIENT PRESETS (luôn pha #4CC3ED) =====
const GRADIENT_CLASSES = [
  "from-[#130826] via-[#22114a] to-[#06141f]",
  "from-[#2b0b3f] via-[#5b1f7a] to-[#0b3b4f]",
  "from-[#050816] via-[#1f2937] to-[#0b3b4f]",
  "from-[#26103f] via-[#3b1f73] to-[#0e3f5c]",
  "from-[#3a0f32] via-[#4b1d60] to-[#0b4252]",
];

// Gradient theo genre
const GENRE_GRADIENT: Record<string, string> = {
  BALLAD: "from-[#2b0b3f] via-[#8b5cf6] to-[#4CC3ED]",
  RAP: "from-[#3a0f32] via-[#f97316] to-[#0b4252]",
  INDIE: "from-[#1e293b] via-[#22c55e] to-[#0f766e]",
  POP: "from-[#26103f] via-[#ec4899] to-[#4CC3ED]",
  RNB: "from-[#1f2937] via-[#6366f1] to-[#14b8a6]",
  EDM: "from-[#020617] via-[#0ea5e9] to-[#4CC3ED]",
};

function pickGradientIndex(firstTrack: Track | undefined): number {
  if (!firstTrack) return 0;
  const key = firstTrack.id || firstTrack.title || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % GRADIENT_CLASSES.length;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = (params?.id as string) || "";

  const { playNow, setQueue, setIndex } = usePlayer();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("Playlist");
  const [savingName, setSavingName] = useState(false);

  const [tracks, setTracks] = useState<TrackWithGenre[]>([]);

  // ===== LOAD PLAYLIST =====
  useEffect(() => {
    if (!playlistId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/playlists/${playlistId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Playlist detail error", { status: res.status, data });
          throw new Error("Không tải được playlist này.");
        }

        const data: PlaylistDetailResponse = await res.json();
        setName(data.name || "Playlist");

        const mapped: TrackWithGenre[] = data.tracks.map((t) => ({
          id: t.id,
          title: t.title,
          coverUrl: t.coverUrl || "/default-cover.jpg",
          audioUrl: t.audioUrl,
          duration:
            typeof t.duration === "number" && Number.isFinite(t.duration)
              ? t.duration
              : 0,
          artist: t.artist ?? { name: "Unknown Artist" },
          lyrics: undefined,
          genre: t.genre ?? undefined,
        }));

        setTracks(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Có lỗi xảy ra khi tải playlist.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [playlistId]);

  // ===== GRADIENT THEO THỂ LOẠI BÀI ĐẦU TIÊN =====
  const gradientClass = useMemo(() => {
    const first = tracks[0];
    if (!first) return GRADIENT_CLASSES[0];

    const genreKey = (first.genre || "").toUpperCase();
    if (genreKey && GENRE_GRADIENT[genreKey]) {
      return GENRE_GRADIENT[genreKey];
    }

    return GRADIENT_CLASSES[pickGradientIndex(first)];
  }, [tracks]);

  // ===== ĐỔI TÊN PLAYLIST =====
  const handleSaveName = async () => {
    const newName = name.trim();
    if (!newName) return;

    try {
      setSavingName(true);
      const res = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Update playlist name error", {
          status: res.status,
          data,
        });
        throw new Error("Không cập nhật được tên playlist.");
      }
    } catch (err) {
      console.error(err);
      alert("Không cập nhật được tên playlist.");
    } finally {
      setSavingName(false);
    }
  };

  // ===== XOÁ PLAYLIST =====
  const handleDeletePlaylist = async () => {
    if (!window.confirm("Bạn có chắc muốn xoá playlist này?")) return;

    try {
      const res = await fetch(`${API_BASE}/playlists/${playlistId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Delete playlist error:", text);
        alert(`Không xoá được playlist (status ${res.status}).`);
        return;
      }

      router.push("/playlists");
    } catch (err) {
      console.error(err);
      alert("Lỗi xoá playlist (mạng / server).");
    }
  };

  // ===== PHÁT TOÀN BỘ PLAYLIST =====
  const handlePlayAll = () => {
    if (!tracks.length) return;
    playNow(tracks[0]);
    setQueue(tracks);
    setIndex(0);
  };

  // ===== XÓA 1 BÀI KHỎI PLAYLIST =====
  const handleRemoveTrack = async (trackId: string) => {
    if (!window.confirm("Bạn có chắc muốn xoá bài này khỏi playlist?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/playlists/${playlistId}/tracks/${trackId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Remove track API error:", text);
        alert(`Không xoá được bài hát (status ${res.status}).`);
        return;
      }

      // Xoá khỏi state
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      console.error(err);
      alert("Lỗi xoá bài (mạng / server).");
    }
  };

  return (
    <div
      className={`
        min-h-[calc(100vh-96px)]
        bg-gradient-to-b ${gradientClass}
        px-6 pt-10 pb-32
      `}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4CC3ED] shadow-xl">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_#ffffff33,_transparent_60%)]" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                🎧
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#4CC3ED]">
                Playlist
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="bg-transparent border-b border-white/20 focus:border-[#4CC3ED] outline-none text-2xl md:text-3xl font-bold text-white px-1 pb-1"
                />
                {savingName && (
                  <span className="text-[11px] text-zinc-300">
                    Đang lưu...
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-200">
                {tracks.length} bài hát
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePlayAll}
              disabled={!tracks.length}
              className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#4e148c] via-[#4361ee] to-[#4CC3ED] text-white shadow-lg hover:brightness-110 disabled:opacity-60"
            >
              ▶ Phát playlist
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-full px-4 py-2 text-xs border border-white/25 bg-white/5 hover:bg-white/10 text-zinc-100"
            >
              ⟵ Quay lại
            </button>
            <button
              onClick={handleDeletePlaylist}
              className="rounded-full px-4 py-2 text-xs border border-red-400/70 bg-red-500/10 hover:bg-red-500/25 text-red-200"
            >
              🗑 Xoá playlist
            </button>
          </div>
        </div>

        {/* NỘI DUNG */}
        {loading && (
          <p className="text-sm text-zinc-200">
            Đang tải bài hát trong playlist...
          </p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-200">{error}</p>
        )}

        {!loading && !error && tracks.length === 0 && (
          <p className="text-sm text-zinc-200">
            Playlist chưa có bài hát nào. Hãy thêm bài từ nút{" "}
            <span className="font-semibold">Playlist</span> trên TrackCard hoặc
            thanh player.
          </p>
        )}

        {!loading && !error && tracks.length > 0 && (
          <div className="space-y-2">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl border border-white/5 transition"
              >
                {/* COVER */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.coverUrl}
                  alt={t.title}
                  className="w-14 h-14 rounded-lg object-cover shadow"
                />

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {t.title}
                  </p>
                  <p className="text-zinc-300 text-xs truncate">
                    {t.artist?.name || "Unknown Artist"}
                  </p>
                </div>

                {/* PLAY */}
                <button
                  type="button"
                  onClick={() => playNow(t)}
                  className="p-2 rounded-full bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4CC3ED] text-white text-xs shadow hover:scale-105 transition"
                >
                  ▶
                </button>

                {/* REMOVE */}
                <button
                  type="button"
                  onClick={() => handleRemoveTrack(t.id)}
                  className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
