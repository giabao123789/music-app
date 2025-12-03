"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AdminArtist = {
  id: string;
  name: string;
  avatar: string | null;
  userId: string | null;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: "USER" | "ARTIST" | "ADMIN";
    verified: boolean;
  } | null;
  tracks: {
    id: string;
    title: string;
    coverUrl: string;
    duration: number;
    createdAt: string;
  }[];
};

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("accessToken");
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchArtists = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/admin/artists`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Fetch /admin/artists failed:", res.status, text);
          setError(`API lỗi: ${res.status}`);
          setArtists([]);
          return;
        }

        const data = await res.json();
        console.log("Artists API data:", data);
        setArtists(data);
      } catch (e) {
        console.error("Error fetching artists:", e);
        setError("Không thể tải danh sách nghệ sĩ");
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [token]);

  if (!mounted) return null;

  if (!token) {
    return <div>Hãy đăng nhập trước.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quản lý nghệ sĩ</h2>
      {loading && <p>Đang tải...</p>}
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <div className="space-y-3">
        {artists.map((a) => (
          <div
            key={a.id}
            className="border border-neutral-800 rounded p-3 flex gap-3"
          >
            <div className="w-16 h-16 rounded bg-neutral-800 overflow-hidden">
              {a.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.avatar}
                  alt={a.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                  No avatar
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{a.name}</div>
              <div className="text-xs text-neutral-400">
                User: {a.user?.email ?? "N/A"}{" "}
                {a.user?.verified ? "(verified)" : ""}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Tracks: {a.tracks.length}
              </div>
            </div>
          </div>
        ))}

        {!loading && !error && artists.length === 0 && (
          <div>Chưa có nghệ sĩ nào.</div>
        )}
      </div>
    </div>
  );
}
