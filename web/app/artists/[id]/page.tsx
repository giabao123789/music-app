// web/app/artists/[id]/page.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";
import { usePlayer } from "@/app/providers/PlayerProvider";
import TrackCard from "@/components/TrackCard";

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
};

type ArtistTrack = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl?: string | null;
  duration?: number | null;
  popularity?: number | null; //
  genre?: string | null;
  album?: { id: string; title: string } | null;
  artist?: { id: string; name: string | null } | null;
};

type ArtistAlbum = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseAt: string | null;
  tracksCount: number;
};

type ArtistDetail = {
  id: string;
  userId?: string | null;
  name: string;
  avatar: string | null;
  bio?: string | null;
  mainGenre?: string | null;
  tracksCount: number;
  albums: ArtistAlbum[];
  tracks: ArtistTrack[];
};

type ArtistItem = {
  id: string;
  name: string;
  avatar: string | null;
  tracksCount: number;
  albumsCount: number;
};

type FollowStatus = {
  followersCount: number;
  isFollowing: boolean;
};

// Helper chuẩn hoá URL media
function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

/** MAP TRACK → FORMAT CHUẨN PLAYER */
function mapToPlayerTrack(t: ArtistTrack) {
  return {
    id: t.id,
    title: t.title,
    duration: t.duration ?? 0,
    coverUrl: resolveMediaUrl(t.coverUrl),
    audioUrl: resolveMediaUrl(t.audioUrl),
    artist: { name: t.artist?.name ?? null },
     popularity: t.popularity ?? 0,
  };
}

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

export default function ArtistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { playNow, setQueue } = usePlayer();

  const artistId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allArtists, setAllArtists] = useState<ArtistItem[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);

  // quản lý filter album
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // form chỉnh sửa trang nghệ sĩ (chỉ chủ mới thấy)
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const tracksSectionRef = useRef<HTMLDivElement | null>(null);

    // FOLLOW
  const [follow, setFollow] = useState<FollowStatus | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  // FOLLOWERS MODAL (artist xem danh sách người theo dõi)
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersErr, setFollowersErr] = useState<string | null>(null);
  const [followers, setFollowers] = useState<
    { id: string; name: string | null }[]
  >([]);

  const openFollowers = async () => {
  const token = getTokenFromStorage();
  if (!token) {
    router.push("/login");
    return;
  }
  if (!artist) return;

  // ✅ chỉ owner hoặc admin mới xem list followers
  if (!canEdit) return;

  setFollowersOpen(true);
  setFollowersLoading(true);
  setFollowersErr(null);

  try {
    const url = isOwner
      ? `${API_BASE}/artist/me/followers`
      : `${API_BASE}/admin/artists/${artist.id}/followers`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Failed to load followers");
    }

    const data = await res.json();

    const list =
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.followers) && data.followers) ||
      (Array.isArray(data) && data) ||
      [];

    setFollowers(list);
  } catch (e: any) {
    setFollowersErr(e?.message || "Failed to load followers");
    setFollowers([]);
  } finally {
    setFollowersLoading(false);
  }
};


  const closeFollowers = () => {
    setFollowersOpen(false);
  };

  /** LOAD CURRENT USER TỪ LOCALSTORAGE */
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

  const isOwner = useMemo(() => {
  if (!artist || !currentUser) return false;
  if (!artist.userId) return false;
  return artist.userId === currentUser.id;
}, [artist, currentUser]);

const canEdit = useMemo(() => {
  if (!currentUser) return false;
  return isOwner || currentUser.role === "ADMIN";
}, [isOwner, currentUser]);
const isAdmin = useMemo(() => {
  return currentUser?.role === "ADMIN";
}, [currentUser]);

