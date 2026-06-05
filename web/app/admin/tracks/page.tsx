// web/app/admin/tracks/page.tsx
"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "USER" | "ARTIST" | "ADMIN";

type AdminTrack = {
  id: string;
  title: string;
  artistName?: string | null;
  albumTitle?: string | null;
  genre?: string | null;
  artistId?: string | null;

  coverUrl?: string | null;
  audioUrl?: string | null;

  isBlocked?: boolean;
  popularity?: number | null;
  createdAt?: string | null;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

type AlbumOption = {
  id: string;
  title: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("mp:token");

  if (fromStorage) return fromStorage;

  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);

  return null;
}

const GENRES = ["POP", "RNB", "INDIE", "EDM", "RAP", "BALLAD"] as const;

type ConfirmState =
  | null
  | {
      title: string;
      description?: string;
      confirmText?: string;
      danger?: boolean;
      onConfirm: () => Promise<void> | void;
    };

function normalizeAlbumsJson(json: any, artistId: string): AlbumOption[] {
  const arr: any[] =
    (Array.isArray(json) && json) ||
    json?.items ||
    json?.data ||
    json?.albums ||
    json?.rows ||
    [];

  let albums = (Array.isArray(arr) ? arr : []).map((a) => ({
    id: String(a?.id ?? a?._id ?? ""),
    title: String(a?.title ?? a?.name ?? a?.albumTitle ?? ""),
    _artistId: String(
      a?.artistId ?? a?.artist_id ?? a?.ownerArtistId ?? ""
    ),
  }));

  // ✅ nếu API trả ALL albums → lọc lại theo artistId
  const filtered = albums.filter((a) => a._artistId === artistId);
  if (filtered.length) albums = filtered;

  return albums
    .map(({ id, title }) => ({ id, title }))
    .filter((a) => a.id && a.title);
}

