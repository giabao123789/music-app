// web/app/favorites/page.tsx
"use client";

import { useEffect, useState } from "react";
import TrackCard from "@/components/TrackCard";
import type { Track } from "@/app/providers/PlayerProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type FavoriteItem = {
  id: string; // track id
  title: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: string | null;
  artist?: {
    id: string;
    name: string;
  } | null;
  favoriteAt?: string;
};

export default function FavoritesPage() {
  const [tracks, setTracks] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 🔑 LẤY TOKEN GIỐNG Ở TrackCard / PlayerBar
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("mp:token") ||
              localStorage.getItem("token") ||
              localStorage.getItem("accessToken")
            : null;

        if (!token) {
          setError("Bạn cần đăng nhập để xem danh sách yêu thích.");
          setTracks([]);
          return;
        }

        const headers: Record<string, string> = {};
        headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/favorites`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            // ignore
          }
          console.error("Favorites list API error", {
            status: res.status,
            data,
          });
          throw new Error(`Lỗi API (status ${res.status})`);
        }

        const data: FavoriteItem[] = await res.json();

        if (!cancelled) {
          setTracks(data || []);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Không tải được danh sách yêu thích.");
          setTracks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen pb-32 bg-gradient-to-b from-[#080013] via-[#0b021c] to-[#05010a]">
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        {/* HEADER */}
        <section className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
            Bài hát yêu thích
          </h1>
          <p className="text-sm md:text-base text-white/60">
            Những bài bạn đã nhấn tim ♥ sẽ xuất hiện ở đây.
          </p>
        </section>

        {/* TRẠNG THÁI */}
        {loading && (
          <div className="py-16 flex items-center justify-center text-white/70">
            Đang tải danh sách yêu thích...
          </div>
        )}

        {!loading && error && (
          <div className="py-16 text-center text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="py-16 text-center text-white/60 text-sm">
            Bạn chưa có bài hát yêu thích nào.
          </div>
        )}

        {!loading && !error && tracks.length > 0 && (
          <section className="space-y-3">
            {tracks.map((t) => (
              <TrackCard
                key={t.id}
                track={{
                  id: t.id,
                  title: t.title,
                  duration: t.duration,
                  coverUrl: t.coverUrl,
                  audioUrl: t.audioUrl,
                  lyrics: t.lyrics ?? undefined,
                  artist: t.artist ?? undefined,
                }}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
