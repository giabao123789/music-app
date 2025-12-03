"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";
import TrackCard from "@/components/TrackCard";
import {
  usePlayer,
  type Track as PlayerTrack,
} from "@/app/providers/PlayerProvider";

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
};

type AlbumTrack = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl?: string | null;
  duration?: number | null;
  genre?: string | null;
  artist?: { id: string; name: string | null } | null;
};

type AlbumDetail = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseAt: string | null;
  artist: { id: string; name: string | null } | null;
  tracks: AlbumTrack[];
};

type MyArtist = {
  id: string;
  name: string;
};

function getTokenFromStorage() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

/** Map track từ API album → track chuẩn PlayerProvider */
function mapToPlayerTrack(t: AlbumTrack): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    duration: t.duration ?? 0,
    coverUrl: t.coverUrl ? `${API_BASE}${t.coverUrl}` : "/default-cover.jpg",
    audioUrl: t.audioUrl ? `${API_BASE}${t.audioUrl}` : "",
    artist: { name: t.artist?.name ?? null },
  };
}

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { playNow, setQueue } = usePlayer();

  const albumId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myArtist, setMyArtist] = useState<MyArtist | null>(null);
  const [myTracks, setMyTracks] = useState<AlbumTrack[]>([]);
  const [loadingMyTracks, setLoadingMyTracks] = useState(false);

  // edit album
  const [editTitle, setEditTitle] = useState("");
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [albumMsg, setAlbumMsg] = useState<string | null>(null);

  // drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("user") ||
      null;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CurrentUser;
      setCurrentUser(parsed);
    } catch {
      // ignore
    }
  }, []);

  const fetchAlbum = useCallback(async () => {
    if (!albumId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/albums/${albumId}`);
      if (!res.ok) {
        throw new Error("Không thể tải album");
      }
      const data: AlbumDetail = await res.json();
      setAlbum(data);
      setTracks(data.tracks || []);
      setEditTitle(data.title || "");
      setAlbumMsg(null);
    } catch (e: any) {
      console.error("fetchAlbum error:", e);
      setError("Không thể tải thông tin album");
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    fetchAlbum();
  }, [fetchAlbum]);

  useEffect(() => {
    const token = getTokenFromStorage();
    if (!token) return;

    let cancelled = false;

    async function fetchMeAndTracks() {
      try {
        // /artist/me
        const meRes = await fetch(`${API_BASE}/artist/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (!cancelled) {
            setMyArtist({ id: meJson.id, name: meJson.name });
          }
        }

        // /artist/me/tracks
        setLoadingMyTracks(true);
        const trRes = await fetch(`${API_BASE}/artist/me/tracks`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (trRes.ok) {
          const list = await trRes.json();
          if (!cancelled) {
            const mapped: AlbumTrack[] = (list || []).map((t: any) => ({
              id: t.id,
              title: t.title,
              audioUrl: t.audioUrl,
              coverUrl: t.coverUrl,
              duration: t.duration,
              genre: t.genre ?? null,
              artist: t.artist
                ? { id: t.artist.id, name: t.artist.name }
                : null,
            }));
            setMyTracks(mapped);
          }
        }
      } catch (e) {
        console.error("fetchMeAndTracks error:", e);
      } finally {
        if (!cancelled) setLoadingMyTracks(false);
      }
    }

    fetchMeAndTracks();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOwner = useMemo(() => {
    if (!album || !myArtist) return false;
    if (!album.artist) return false;
    return album.artist.id === myArtist.id;
  }, [album, myArtist]);

  const tracksNotInAlbum = useMemo(() => {
    if (!myTracks.length || !album) return [];
    const idsInAlbum = new Set(tracks.map((t) => t.id));
    return myTracks.filter((t) => !idsInAlbum.has(t.id));
  }, [myTracks, tracks, album]);

  const [selectedAddTrackId, setSelectedAddTrackId] = useState<string>("");

  const handlePlayAlbum = () => {
    if (!tracks.length) return;
    const queue = tracks.map(mapToPlayerTrack);
    setQueue(queue);
    playNow(queue[0]);
  };

  const handleDeleteAlbum = async () => {
    if (!album) return;
    if (!isOwner) return;
    if (
      !confirm(
        "Bạn chắc chắn muốn xoá album này? Các bài trong album sẽ trở thành single."
      )
    )
      return;

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, vui lòng đăng nhập lại.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/artist/me/albums/${album.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("deleteAlbum error:", txt);
        alert("Xoá album thất bại.");
        return;
      }

      alert("Đã xoá album.");
      router.back();
    } catch (e) {
      console.error("deleteAlbum error:", e);
      alert("Có lỗi khi xoá album.");
    }
  };

  const handleSaveAlbumInfo = async () => {
    if (!album || !isOwner) return;
    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSavingAlbum(true);
      setAlbumMsg(null);

      const res = await fetch(`${API_BASE}/artist/me/albums/${album.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("updateAlbum error:", txt);
        alert("Cập nhật album thất bại.");
        return;
      }

      setAlbumMsg("Đã lưu thông tin album ✨");
      fetchAlbum();
    } catch (e) {
      console.error("handleSaveAlbumInfo error:", e);
      alert("Có lỗi khi lưu album.");
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!album || !isOwner) return;
    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSavingAlbum(true);
      setAlbumMsg(null);

      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch(`${API_BASE}/artist/me/upload-cover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!up.ok) {
        const txt = await up.text().catch(() => "");
        console.error("upload-cover error:", txt);
        alert("Upload cover thất bại.");
        return;
      }

      const json = await up.json();
      const coverUrl = json.url;

      const res = await fetch(`${API_BASE}/artist/me/albums/${album.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coverUrl }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("update cover error:", txt);
        alert("Cập nhật cover thất bại.");
        return;
      }

      setAlbumMsg("Đã cập nhật ảnh bìa 💿");
      fetchAlbum();
    } catch (e) {
      console.error("handleUploadCover error:", e);
      alert("Có lỗi khi cập nhật cover.");
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!isOwner) return;
    if (!confirm("Bạn chắc chắn muốn xoá bài hát này khỏi hệ thống?")) return;

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, vui lòng đăng nhập lại.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/artist/me/tracks/${trackId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("deleteTrack error:", txt);
        alert("Xoá bài hát thất bại.");
        return;
      }

      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (e) {
      console.error("handleDeleteTrack error:", e);
      alert("Có lỗi khi xoá bài hát.");
    }
  };

  const handleAddTrackToAlbum = async () => {
    if (!isOwner || !album) return;
    if (!selectedAddTrackId) {
      alert("Vui lòng chọn bài hát để thêm.");
      return;
    }

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token, vui lòng đăng nhập lại.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/artist/me/tracks/${selectedAddTrackId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ albumId: album.id }),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("addTrackToAlbum error:", txt);
        alert("Không thể thêm bài hát vào album.");
        return;
      }

      setSelectedAddTrackId("");
      fetchAlbum();
    } catch (e) {
      console.error("handleAddTrackToAlbum error:", e);
      alert("Có lỗi khi thêm bài hát vào album.");
    }
  };

  const saveNewOrder = async (orderedIds: string[]) => {
    if (!isOwner || !album) return;
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setSavingOrder(true);
      const res = await fetch(
        `${API_BASE}/artist/me/albums/${album.id}/reorder`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ trackIds: orderedIds }),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("reorder error:", txt);
      }
    } catch (e) {
      console.error("saveNewOrder error:", e);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (id: string) => {
    if (!isOwner) return;
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isOwner) return;
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!isOwner) return;
    if (!draggingId || draggingId === targetId) return;

    setTracks((prev) => {
      const currentIndex = prev.findIndex((t) => t.id === draggingId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);

      // save order to backend
      saveNewOrder(next.map((t) => t.id));

      return next;
    });

    setDraggingId(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-cyan-200/80">
        Đang tải album...
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-red-400">
          {error || "Không tìm thấy album"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-100 shadow hover:bg-slate-800"
        >
          ⟵ Quay lại
        </button>
      </div>
    );
  }

  return (
    <div
      ref={topRef}
      className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-b from-[#061c2c] via-[#020916] to-black text-slate-50"
    >
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 px-5 pt-6 pb-32 max-w-5xl mx-auto w-full">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:gap-6">
          <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-3xl border border-cyan-300/60 bg-slate-900/80 shadow-[0_0_80px_rgba(56,189,248,0.7)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                album.coverUrl ? `${API_BASE}${album.coverUrl}` : "/default-cover.jpg"
              }
              alt={album.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-cyan-300/80">
                Album
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_30px_rgba(56,189,248,0.6)]">
                {album.title}
              </h1>
              {album.artist && (
                <p className="mt-1 text-sm text-slate-300">
                  Nghệ sĩ:{" "}
                  <span className="font-semibold text-cyan-200">
                    {album.artist.name}
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {tracks.length} bài hát
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePlayAlbum}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4CC3ED] via-[#22d3ee] to-[#6366f1] px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
              >
                ▶ Phát album
              </button>
              <button
                onClick={() => router.back()}
                className="rounded-full border border-slate-600/70 bg-slate-950/70 px-4 py-2 text-xs hover:bg-slate-900"
              >
                ⟵ Quay lại
              </button>
              {isOwner && (
                <>
                  <span className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-100">
                    Bạn là chủ sở hữu album này
                  </span>
                  <button
                    onClick={handleDeleteAlbum}
                    className="rounded-full border border-red-500/70 bg-red-500/15 px-4 py-2 text-xs font-medium text-red-100 hover:bg-red-500/25"
                  >
                    ❌ Xoá album
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* OWNER PANEL */}
        {isOwner && (
          <section className="mb-6 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-slate-950/80 via-slate-900/90 to-sky-950/80 p-4 text-xs shadow-[0_0_40px_rgba(56,189,248,0.4)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Quản lý album (chỉ mình bạn thấy)
              </h2>
              {savingAlbum && (
                <span className="text-[11px] text-cyan-200">
                  Đang lưu thay đổi...
                </span>
              )}
            </div>

            {albumMsg && (
              <div className="mb-2 rounded-md border border-emerald-500/70 bg-emerald-500/15 px-3 py-2 text-[11px] text-emerald-100">
                {albumMsg}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Tên album
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-cyan-500/40 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                    placeholder="Tên album"
                  />
                </div>

                <button
                  onClick={handleSaveAlbumInfo}
                  className="rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow hover:brightness-110"
                >
                  Lưu thông tin album
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Ảnh bìa album
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer text-[11px] text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCover(file);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Chọn ảnh mới để cập nhật cover. Nếu không chọn, ảnh bìa giữ nguyên.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Thêm bài hát vào album
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 rounded-lg border border-cyan-500/40 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-50 outline-none"
                      value={selectedAddTrackId}
                      onChange={(e) => setSelectedAddTrackId(e.target.value)}
                      disabled={loadingMyTracks}
                    >
                      <option value="">
                        {loadingMyTracks
                          ? "Đang tải danh sách bài hát..."
                          : "Chọn bài hát để thêm"}
                      </option>
                      {tracksNotInAlbum.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddTrackToAlbum}
                      className="rounded-full bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      + Thêm
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Chỉ hiển thị các bài hát của bạn chưa thuộc album này.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TRACKS LIST + DRAG & DROP */}
        <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow shadow-black/60">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              Danh sách bài hát trong album
            </h2>
            {savingOrder && (
              <span className="text-[11px] text-cyan-200">
                Đang lưu thứ tự bài hát...
              </span>
            )}
          </div>

          {tracks.length === 0 ? (
            <p className="text-sm text-slate-500">
              Album hiện chưa có bài hát nào.
            </p>
          ) : (
            <div className="space-y-2">
              {tracks.map((t) => (
                <div
                  key={t.id}
                  className={`relative flex items-stretch gap-2 rounded-2xl ${
                    draggingId === t.id ? "bg-cyan-500/10" : "bg-transparent"
                  }`}
                  draggable={isOwner}
                  onDragStart={() => handleDragStart(t.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(t.id)}
                >
                  {isOwner && (
                    <div className="flex w-8 items-center justify-center">
                      <div className="flex flex-col items-center justify-center gap-[2px] text-cyan-300/80">
                        <span className="h-[2px] w-4 rounded-full bg-cyan-300/70" />
                        <span className="h-[2px] w-4 rounded-full bg-cyan-300/70" />
                        <span className="h-[2px] w-4 rounded-full bg-cyan-300/70" />
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <TrackCard track={mapToPlayerTrack(t)} />
                  </div>

                  {isOwner && (
                    <div className="flex items-center gap-2 px-2">
                      {/* NÚT SỬA TRACK */}
                      <button
                        onClick={() =>
                          router.push(`/artist/tracks/${t.id}/edit`)
                        }
                        className="rounded-full border border-cyan-500/70 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/25"
                      >
                        ✏️ Sửa
                      </button>

                      {/* NÚT XOÁ TRACK */}
                      <button
                        onClick={() => handleDeleteTrack(t.id)}
                        className="rounded-full border border-red-500/70 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-100 hover:bg-red-500/25"
                      >
                        Xoá
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
