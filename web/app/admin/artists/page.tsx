// web/app/admin/artists/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { API_BASE } from "@/lib/config";
import { useRouter } from "next/navigation";

type ArtistAdmin = {
  id: string;
  name: string;
  avatar?: string | null;
  userId?: string | null;
  bio?: string | null;
  mainGenre?: string | null;

  // ✅ thêm
  followersCount?: number;
  totalPlays?: number;
};

type FollowerUser = {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string | Date | null;
};

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return res;
}

export default function AdminArtistsPage() {
  const router = useRouter(); // ✅ FIX router undefined

  const [artists, setArtists] = useState<ArtistAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ✅ followers modal
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [followersArtist, setFollowersArtist] = useState<ArtistAdmin | null>(
    null,
  );

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/admin/artists");

      if (!res.ok) {
        console.error("load artists status:", res.status);
        throw new Error("Failed to load artists");
      }

      const raw = await res.json();

      const normalized: ArtistAdmin[] = (raw as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        avatar: item.avatar ?? null,
        userId: item.userId ?? null,
        bio: item.bio ?? item.description ?? null,
        mainGenre: item.mainGenre ?? item.genre ?? null,

        // ✅ backend trả thì dùng, không có thì default
        followersCount:
          typeof item.followersCount === "number" ? item.followersCount : 0,
        totalPlays: typeof item.totalPlays === "number" ? item.totalPlays : 0,
      }));

      setArtists(normalized);
    } catch (e) {
      console.error("load artists error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const deleteArtist = async (id: string) => {
    if (!confirm("Xoá nghệ sĩ này? (Không xoá user tài khoản)")) return;
    try {
      setDeletingId(id);
      const res = await authFetch(`/admin/artists/${id}`, { method: "DELETE" });

      if (!res.ok) {
        console.error("delete artist status:", res.status);
        throw new Error("Delete artist failed");
      }

      await fetchArtists();
    } catch (e) {
      console.error("delete artist error", e);
      alert("Không thể xoá nghệ sĩ. Xem console để biết chi tiết.");
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredArtists =
    normalizedSearch === ""
      ? artists
      : artists.filter((a) => {
          const text = `${a.name} ${a.mainGenre || ""} ${a.userId || ""}`.toLowerCase();
          return text.includes(normalizedSearch);
        });

  const openFollowers = async (artist: ArtistAdmin) => {
    setFollowersArtist(artist);
    setFollowersOpen(true);
    setFollowersLoading(true);
    setFollowers([]);

    try {
      const res = await authFetch(`/admin/artists/${artist.id}/followers`);
      if (!res.ok) {
        console.error("load followers status:", res.status);
        throw new Error("Failed to load followers");
      }

      const data = (await res.json()) as FollowerUser[];
      setFollowers(data || []);
    } catch (e) {
      console.error("load followers error", e);
      setFollowers([]);
    } finally {
      setFollowersLoading(false);
    }
  };

  const closeFollowers = () => {
    setFollowersOpen(false);
    setFollowersArtist(null);
    setFollowers([]);
  };

  const followersTitle = useMemo(() => {
    if (!followersArtist) return "Người theo dõi";
    const count = followersArtist.followersCount ?? 0;
    return `Người theo dõi • ${followersArtist.name} (${count})`;
  }, [followersArtist]);

  return (
    <AdminGuard>
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-purple-900 via-black to-purple-950 text-blue-50 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-fuchsia-400 via-pink-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(244,114,182,0.9)]">
                Quản lý nghệ sĩ
              </h1>
              <p className="text-sm text-blue-200/80 mt-1">
                Click avatar/tên để vào trang nghệ sĩ. Click followers để xem danh sách.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Tìm tên, thể loại, userId..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-slate-950/70 border border-fuchsia-400/60 px-4 py-2 text-sm text-blue-50 placeholder:text-blue-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-fuchsia-300/80">
                {filteredArtists.length}/{artists.length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-fuchsia-500/40 shadow-[0_0_25px_rgba(236,72,153,0.45)] overflow-hidden">
            <div className="px-4 py-3 border-b border-fuchsia-500/40 flex items-center justify-between">
              <span className="text-sm uppercase tracking-wide text-fuchsia-300">
                Danh sách artist
              </span>
              {loading && (
                <span className="text-xs text-blue-200 animate-pulse">
                  Đang tải...
                </span>
              )}
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 sticky top-0 z-10">
                  <tr className="text-xs text-blue-200/80 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Tên</th>
                    
                    <th className="px-4 py-2 text-left hidden md:table-cell">
                      UserId
                    </th>
                    <th className="px-4 py-2 text-left hidden md:table-cell">
                      Thể loại
                    </th>

                    {/* ✅ NEW */}
                    <th className="px-4 py-2 text-right">Followers</th>
                    <th className="px-4 py-2 text-right hidden lg:table-cell">
                      Lượt nghe
                    </th>

                    <th className="px-4 py-2 text-right">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredArtists.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-slate-800/60 hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div
                          className="flex items-center gap-3 cursor-pointer hover:opacity-90"
                          onClick={() => router.push(`/artists/${a.id}`)}
                          title="Vào trang nghệ sĩ"
                        >
                          {a.avatar ? (
                            <img
                              src={resolveMediaUrl(a.avatar)}
                              alt={a.name}
                              className="w-9 h-9 rounded-full object-cover border border-fuchsia-400/80 shadow-[0_0_12px_rgba(236,72,153,0.7)]"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs text-blue-200">
                              {a.name?.[0]?.toUpperCase() || "A"}
                            </div>
                          )}

                          <div className="flex flex-col">
                            <span className="font-medium text-blue-50 hover:underline">
                              {a.name}
                            </span>
                            <span className="text-[11px] text-blue-300/70 md:hidden">
                              {a.mainGenre || "Không rõ thể loại"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-2 hidden md:table-cell text-xs text-blue-200/80">
                        {a.userId || a.id || (
                          <span className="italic">Không liên kết</span>
                        )}
                      </td>

                      <td className="px-4 py-2 hidden md:table-cell text-xs text-blue-200/80">
                        {a.mainGenre || "Không rõ"}
                      </td>

                      {/* ✅ followers click -> modal */}
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => openFollowers(a)}
                          className="text-xs px-3 py-1 rounded-full border border-cyan-400/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                          title="Xem danh sách người theo dõi"
                        >
                          {(a.followersCount ?? 0).toLocaleString("vi-VN")}
                        </button>
                      </td>

                      <td className="px-4 py-2 text-right hidden lg:table-cell text-xs text-blue-200/90">
                        {(a.totalPlays ?? 0).toLocaleString("vi-VN")}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => deleteArtist(a.id)}
                          disabled={deletingId === a.id}
                          className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_0_15px_rgba(248,113,113,0.8)] hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredArtists.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-blue-200/70 text-sm"
                      >
                        Không tìm thấy nghệ sĩ phù hợp với từ khoá.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ FOLLOWERS MODAL */}
          {followersOpen && (
            <div
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closeFollowers}
            >
              <div
                className="w-full max-w-2xl rounded-2xl border border-cyan-400/30 bg-slate-950/90 shadow-[0_0_40px_rgba(34,211,238,0.25)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-cyan-500/30 flex items-center justify-between">
                  <div className="text-sm font-semibold text-cyan-200">
                    {followersTitle}
                  </div>
                  <button
                    onClick={closeFollowers}
                    className="text-xs rounded-full border border-slate-600/60 bg-slate-900/70 px-3 py-1 hover:border-cyan-400 hover:text-cyan-200"
                  >
                    Đóng
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-auto">
                  {followersLoading ? (
                    <div className="p-4 text-sm text-blue-200/80 animate-pulse">
                      Đang tải danh sách followers...
                    </div>
                  ) : followers.length === 0 ? (
                    <div className="p-4 text-sm text-blue-200/70">
                      Chưa có người theo dõi.
                    </div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-900/80 sticky top-0 z-10">
                        <tr className="text-xs text-blue-200/80 uppercase tracking-wide">
                          <th className="px-4 py-2 text-left">Email</th>
                          <th className="px-4 py-2 text-left hidden md:table-cell">
                            Tên
                          </th>
                          <th className="px-4 py-2 text-left hidden lg:table-cell">
                            Ngày tạo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {followers.map((u) => (
                          <tr
                            key={u.id}
                            className="border-t border-slate-800/60 hover:bg-slate-900/60"
                          >
                            <td className="px-4 py-2 text-blue-100/90">
                              {u.email}
                            </td>
                            <td className="px-4 py-2 hidden md:table-cell text-blue-200/80">
                              {u.name || <span className="italic">—</span>}
                            </td>
                            <td className="px-4 py-2 hidden lg:table-cell text-xs text-slate-300">
                              {formatDateTime(u.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