const getProfilePatchUrl = useCallback(() => {
  // owner => route artist/me
  if (isOwner) return `${API_BASE}/artist/me/profile`;
  // admin sửa artist đang xem => route admin/artists/:id
  return `${API_BASE}/admin/artists/${artistId}`;
}, [isOwner, artistId]);

  /** FETCH ARTIST DETAIL */
  const fetchArtist = useCallback(async () => {
    if (!artistId) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/artist/${artistId}`);
      if (!res.ok) throw new Error();

      const data: ArtistDetail = await res.json();

      setArtist(data);
      setError(null);

      // sync form
      setDisplayName(data.name || "");
      setBio(data.bio || "");
    } catch {
      setError("Không thể tải thông tin nghệ sĩ");
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    fetchArtist();
  }, [fetchArtist]);

  /** FETCH ALL ARTISTS FOR SUGGESTION */
  useEffect(() => {
    let cancelled = false;

    async function fetchArtists() {
      try {
        setLoadingArtists(true);
        const res = await fetch(`${API_BASE}/artist`);
        if (!res.ok) throw new Error();

        const data: ArtistItem[] = await res.json();

        if (!cancelled) setAllArtists(data);
      } catch {
        console.error("Error loading artists");
      } finally {
        if (!cancelled) setLoadingArtists(false);
      }
    }

    fetchArtists();
    return () => {
      cancelled = true;
    };
  }, []);

  /** FETCH FOLLOW COUNT PUBLIC */
  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;

    async function fetchFollow() {
      try {
        const res = await fetch(`${API_BASE}/artist/${artistId}/follow-count`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setFollow({
            followersCount: data.followersCount ?? 0,
            isFollowing: data.isFollowing ?? false,
          });
        }
      } catch (e) {
        console.error("[Follow] fetch error", e);
        if (!cancelled) {
          setFollow({
            followersCount: 0,
            isFollowing: false,
          });
        }
      }
    }

    fetchFollow();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  /** FOLLOW / UNFOLLOW */
  const handleToggleFollow = async () => {
    if (!artist) return;
    if (isOwner) return; // không cho tự follow chính mình
    if (followLoading) return;

    const token = getTokenFromStorage();
    if (!token || !currentUser) {
      router.push("/login");
      return;
    }

    setFollowLoading(true);
    try {
      const method = follow?.isFollowing ? "DELETE" : "POST";
      const res = await fetch(`${API_BASE}/artist/${artist.id}/follow`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) router.push("/login");
        else
          console.error(
            "Follow API error",
            await res.text().catch(() => ""),
          );
        return;
      }

      const data = await res.json();
      setFollow((prev) => ({
        followersCount:
          typeof data.followersCount === "number"
            ? data.followersCount
            : prev?.followersCount ?? 0,
        isFollowing:
          typeof data.isFollowing === "boolean"
            ? data.isFollowing
            : !prev?.isFollowing,
      }));
    } catch (e) {
      console.error("[Follow] toggle error", e);
    } finally {
      setFollowLoading(false);
    }
  };

  const similarArtists = useMemo(() => {
    if (!artist) return [];
    return allArtists.filter((a) => a.id !== artist.id).slice(0, 6);
  }, [allArtists, artist]);

  /** DANH SÁCH TRACK HIỂN THỊ (CÓ LỌC ALBUM) */
  const visibleTracks = useMemo(() => {
    if (!artist) return [];
    if (!selectedAlbumId) return artist.tracks;

    return artist.tracks.filter(
      (t) => t.album && t.album.id === selectedAlbumId,
    );
  }, [artist, selectedAlbumId]);

  const selectedAlbum = useMemo(() => {
    if (!artist || !selectedAlbumId) return null;
    return artist.albums.find((a) => a.id === selectedAlbumId) || null;
  }, [artist, selectedAlbumId]);

  /** PLAY ALL – phát toàn bộ bài của nghệ sĩ */
  const handlePlayAll = () => {
    if (!artist || !artist.tracks.length) return;
    const queue = artist.tracks.map(mapToPlayerTrack);
    setQueue(queue);
    playNow(queue[0]);
  };

  /** PLAY ALBUM – phát các bài trong 1 album */
  const handlePlayAlbum = (albumId: string) => {
    if (!artist) return;
    const tracksInAlbum = artist.tracks.filter(
      (t) => t.album && t.album.id === albumId,
    );
    if (!tracksInAlbum.length) return;
    const queue = tracksInAlbum.map(mapToPlayerTrack);
    setQueue(queue);
    playNow(queue[0]);
  };

  const handleDeleteAlbum = async (albumId: string) => {
    const token = getTokenFromStorage();
    if (!token) return alert("Không tìm thấy token");

    if (
      !confirm(
        "Bạn có chắc muốn xoá album này? Các bài hát sẽ thành single.",
      )
    )
      return;

    const res = await fetch(`${API_BASE}/artist/me/albums/${albumId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return alert("Xoá album thất bại!");

    await fetchArtist();
  };

  const handleDeleteTrack = async (trackId: string) => {
  const token = getTokenFromStorage();
  if (!token) return alert("Không tìm thấy token");
  if (!artist) return;
  if (!canEdit) return;

  if (!confirm("Bạn có chắc muốn xoá bài này?")) return;

  const url = isOwner
    ? `${API_BASE}/artist/me/tracks/${trackId}`
    : `${API_BASE}/admin/tracks/${trackId}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return alert("Xoá bài hát thất bại!");
  await fetchArtist();
};

  /** LỌC THEO ALBUM & SCROLL XUỐNG LIST TRACK */
  const handleFilterAlbum = (albumId: string) => {
    setSelectedAlbumId((prev) => (prev === albumId ? null : albumId));
    setTimeout(() => {
      if (tracksSectionRef.current) {
        tracksSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  /** UPDATE PROFILE (NAME, BIO, AVATAR) */
  /** UPDATE PROFILE (NAME, BIO, AVATAR) */
const handleSaveProfile = async () => {
  if (!artist) return;

  const token = getTokenFromStorage();
  if (!token) {
    setProfileErr("Không tìm thấy token. Vui lòng đăng nhập lại.");
    return;
  }

  try {
    setSavingProfile(true);
    setProfileErr(null);
    setProfileMsg(null);

    const url = getProfilePatchUrl();

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: displayName,
        bio,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Cập nhật hồ sơ thất bại");
    }

    setProfileMsg("Đã lưu thay đổi ✨");
    fetchArtist();
  } catch (e: any) {
    setProfileErr(e?.message || "Có lỗi khi lưu hồ sơ");
  } finally {
    setSavingProfile(false);
  }
};



  const handleChangeAvatar = async (file: File) => {
  const token = getTokenFromStorage();
  if (!token) {
    setProfileErr("Không tìm thấy token. Vui lòng đăng nhập lại.");
    return;
  }

  try {
    setSavingProfile(true);
    setProfileErr(null);
    setProfileMsg(null);

    // 1) upload file -> backend trả url
    const fd = new FormData();
    fd.append("file", file);

    const up = await fetch(`${API_BASE}/artist/me/upload-cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw new Error(txt || "Upload avatar thất bại");
    }

    const json = await up.json();
    const avatarUrl = json?.url;
    if (!avatarUrl) throw new Error("Upload avatar xong nhưng thiếu url trả về");

    // 2) lưu url vào artist (owner dùng /artist/me/profile, admin dùng /admin/artists/:id)
    const patchUrl = getProfilePatchUrl();

    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ avatar: avatarUrl }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Cập nhật avatar thất bại");
    }

    setProfileMsg("Đã cập nhật avatar 🎧");
    fetchArtist();
  } catch (e: any) {
    setProfileErr(e?.message || "Có lỗi khi cập nhật avatar");
  } finally {
    setSavingProfile(false);
  }
};


  /* ===================== UI RENDER ===================== */

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-sm text-cyan-200/70">
        Đang tải nghệ sĩ...
      </div>
    );

  if (error || !artist)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-red-400">
          {error || "Không tìm thấy nghệ sĩ"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-full bg-slate-900/80 px-4 py-2 text-xs text-slate-100 shadow hover:bg-slate-800"
        >
          ⟵ Quay lại
        </button>
      </div>
    );

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-b from-[#0A3A50] via-[#051E2D] to-[#020915] text-slate-50">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-center opacity-70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/artist-bg.png"
          className="w-[500px] md:w-[350px] lg:w-[450px] blur-sm opacity-50"
          alt=""
        />
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="relative flex gap-6 px-6 pt-6 pb-4">
          <div className="h-40 w-40 flex-shrink-0 overflow-hidden rounded-full border border-cyan-300/60 bg-slate-900/60 shadow-[0_0_120px_40px_rgba(76,195,237,0.3)] backdrop-blur-md">
            {artist.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(artist.avatar)}
                className="h-full w-full object-cover"
                alt={artist.name}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl">
                🎧
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-end gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_0_30px_rgba(76,195,237,0.6)]">
              {artist.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
              <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs">
                {artist.tracksCount} bài hát
              </span>
              <button
  onClick={openFollowers}
  className="rounded-full bg-slate-900/70 px-3 py-1 text-xs hover:bg-slate-800"
  title="Xem người theo dõi"
>
  {(follow?.followersCount ?? 0).toLocaleString("vi-VN")} người theo dõi
</button>

            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4CC3ED] via-[#2dd4bf] to-[#6366f1] px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:brightness-110"
              >
                ▶ Phát tất cả
              </button>
{followersOpen && (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-slate-950/95 p-4 shadow-[0_0_40px_rgba(56,189,248,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-cyan-200">
          Người theo dõi
        </div>
        <button
          onClick={() => setFollowersOpen(false)}
          className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-xs text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
        >
          Đóng
        </button>
      </div>

      <div className="mt-3">
        {followersLoading ? (
          <div className="text-xs text-cyan-200/70">Đang tải...</div>
        ) : followersErr ? (
          <div className="text-xs text-red-300">{followersErr}</div>
        ) : followers.length ? (
          <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
            {followers.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
              >
                {f.name || "(Không tên)"}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Chưa có người theo dõi.
          </div>
        )}
      </div>
    </div>
  </div>
)}

              {!canEdit && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`rounded-full border px-5 py-2 text-xs md:text-sm font-medium transition
                    ${
                      follow?.isFollowing
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(56,189,248,0.8)]"
                        : "border-slate-600 bg-slate-950/70 text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  {follow?.isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </button>
              )}

              <button
                onClick={() => router.back()}
                className="rounded-full border border-slate-600/70 bg-slate-950/70 px-4 py-2 text-xs hover:bg-slate-900"
              >
                ⟵ Quay lại
              </button>
            </div>
          </div>
        </div>

        {/* OWNER EDIT PANEL */}
        {canEdit && (
          <section className="mx-6 mb-4 rounded-3xl border border-cyan-400/40 bg-gradient-to-r from-slate-950/80 via-slate-900/90 to-sky-950/80 p-4 text-xs shadow-[0_0_40px_rgba(56,189,248,0.4)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Tuỳ chỉnh trang nghệ sĩ (chỉ mình bạn thấy)
              </h2>
              {savingProfile && (
                <span className="text-[11px] text-cyan-200">
                  Đang lưu thay đổi...
                </span>
              )}
            </div>

            {profileErr && (
              <div className="mb-2 rounded-md border border-red-500/70 bg-red-500/15 px-3 py-2 text-[11px] text-red-100">
                {profileErr}
              </div>
            )}
            {profileMsg && (
              <div className="mb-2 rounded-md border border-emerald-500/70 bg-emerald-500/15 px-3 py-2 text-[11px] text-emerald-100">
                {profileMsg}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Tên hiển thị
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-cyan-500/40 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                    placeholder="Tên nghệ sĩ"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Giới thiệu
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-cyan-500/40 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                    placeholder="Viết đôi dòng về phong cách âm nhạc của bạn..."
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Avatar nghệ sĩ
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer text-[11px] text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleChangeAvatar(file);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Chọn ảnh mới để cập nhật avatar. Nếu không chọn, avatar giữ
                    nguyên.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    className="rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow hover:brightness-110"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BODY */}
        <div className="flex flex-col gap-10 px-6 pb-40">
          {/* GIỚI THIỆU */}
          <section className="grid gap-4 rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-[#031821] p-5 shadow shadow-black/60 backdrop-blur-md md:grid-cols-[2fr,1fr]">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">
                Giới thiệu
              </h2>
              {artist.bio ? (
                <p className="text-sm leading-relaxed text-slate-200">
                  {artist.bio}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Nghệ sĩ chưa có phần giới thiệu.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-3 text-xs">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Tổng quan
              </div>
              <div className="mt-1 text-sm text-slate-100">
                {artist.tracksCount} bài hát đã phát hành
              </div>
            </div>
          </section>

          {/* ALBUMS */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">
              Danh sách album
            </h2>

            {artist.albums.length ? (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {artist.albums.map((album) => {
                  const isActive = selectedAlbumId === album.id;

                  return (
                    <div
                      key={album.id}
                      className="group flex w-48 flex-shrink-0 flex-col gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 shadow-md transition hover:border-cyan-400/70 hover:bg-slate-900/90"
                    >
                      {/* cover + tên: click để qua trang album */}
                      <div
                        onClick={() => router.push(`/albums/${album.id}`)}
                        className="cursor-pointer"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-800/70">
                          {album.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveMediaUrl(album.coverUrl)}
                              alt={album.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-4xl text-cyan-300/80">
                              💿
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="truncate text-sm font-semibold text-white">
                            {album.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            {album.tracksCount ?? 0} bài hát
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          onClick={() => handlePlayAlbum(album.id)}
                          className="flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#4CC3ED] to-[#6366f1] px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow hover:brightness-110"
                        >
                          ▶ Phát album
                        </button>

                        <button
                          onClick={() => handleFilterAlbum(album.id)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                            isActive
                              ? "border-emerald-400/80 bg-emerald-500/20 text-emerald-100"
                              : "border-slate-600/70 bg-slate-950/80 text-slate-200 hover:border-cyan-400/70 hover:text-cyan-200"
                          }`}
                        >
                          {isActive
                            ? "Đang lọc album này"
                            : "Xem bài trong album"}
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleDeleteAlbum(album.id)}
                            className="rounded-full border border-red-500/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/20"
                          >
                            ❌ Xoá album
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có album nào.</p>
            )}
          </section>

          {/* TRACKS */}
          <section
            ref={tracksSectionRef}
            className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow shadow-black/60"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">
                Bài hát của nghệ sĩ
              </h2>

              {selectedAlbum && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-cyan-400/70 bg-slate-900/80 px-3 py-1 text-cyan-200">
                    Đang xem bài trong album:{" "}
                    <span className="font-semibold">
                      {selectedAlbum.title}
                    </span>
                  </span>
                  <button
                    onClick={() => setSelectedAlbumId(null)}
                    className="rounded-full border border-slate-600/70 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
                  >
                    Xem tất cả bài hát
                  </button>
                </div>
              )}
            </div>

          {visibleTracks.length ? (
  visibleTracks.map((track) => (
    <div
  key={track.id}
  className="flex items-start gap-3"
>
  {/* TrackCard chiếm toàn bộ chiều ngang còn lại */}
  <div className="flex-1">
    <TrackCard track={mapToPlayerTrack(track)} />
  </div>

  {canEdit && (
    <div className="mt-3 flex flex-col gap-2 shrink-0">
      <button
        onClick={() => router.push(`/artist/tracks/${track.id}/edit`)}
        className="rounded-full border border-cyan-400 bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-100 shadow-sm hover:bg-cyan-500/30 hover:text-white"
      >
        ✏ Sửa
      </button>

      <button
        onClick={() => handleDeleteTrack(track.id)}
        className="rounded-full border border-red-400 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-500/30"
      >
        Xoá
      </button>
    </div>
  )}
</div>
  ))
) : (
  <p className="text-sm text-slate-500">
    Nghệ sĩ chưa có bài hát nào.
  </p>
)}

          </section>

          {/* SUGGEST ARTISTS */}
          {similarArtists.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white">
                Nghệ sĩ tương tự
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {similarArtists.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/artists/${a.id}`)}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 shadow-md hover:border-cyan-400/60 hover:bg-slate-900/90"
                  >
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-cyan-400/60 bg-slate-900/80">
                      {a.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(a.avatar)}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          alt={a.name}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-cyan-300/80">
                          🎧
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        {a.tracksCount} bài • {a.albumsCount} album
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