export default function AdminTracksPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // ✅ tổng số track server trả về
  const [total, setTotal] = useState(0);

  // paging
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ✅ LIMIT
  const LIMIT = 100;

  // filters
  const [keyword, setKeyword] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [artistFilter, setArtistFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editAlbum, setEditAlbum] = useState(""); // giữ để không phá UI cũ (hiện text)
  const [editAlbumId, setEditAlbumId] = useState<string>(""); // ✅ mới: albumId chọn từ dropdown

  // ✅ albums theo artistId (cache)
  const [albumByArtist, setAlbumByArtist] = useState<Record<string, AlbumOption[]>>({});
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [albumsError, setAlbumsError] = useState<string | null>(null);

  // ✅ upload file cover/audio
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"cover" | "audio" | null>(null);

  // ✅ modal confirm (thay window.confirm)
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // ==== LOAD USER + CHECK ADMIN ====
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("currentUser");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const u = JSON.parse(raw) as CurrentUser;
      setCurrentUser(u);
      if (u.role !== "ADMIN") router.push("/");
    } catch {
      router.push("/login");
    }
  }, [router]);

  // build query
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    if (keyword.trim()) params.set("search", keyword.trim());
    if (genreFilter) params.set("genre", genreFilter);
    if (artistFilter.trim()) params.set("artist", artistFilter.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    return params.toString();
  };

  const fetchTracks = async (signal?: AbortSignal) => {
    const token = getAuthToken();
    if (!token) return;

    const qs = buildQuery();
    const res = await fetch(`${API_BASE}/admin/tracks?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });

    if (!res.ok) {
      console.error("Fetch /admin/tracks failed", res.status);
      setTracks([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    const data = await res.json();
    const items: AdminTrack[] = Array.isArray(data?.items) ? data.items : [];

    const t = typeof data?.total === "number" ? data.total : 0;
    const computedPages = Math.max(1, Math.ceil((t || 0) / LIMIT));

    setTracks(items);
    setTotal(t);
    setTotalPages(
      typeof data?.totalPages === "number" ? data.totalPages : computedPages
    );

    if (computedPages > 0 && page > computedPages) {
      setPage(computedPages);
    }
  };

  // ==== FETCH TRACKS ====
  useEffect(() => {
    let alive = true;
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const ac = new AbortController();

    const t = setTimeout(async () => {
      try {
        await fetchTracks(ac.signal);
      } catch (err) {
        if (!alive) return;
        console.error("Error fetch /admin/tracks", err);
        setTracks([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, genreFilter, artistFilter, fromDate, toDate]);

  // (giữ lại filteredTracks để không phá UI cũ)
  const filteredTracks = useMemo(() => tracks, [tracks]);

  const refreshTracks = async () => {
    try {
      await fetchTracks();
    } catch (e) {
      console.error("Refresh tracks error", e);
    }
  };

  // ✅ fetch albums by artist (tự thử nhiều endpoint phổ biến)
const fetchAlbumsByArtist = async (artistId: string) => {
    if (!artistId || albumByArtist[artistId]) return;

    const token = getAuthToken();
    if (!token) return;

    setLoadingAlbums(true);
    setAlbumsError(null);

    const ENDPOINTS = [
      `${API_BASE}/artist/${artistId}/albums`,
      `${API_BASE}/albums?artistId=${artistId}`,
      `${API_BASE}/albums`,
    ];

    try {
      for (const url of ENDPOINTS) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;

        const json = await res.json();
        const albums = normalizeAlbumsJson(json, artistId);

        setAlbumByArtist((p) => ({ ...p, [artistId]: albums }));
        if (!albums.length) {
          setAlbumsError("Nghệ sĩ chưa có album.");
        }
        return;
      }
      setAlbumByArtist((p) => ({ ...p, [artistId]: [] }));
    } finally {
      setLoadingAlbums(false);
    }
  };


  // ==== HELPERS ====
  const startEdit = (track: AdminTrack) => {
    setEditingId(track.id);
    setEditTitle(track.title || "");
    setEditGenre(track.genre || "");
    setEditAlbum(track.albumTitle || "");

    // reset album pick
    setEditAlbumId("");

    // ✅ load albums cho đúng artist
    if (track.artistId) {
      fetchAlbumsByArtist(track.artistId);
    } else {
      setAlbumsError("Track này thiếu artistId nên không load được album.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditGenre("");
    setEditAlbum("");
    setEditAlbumId("");
    setAlbumsError(null);
  };

  // ==== ACTIONS ====
  const handleSaveEdit = async (trackId: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const payload: any = {
        title: editTitle,
        genre: editGenre || null,
      };

      // ✅ nếu chọn album => gửi albumId (không chọn thì thôi để khỏi phá)
      if (editAlbumId) payload.albumId = editAlbumId;

      const res = await fetch(`${API_BASE}/admin/tracks/${trackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Update track failed", res.status, txt);
        alert("Sửa metadata không thành công, xem log console.");
        return;
      }

      cancelEdit();
      await refreshTracks();
    } catch (err) {
      console.error("Update track error", err);
      alert("Có lỗi khi gọi API.");
    }
  };

  const handleToggleBlock = async (track: AdminTrack) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isBlocked: !track.isBlocked,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Toggle block failed", res.status, txt);
        alert("Khoá/Mở khoá không thành công.");
        return;
      }

      await refreshTracks();
    } catch (err) {
      console.error("Toggle block error", err);
    }
  };

  // ✅ confirm modal đẹp thay window.confirm
  const openDeleteConfirm = (track: AdminTrack) => {
    setConfirm({
      title: "Xoá bài hát này?",
      description: `Bạn chắc chắn muốn xoá bài "${track.title}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xoá",
      danger: true,
      onConfirm: async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
          setConfirmBusy(true);

          const res = await fetch(`${API_BASE}/admin/tracks/${track.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.error("Delete track failed", res.status, txt);
            alert("Xoá bài hát không thành công.");
            return;
          }

          setTracks((prev) => prev.filter((t) => t.id !== track.id));
          await refreshTracks();
        } catch (err) {
          console.error("Delete track error", err);
        } finally {
          setConfirmBusy(false);
          setConfirm(null);
        }
      },
    });
  };

  // ====== UPLOAD HELPERS (cover/audio) ======
  const uploadFile = async (file: File, type: "cover" | "audio") => {
    const token = getAuthToken();
    if (!token) throw new Error("Missing token");

    const fd = new FormData();
    fd.append("file", file);

    const uploadUrl =
      type === "cover"
        ? `${API_BASE}/artist/me/upload-cover`
        : `${API_BASE}/artist/me/upload-audio`;

    const up = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw new Error(txt || "Upload failed");
    }

    const json = await up.json();
    const url = json?.url;
    if (!url || typeof url !== "string") {
      throw new Error("Upload ok nhưng thiếu url trả về");
    }

    return url as string;
  };

  const patchTrack = async (trackId: string, payload: Record<string, any>) => {
    const token = getAuthToken();
    if (!token) throw new Error("Missing token");

    const res = await fetch(`${API_BASE}/admin/tracks/${trackId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Update track failed");
    }
  };

  const openCoverPicker = (trackId: string) => {
    setUploadingId(trackId);
    setUploadType("cover");
    if (coverInputRef.current) coverInputRef.current.value = "";
    coverInputRef.current?.click();
  };

  const openAudioPicker = (trackId: string) => {
    setUploadingId(trackId);
    setUploadType("audio");
    if (audioInputRef.current) audioInputRef.current.value = "";
    audioInputRef.current?.click();
  };

  const onPickCoverFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const trackId = uploadingId;
    if (!file || !trackId) return;

    try {
      setLoading(true);
      const url = await uploadFile(file, "cover");
      await patchTrack(trackId, { coverUrl: url });
      await refreshTracks();
    } catch (err: any) {
      console.error("Upload cover error", err);
      alert(err?.message || "Upload cover thất bại");
    } finally {
      setLoading(false);
      setUploadingId(null);
      setUploadType(null);
    }
  };

  const onPickAudioFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const trackId = uploadingId;
    if (!file || !trackId) return;

    try {
      setLoading(true);
      const url = await uploadFile(file, "audio");
      await patchTrack(trackId, { audioUrl: url });
      await refreshTracks();
    } catch (err: any) {
      console.error("Upload audio error", err);
      alert(err?.message || "Upload audio thất bại");
    } finally {
      setLoading(false);
      setUploadingId(null);
      setUploadType(null);
    }
  };

  const resetFilters = () => {
    setKeyword("");
    setGenreFilter("");
    setArtistFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#190734] via-[#200042] to-[#020617] text-white">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">
            Bạn không có quyền truy cập trang quản trị.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-full bg-[#4cc9f0] hover:bg-[#3aa7cb] text-black font-semibold shadow-lg shadow-cyan-500/40"
          >
            Về trang chủ
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#16003a] via-[#120027] to-black text-white">
      {/* ✅ hidden inputs để upload */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickCoverFile}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={onPickAudioFile}
      />

      <div className="max-w-6xl mx-auto px-4 pb-16 pt-10">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#4cc9f0] drop-shadow-[0_0_20px_rgba(76,201,240,0.9)]">
            Quản lý Tracks
          </h1>
          <p className="text-sm text-white/70 mt-2">
            Filter theo genre / artist / ngày tạo, tìm kiếm toàn bộ DB, và quản lý trực tiếp từng track.
          </p>
          
        </div>

        {/* FILTER BAR */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <input
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="Search: tên bài / album / artist..."
              className="w-full rounded-2xl bg-gradient-to-r from-[#1f0745] to-[#090317] border border-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/60 shadow-[0_0_25px_rgba(0,0,0,0.7)]"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={genreFilter}
              onChange={(e) => {
                setPage(1);
                setGenreFilter(e.target.value);
              }}
              className="w-full rounded-2xl bg-black/35 border border-white/10 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/50"
            >
              <option value="">Tất cả genre</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <input
              value={artistFilter}
              onChange={(e) => {
                setPage(1);
                setArtistFilter(e.target.value);
              }}
              placeholder="Artist (vd: Đàm, Sơn...)"
              className="w-full rounded-2xl bg-black/35 border border-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/50"
            />
          </div>

          <div className="sm:col-span-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPage(1);
                setFromDate(e.target.value);
              }}
              className="w-full rounded-2xl bg-black/35 border border-white/10 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/50"
              title="Từ ngày"
            />
          </div>

          <div className="sm:col-span-1">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
              className="w-full rounded-2xl bg-black/35 border border-white/10 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/50"
              title="Đến ngày"
            />
          </div>

          <div className="sm:col-span-12 flex items-center gap-3 justify-between mt-1">
            <div className="text-xs text-white/60">
              Đang hiển thị:{" "}
              <span className="text-white/80">{filteredTracks.length}</span>{" "}
              tracks (trang {page}/{totalPages}) • Tổng bài hát:{" "}
              <span className="text-white/80">{total}</span>
            </div>

            <div className="flex items-center gap-2">
              

              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-white/10 text-sm hover:border-[#4cc9f0]/40"
              >
                Reset filter
              </button>

              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-2 rounded-xl border border-white/10 text-sm disabled:opacity-50 hover:border-[#4cc9f0]/40"
              >
                Trang trước
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-2 rounded-xl border border-white/10 text-sm disabled:opacity-50 hover:border-[#4cc9f0]/40"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-10 text-white/70">
              Đang tải...
              {uploadingId && uploadType ? (
                <div className="mt-2 text-[11px] text-white/50">
                  Đang upload {uploadType === "cover" ? "cover" : "audio"} cho track:{" "}
                  <span className="text-white/70">{uploadingId}</span>
                </div>
              ) : null}
            </div>
          )}

          {!loading && filteredTracks.length === 0 && (
            <div className="text-center py-10 text-white/60">
              Không tìm thấy track phù hợp với filter.
            </div>
          )}

          {!loading &&
            filteredTracks.map((track) => {
              const isEditing = editingId === track.id;
              const artistId = track.artistId || "";
              const albums = artistId ? albumByArtist[artistId] || [] : [];

              return (
                <div
                  key={track.id}
                  className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center px-4 py-3 rounded-2xl bg-gradient-to-r from-[#1b083a] to-[#050814] border border-white/5 shadow-[0_0_35px_rgba(0,0,0,0.7)] hover:border-[#4cc9f0]/40 hover:shadow-[0_0_35px_rgba(76,201,240,0.35)] transition-all"
                >
                  {/* COVER */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                      {track.coverUrl ? (
                        <img
                          src={resolveMediaUrl(track.coverUrl)}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-white/40">No cover</span>
                      )}
                    </div>
                  </div>

                  {/* INFO + EDIT */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {isEditing ? (
                      <div className="rounded-2xl border border-cyan-400/25 bg-[radial-gradient(80%_80%_at_10%_0%,rgba(76,201,240,0.14),transparent_60%),radial-gradient(60%_60%_at_100%_20%,rgba(168,85,247,0.12),transparent_55%),linear-gradient(to_bottom,rgba(2,6,23,0.55),rgba(2,6,23,0.85))] p-3 shadow-[0_0_30px_rgba(76,201,240,0.18)]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-white/60">
                            Đang chỉnh sửa •{" "}
                            <span className="font-mono text-white/70">{track.id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
                              EDIT MODE
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] text-white/55 mb-1">
                              Tên bài hát
                            </label>
                            <input
                              className="w-full rounded-xl bg-black/35 border border-cyan-400/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/50 focus:border-[#4cc9f0]/40"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Nhập tên bài..."
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] text-white/55 mb-1">
                              Genre
                            </label>
                            <select
                              value={editGenre}
                              onChange={(e) => setEditGenre(e.target.value)}
                              className="w-full rounded-xl bg-black/35 border border-cyan-400/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4cc9f0]/45 focus:border-[#4cc9f0]/40"
                            >
                              <option value="">(Trống)</option>
                              {GENRES.map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* ✅ Album dropdown */}
                         
                        </div>

                        {albumsError && (
                          <div className="mt-2 text-[11px] text-amber-200/90">
                            {albumsError}
                          </div>
                        )}

                        
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-base sm:text-lg truncate">
                            {track.title}
                          </p>
                          {track.isBlocked && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 border border-red-400/40">
                              ĐÃ KHOÁ
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white/60 truncate">
                          {track.artistId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/artists/${track.artistId}`)}
                              className="text-[#4cc9f0] hover:text-white underline underline-offset-2"
                              title="Mở trang nghệ sĩ"
                            >
                              {track.artistName || "Không rõ nghệ sĩ"}
                            </button>
                          ) : (
                            <span>{track.artistName || "Không rõ nghệ sĩ"}</span>
                          )}
                          {track.albumTitle ? ` • Album: ${track.albumTitle}` : ""}
                        </p>

                        <p className="text-[11px] text-white/45">
                          Tạo:{" "}
                          {track.createdAt
                            ? new Date(track.createdAt).toLocaleString("vi-VN")
                            : "—"}
                        </p>

                        <p className="text-[11px] text-white/40">
                          {track.genre && (
                            <span className="mr-3">
                              Thể loại:{" "}
                              <span className="text-white/70">{track.genre}</span>
                            </span>
                          )}
                          {typeof track.popularity === "number" && (
                            <span>
                              Lượt nghe:{" "}
                              <span className="text-white/70">{track.popularity}</span>
                            </span>
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex-shrink-0 flex flex-wrap gap-2 justify-end">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(track.id)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-400 to-cyan-300 text-black shadow-[0_0_22px_rgba(52,211,153,0.25)] hover:opacity-95"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 text-white"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(track)}
                          className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/15 hover:border-cyan-200/40 shadow-[0_0_18px_rgba(76,201,240,0.12)]"
                        >
                          Sửa
                        </button>


                        <button
                          onClick={() => openCoverPicker(track.id)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-white shadow-md shadow-purple-500/40"
                          title="Upload cover mới"
                        >
                          Đổi cover
                        </button>

                        <button
                          onClick={() => openAudioPicker(track.id)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-md shadow-indigo-500/40"
                          title="Upload audio mới"
                        >
                          Đổi audio
                        </button>

                        <button
                          onClick={() => openDeleteConfirm(track)}
                          className="px-3 py-1 rounded-full text-xs font-semibold bg-red-700 hover:bg-red-600 text-white shadow-md shadow-red-700/40"
                        >
                          Xoá
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ===== Modal confirm đẹp (thay window.confirm) ===== */}
      {confirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => (!confirmBusy ? setConfirm(null) : null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-300/20 bg-slate-950/85 p-4 shadow-[0_0_55px_rgba(76,201,240,0.16)]">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-white">
                  {confirm.title}
                </div>
                {confirm.description && (
                  <div className="mt-1 text-xs text-slate-300 whitespace-pre-line">
                    {confirm.description}
                  </div>
                )}
              </div>
              <button
                className="rounded-full border border-cyan-300/20 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/60"
                onClick={() => (!confirmBusy ? setConfirm(null) : null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="relative mt-4 flex items-center justify-end gap-2">
              <button
                className="rounded-full border border-cyan-300/15 bg-slate-900/35 px-4 py-2 text-xs text-slate-200 hover:bg-slate-900/55 disabled:opacity-50"
                disabled={confirmBusy}
                onClick={() => setConfirm(null)}
              >
                Huỷ
              </button>

              <button
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50",
                  confirm.danger
                    ? "bg-rose-500/90 text-white hover:bg-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.18)]"
                    : "bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 hover:opacity-95 shadow-[0_0_22px_rgba(76,201,240,0.16)]",
                ].join(" ")}
                disabled={confirmBusy}
                onClick={async () => {
                  try {
                    setConfirmBusy(true);
                    await confirm.onConfirm();
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
              >
                {confirmBusy ? "Đang xử lý..." : confirm.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
