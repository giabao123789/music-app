// web/app/playlists/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Playlist = {
  id: string;
  name: string;
};

type JwtPayload = {
  sub?: string;
  userId?: string;
  email?: string;
  role?: string;
};

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64)) as JwtPayload;
    return (json.userId as string) || (json.sub as string) || null;
  } catch (e) {
    console.error("Decode JWT error:", e);
    return null;
  }
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getTokenFromStorage();
      const userId = getUserIdFromToken(token);

      if (!token || !userId) {
        setError("Bạn cần đăng nhập để xem playlist của mình.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const res = await fetch(`${API_BASE}/users/${userId}/playlists`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Load user playlists error", {
            status: res.status,
            data,
          });
          throw new Error("Không tải được playlist của bạn.");
        }

        const data: Playlist[] = await res.json();
        setPlaylists(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Có lỗi xảy ra khi tải playlist.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      alert("Bạn hãy nhập tên playlist.");
      return;
    }

    const token = getTokenFromStorage();
    const userId = getUserIdFromToken(token);

    if (!token || !userId) {
      alert("Bạn cần đăng nhập để tạo playlist.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${API_BASE}/users/${userId}/playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Create playlist error", { status: res.status, data });
        throw new Error("Không tạo được playlist mới.");
      }

      const created: Playlist = await res.json();
      setPlaylists((prev) => [created, ...prev]);
      setNewName("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Không tạo được playlist mới.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-gradient-to-b from-[#130826] via-[#22114a] to-[#0a1b2a] px-6 pt-10 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#4CC3ED]">
              Thư viện
            </p>
            <h1 className="text-3xl font-bold text-white mt-1">
              Playlist của tôi
            </h1>
            <p className="text-sm text-zinc-200 mt-1">
              Quản lý những playlist bạn đã tạo và thêm bài hát.
            </p>
          </div>
        </div>

        {/* FORM TẠO PLAYLIST */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#4e148c]/50 via-[#4361ee]/40 to-[#4CC3ED]/40 p-[1px] shadow-lg">
          <div className="rounded-2xl bg-[#050816]/90 px-4 py-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-xs text-zinc-300 mb-1">
                Tạo playlist mới (trống)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên playlist..."
                  className="flex-1 rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#4CC3ED]/70"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="rounded-xl px-4 py-2 text-xs font-semibold bg-gradient-to-r from-[#4e148c] via-[#4361ee] to-[#4CC3ED] text-white shadow hover:brightness-110 disabled:opacity-60"
                >
                  {creating ? "Đang tạo..." : "Tạo playlist"}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 max-w-xs">
              Playlist sẽ được tạo trống. Bạn có thể thêm bài hát từ nút{" "}
              <span className="font-semibold">Playlist</span> trên TrackCard
              hoặc từ thanh player.
            </p>
          </div>
        </div>

        {/* STATUS */}
        {loading && (
          <p className="text-sm text-zinc-200">Đang tải playlist của bạn...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-200">{error}</p>
        )}

        {/* GRID PLAYLIST */}
        {!loading && !error && playlists.length === 0 && (
          <p className="text-sm text-zinc-200">
            Bạn chưa có playlist nào. Hãy tạo playlist đầu tiên bằng form phía
            trên.
          </p>
        )}

        {!loading && !error && playlists.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                href={`/playlists/${pl.id}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#24124f] via-[#1b2656] to-[#0a2433] p-4 hover:border-[#4CC3ED]/70 hover:shadow-[0_0_35px_rgba(76,195,237,0.4)] transition"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#4CC3ED]/40 rounded-full blur-2xl group-hover:bg-[#4CC3ED]/60 transition" />
                <div className="relative flex flex-col gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4CC3ED] shadow-lg flex items-center justify-center text-lg">
                    🎵
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white truncate">
                      {pl.name}
                    </h2>
                    <p className="text-xs text-zinc-300 mt-1">
                      Playlist cá nhân của bạn
                    </p>
                  </div>
                  <div className="mt-1 text-[11px] text-[#4CC3ED] opacity-80 group-hover:opacity-100">
                    Xem chi tiết →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
