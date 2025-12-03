// web/components/PlaylistSelectDialog.tsx
"use client";

import { useEffect, useState } from "react";
import type React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Playlist = {
  id: string;
  name: string;
  coverUrl?: string | null;
  tracksCount?: number;
};

type Props = {
  trackId: string;
  open: boolean;
  onClose: () => void;
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

// Lấy userId từ JWT (payload có dạng { sub: userId, email, role } hoặc { userId })
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

export default function PlaylistSelectDialog({ trackId, open, onClose }: Props) {
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingPlaylistId, setAddingPlaylistId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open) return;

    const token = getTokenFromStorage();
    const uid = getUserIdFromToken(token);

    if (!token || !uid) {
      setError("Bạn cần đăng nhập để sử dụng playlist.");
      setPlaylists([]);
      setUserId(null);
      return;
    }

    setUserId(uid);

    async function load() {
      try {
        setError(null);
        setLoadingPlaylists(true);

        const plsRes = await fetch(`${API_BASE}/users/${uid}/playlists`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!plsRes.ok) {
          const data = await plsRes.json().catch(() => null);
          console.error("Load playlists error", { status: plsRes.status, data });
          throw new Error("Không tải được danh sách playlist.");
        }

        const data: Playlist[] = await plsRes.json();
        setPlaylists(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Có lỗi xảy ra khi tải playlist.");
      } finally {
        setLoadingPlaylists(false);
      }
    }

    load();
  }, [open]);

  async function handleAddToPlaylist(playlistId: string) {
    const token = getTokenFromStorage();
    if (!token) {
      alert("Bạn cần đăng nhập để sử dụng playlist.");
      return;
    }

    try {
      setAddingPlaylistId(playlistId);
      setError(null);

      const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trackId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Add to playlist error", { status: res.status, data });
        throw new Error("Không thêm được bài hát vào playlist.");
      }

      alert("Đã thêm bài hát vào playlist.");
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Không thêm được bài hát vào playlist.");
    } finally {
      setAddingPlaylistId(null);
    }
  }

  // Tạo playlist mới và TỰ ĐỘNG thêm bài hiện tại vào playlist đó
  async function handleCreateAndAdd(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    const name = newName.trim();
    if (!name) {
      alert("Bạn hãy nhập tên playlist.");
      return;
    }

    const token = getTokenFromStorage();
    const uid = userId ?? getUserIdFromToken(token);

    if (!token || !uid) {
      alert("Bạn cần đăng nhập để tạo playlist.");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${API_BASE}/users/${uid}/playlists`, {
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

      // cập nhật list playlist trên UI
      setPlaylists((prev) => [...prev, created]);
      setNewName("");

      // sau khi tạo xong → thêm luôn bài hiện tại vào playlist đó
      await handleAddToPlaylist(created.id);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Không tạo được playlist mới.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900/90 p-4 shadow-2xl backdrop-blur-xl border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Thêm vào playlist</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* FORM TẠO PLAYLIST MỚI */}
        <div className="mb-3 space-y-2">
          <label className="text-xs text-zinc-300">
            Tạo playlist mới và thêm bài hát này
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên playlist..."
              className="flex-1 rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={creating}
              className="rounded-xl px-3 py-2 text-xs font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-110 disabled:opacity-60"
            >
              {creating ? "Đang tạo..." : "Tạo & thêm"}
            </button>
          </div>
          <p className="text-[11px] text-zinc-400">
            Playlist sẽ được tạo mới và bài hát hiện tại được thêm vào ngay.
          </p>
        </div>

        {/* TRẠNG THÁI TẢI PLAYLIST */}
        {loadingPlaylists && (
          <div className="py-3 text-sm text-zinc-300">
            Đang tải danh sách playlist...
          </div>
        )}

        {!loadingPlaylists && playlists.length === 0 && !error && (
          <div className="py-2 text-xs text-zinc-300">
            Hiện bạn chưa có playlist nào. Bạn có thể tạo playlist mới ở phía
            trên.
          </div>
        )}

        {/* DANH SÁCH PLAYLIST CÓ SẴN */}
        {!loadingPlaylists && playlists.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mt-2">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                disabled={addingPlaylistId === pl.id}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-60"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{pl.name}</span>
                  {pl.tracksCount != null && (
                    <span className="text-xs text-zinc-400">
                      {pl.tracksCount} bài hát
                    </span>
                  )}
                </div>
                <span className="text-xs text-purple-300">
                  {addingPlaylistId === pl.id ? "Đang thêm..." : "Thêm"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
