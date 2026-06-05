"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadTrackForm,
  UploadAlbumForm,
  type ArtistMe,
  type AlbumSummary,
} from "./upload-form";
import { API_BASE } from "@/lib/config";

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
};

type TrackSummary = {
  id: string;
  title: string;
  coverUrl?: string | null;
  audioUrl: string;
  duration: number;
  album?: { id: string; title: string } | null;
  createdAt?: string;
};

export default function ArtistUploadPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [artist, setArtist] = useState<ArtistMe | null>(null);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // state edit album
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [albumTitleDraft, setAlbumTitleDraft] = useState("");
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumSaving, setAlbumSaving] = useState(false);
  const [albumError, setAlbumError] = useState<string | null>(null);

  // state update track album
  const [updatingTrackId, setUpdatingTrackId] = useState<string | null>(null);

  // ============= auth / token =============
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user") ||
      null;

    if (!raw) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CurrentUser;
      setCurrentUser(parsed);

      if (parsed.role !== "ARTIST") {
        router.push("/");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  const getTokenFromStorage = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("mp:token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token")
    );
  };

  // helper upload cover file dùng ở phần edit album
  const uploadCoverForAlbum = async (file: File) => {
    const token = getTokenFromStorage();
    if (!token) throw new Error("Missing token");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/artist/me/upload-cover`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Upload cover thất bại");
    }

    return res.json() as Promise<{ url: string }>;
  };

  // ============= fetch data =============
  const fetchData = useCallback(async () => {
    const token = getTokenFromStorage();

    if (!token) {
      setErr("Không tìm thấy accessToken, vui lòng đăng nhập lại.");
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      const meRes = await fetch(`${API_BASE}/artist/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) {
        const data = await meRes.json().catch(() => null);
        setErr(
          data?.message ||
            `Không lấy được profile nghệ sĩ (status ${meRes.status})`
        );
        return;
      }

      const meJson = await meRes.json();
      setArtist({
        id: meJson.id,
        name: meJson.name,
        avatar: meJson.avatar,
      });

      const tracksRes = await fetch(`${API_BASE}/artist/me/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tracksJson = await tracksRes.json().catch(() => []);
      setTracks(
        (tracksJson || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          coverUrl: t.coverUrl,
          audioUrl: t.audioUrl,
          duration: t.duration,
          album: t.album ? { id: t.album.id, title: t.album.title } : null,
          createdAt: t.createdAt,
        }))
      );

      const albumsRes = await fetch(`${API_BASE}/artist/me/albums`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const albumsJson = await albumsRes.json().catch(() => []);
      setAlbums(albumsJson || []);
    } catch (e) {
      console.error("fetchData error", e);
      setErr("Không thể tải dữ liệu nghệ sĩ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============= actions: edit album =============
  const startEditAlbum = (album: AlbumSummary) => {
    setEditingAlbumId(album.id);
    setAlbumTitleDraft(album.title || "");
    setAlbumCoverFile(null);
    setAlbumError(null);
  };

  const cancelEditAlbum = () => {
    setEditingAlbumId(null);
    setAlbumTitleDraft("");
    setAlbumCoverFile(null);
    setAlbumError(null);
  };

  const saveAlbumChanges = async () => {
    if (!editingAlbumId) return;
    const token = getTokenFromStorage();
    if (!token) {
      setAlbumError("Không tìm thấy token, hãy đăng nhập lại.");
      return;
    }

    if (!albumTitleDraft.trim()) {
      setAlbumError("Vui lòng nhập tên album.");
      return;
    }

    try {
      setAlbumSaving(true);
      setAlbumError(null);

      let coverUrl: string | undefined;

      if (albumCoverFile) {
        const up = await uploadCoverForAlbum(albumCoverFile);
        coverUrl = up.url;
      }

      const body: any = { title: albumTitleDraft.trim() };
      if (coverUrl) body.coverUrl = coverUrl;

      const res = await fetch(
        `${API_BASE}/artist/me/albums/${editingAlbumId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Cập nhật album thất bại");
      }

      cancelEditAlbum();
      await fetchData();
    } catch (e: any) {
      console.error(e);
      setAlbumError(e.message || "Có lỗi khi cập nhật album.");
    } finally {
      setAlbumSaving(false);
    }
  };

  // ============= actions: đổi album của track =============
  const changeTrackAlbum = async (trackId: string, newAlbumId: string) => {
    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, hãy đăng nhập lại.");
      return;
    }

    try {
      setUpdatingTrackId(trackId);

      const body: any = {
        albumId: newAlbumId || null,
      };

      const res = await fetch(`${API_BASE}/artist/me/tracks/${trackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Cập nhật track thất bại");
      }

      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingTrackId(null);
    }
  };

  // ============= render =============
  if (!currentUser) {
    return (
      <div className="p-6 text-sm text-slate-200">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#041F31] via-[#072B44] to-[#020C1A] text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* HEADER */}
        <header className="mb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow">
              Artist Upload Center
            </h1>
            {artist && (
              <p className="text-sm text-slate-300">
                Đăng nhập với nghệ sĩ{" "}
                <span className="font-semibold text-cyan-300">
                  {artist.name}
                </span>
              </p>
            )}
          </div>
        </header>

        {/* ERROR */}
        {err && (
          <div className="rounded-xl border border-red-500/40 bg-red-900/40 px-4 py-3 text-sm text-red-100 mb-6">
            {err}
          </div>
        )}

        {/* UPLOAD FORMS */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* TRACK SINGLE */}
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-cyan-400/20 shadow-xl shadow-cyan-500/10">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300">
              🎵 Upload Track (Single)
            </h2>
            <UploadTrackForm
              artist={artist}
              albums={albums}
              onCreated={fetchData}
              enableLyrics={true}
              enableDuration={true}
            />
          </div>

          {/* TRACK VÀO ALBUM */}
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-blue-400/20 shadow-xl shadow-blue-500/10">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">
              💿 Upload Track vào Album
            </h2>
            <UploadTrackForm
              artist={artist}
              albums={albums}
              onCreated={fetchData}
              forceAlbumSelect={true}
              enableLyrics={true}
              enableDuration={true}
            />
          </div>

          {/* UPLOAD ALBUM COVER */}
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-indigo-400/20 shadow-xl shadow-indigo-500/10 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-indigo-300">
              🖼️ Upload Album Cover
            </h2>
            <UploadAlbumForm onCreated={fetchData} />
          </div>
        </div>

        {/* LISTS */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* TRACK LIST */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-semibold mb-3 text-cyan-300">
              Danh sách bài hát
            </h2>

            {loading ? (
              <p className="text-sm text-slate-300">Đang tải...</p>
            ) : tracks.length === 0 ? (
              <p className="text-sm text-slate-500">
                Bạn chưa upload bài nào 🎶
              </p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2 text-sm">
                {tracks.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-700">
                        {t.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${API_BASE}${t.coverUrl}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            No cover
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-slate-400">
                          {t.album ? `Album: ${t.album.title}` : "Single"}
                        </p>
                      </div>

                      <span className="text-xs text-slate-400">
                        {t.duration
                          ? `${Math.floor(t.duration / 60)}:${String(
                              t.duration % 60
                            ).padStart(2, "0")}`
                          : "--:--"}
                      </span>
                    </div>

                    {/* chọn album cho track */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        Thuộc album:
                      </span>
                      <select
                        className="flex-1 rounded-md border border-slate-600 bg-slate-950/80 px-2 py-1 text-xs"
                        value={t.album?.id || ""}
                        disabled={updatingTrackId === t.id}
                        onChange={(e) =>
                          changeTrackAlbum(t.id, e.target.value)
                        }
                      >
                        <option value="">
                          — Single / không thuộc album —
                        </option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ALBUM LIST + EDIT */}
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/10 shadow-xl">
            <h2 className="text-lg font-semibold mb-3 text-blue-300">
              Danh sách album
            </h2>

            {loading ? (
              <p className="text-sm">Đang tải...</p>
            ) : albums.length === 0 ? (
              <p className="text-sm text-slate-500">
                Bạn chưa có album 💿 – hãy upload cover và gán bài hát vào album.
              </p>
            ) : (
              <>
                {albumError && (
                  <div className="mb-3 rounded-md border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs text-red-100">
                    {albumError}
                  </div>
                )}
                <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2 text-sm">
                  {albums.map((a) => {
                    const isEditing = editingAlbumId === a.id;
                    return (
                      <li
                        key={a.id}
                        className="p-3 rounded-xl bg-slate-800/40 border border-white/10"
                      >
                        {!isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                              {a.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`${API_BASE}${a.coverUrl}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                  No cover
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {a.title}
                              </p>
                            </div>
                            <button
                              onClick={() => startEditAlbum(a)}
                              className="text-[11px] rounded-full border border-blue-400/60 px-3 py-1 text-blue-200 hover:bg-blue-500/20"
                            >
                              Sửa
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                {a.coverUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`${API_BASE}${a.coverUrl}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    No cover
                                  </div>
                                )}
                              </div>
                              <input
                                value={albumTitleDraft}
                                onChange={(e) =>
                                  setAlbumTitleDraft(e.target.value)
                                }
                                className="flex-1 rounded-md border border-blue-400/60 bg-slate-950/80 px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-slate-300">
                                Đổi ảnh cover (tuỳ chọn)
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                className="block w-full cursor-pointer text-[11px] text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-[11px] file:font-semibold file:text-slate-50 hover:file:bg-blue-500"
                                onChange={(e) =>
                                  setAlbumCoverFile(
                                    e.target.files?.[0] || null
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={saveAlbumChanges}
                                disabled={albumSaving}
                                className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow hover:brightness-110 disabled:opacity-60"
                              >
                                {albumSaving ? "Đang lưu..." : "Lưu"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditAlbum}
                                className="rounded-full border border-slate-500 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
                              >
                                Huỷ
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-[11px] text-slate-400">
                  Để thêm bài hát vào một album, hãy dùng form{" "}
                  <span className="text-blue-300 font-semibold">
                    “Upload Track vào Album”
                  </span>{" "}
                  bên trên hoặc đổi album của từng bài hát ở bảng bên trái.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
