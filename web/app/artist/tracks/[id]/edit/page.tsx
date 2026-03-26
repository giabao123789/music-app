"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/config";

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
  lyrics?: string | null;
  album?: { id: string; title: string | null } | null;
  artistId?: string | null; // để admin biết track thuộc artist nào (nếu API trả)
};

type ArtistAlbum = {
  id: string;
  title: string;
  coverUrl: string | null;
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

function resolveUrlMaybe(raw?: string | null) {
  if (!raw) return "";
  // nếu đã là http(s) thì giữ nguyên
  if (/^https?:\/\//i.test(raw)) return raw;
  // nếu là /uploads/... thì ghép API_BASE
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

export default function EditTrackPage() {
  const params = useParams();
  const router = useRouter();
  const trackId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const isAdmin = useMemo(() => currentUser?.role === "ADMIN", [currentUser]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [track, setTrack] = useState<ArtistTrack | null>(null);
  const [albums, setAlbums] = useState<ArtistAlbum[]>([]);

  // form state
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState<string | "">("");
  const [duration, setDuration] = useState<string>("");
  const [lyrics, setLyrics] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // ✅ NEW: audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  /* === Lấy currentUser từ localStorage === */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw =
      localStorage.getItem("currentUser") || localStorage.getItem("user") || null;

    if (!raw) {
      router.push("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CurrentUser;
      setCurrentUser(parsed);

      // chỉ cho ARTIST hoặc ADMIN vào trang này
      if (parsed.role !== "ARTIST" && parsed.role !== "ADMIN") {
        router.push("/");
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  /* === Fetch track + albums === */
  useEffect(() => {
    const token = getTokenFromStorage();
    if (!token || !trackId) return;
    if (!currentUser) return;

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        setMsg(null);

        let target: ArtistTrack | null = null;

        if (currentUser && currentUser.role === "ADMIN") {
          // ✅ ADMIN: lấy track theo id trực tiếp
          const res = await fetch(`${API_BASE}/admin/tracks/${trackId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.error("/admin/tracks/:id error", txt);
            throw new Error("Không thể tải bài hát (admin).");
          }

          const t: any = await res.json();
          target = {
            id: t.id,
            title: t.title,
            audioUrl: t.audioUrl,
            coverUrl: t.coverUrl ?? null,
            duration: typeof t.duration === "number" ? t.duration : null,
            lyrics: t.lyrics ?? null,
            album: t.album ? { id: t.album.id, title: t.album.title } : null,
            artistId: t.artistId ?? null,
          };

          // ADMIN: danh sách album safe (giữ như cũ)
          const safeAlbums: ArtistAlbum[] = [];
          if (target.album?.id) {
            safeAlbums.push({
              id: target.album.id,
              title: target.album.title ?? "(Album)",
              coverUrl: null,
            });
          }
          if (!cancelled) setAlbums(safeAlbums);
        } else {
          // ✅ ARTIST: giữ logic cũ
          const tracksRes = await fetch(`${API_BASE}/artist/me/tracks`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!tracksRes.ok) {
            const txt = await tracksRes.text().catch(() => "");
            console.error("/artist/me/tracks error", txt);
            throw new Error("Không thể tải danh sách bài hát.");
          }

          const tracksJson = await tracksRes.json();
          const list: ArtistTrack[] = (tracksJson || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            audioUrl: t.audioUrl,
            coverUrl: t.coverUrl,
            duration: t.duration,
            lyrics: t.lyrics ?? null,
            album: t.album ? { id: t.album.id, title: t.album.title } : null,
          }));

          target = list.find((t) => t.id === trackId) || null;
          if (!target) throw new Error("Không tìm thấy bài hát của bạn với ID này.");

          // albums của artist
          const albumsRes = await fetch(`${API_BASE}/artist/me/albums`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          let albumsJson: any[] = [];
          if (albumsRes.ok) albumsJson = (await albumsRes.json()) || [];

          if (!cancelled) {
            setAlbums(
              albumsJson.map((a: any) => ({
                id: a.id,
                title: a.title,
                coverUrl: a.coverUrl ?? null,
              })),
            );
          }
        }

        if (cancelled) return;
        if (!target) throw new Error("Không tìm thấy bài hát");

        setTrack(target);

        // set form value từ track
        setTitle(target.title || "");
        setAlbumId(target.album?.id ?? "");
        setDuration(
          typeof target.duration === "number" && Number.isFinite(target.duration)
            ? String(target.duration)
            : "",
        );
        setLyrics(target.lyrics ?? "");
        setCoverUrl(target.coverUrl ?? null);

        // ✅ NEW: init audioUrl
        setAudioUrl(target.audioUrl ?? null);
      } catch (e: any) {
        console.error("fetch track edit error", e);
        if (!cancelled) setError(e?.message || "Không thể tải dữ liệu bài hát.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [trackId, currentUser]);

  const isSingle = useMemo(() => !albumId, [albumId]);

  /* === Upload cover mới === */
  const handleUploadCover = async (file: File) => {
    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch(`${API_BASE}/artist/me/upload-cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!up.ok) {
        const txt = await up.text().catch(() => "");
        console.error("upload-cover error", txt);
        alert("Upload ảnh bìa thất bại.");
        return;
      }

      const json = await up.json();
      const url = json.url as string;
      setCoverUrl(url);
      setMsg("Đã upload ảnh bìa mới (chưa lưu). Nhấn Lưu thay đổi để áp dụng.");
    } catch (e) {
      console.error("handleUploadCover error", e);
      alert("Có lỗi khi upload ảnh bìa.");
    } finally {
      setSaving(false);
    }
  };

  /* === ✅ NEW: Upload audio mới === */
  const handleUploadAudio = async (file: File) => {
    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch(`${API_BASE}/artist/me/upload-audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!up.ok) {
        const txt = await up.text().catch(() => "");
        console.error("upload-audio error", txt);
        alert("Upload audio thất bại.");
        return;
      }

      const json = await up.json();
      const url = json.url as string;

      setAudioUrl(url);
      setMsg("Đã upload audio mới (chưa lưu). Nhấn Lưu thay đổi để áp dụng.");
    } catch (e) {
      console.error("handleUploadAudio error", e);
      alert("Có lỗi khi upload audio.");
    } finally {
      setSaving(false);
    }
  };

  /* === Submit lưu thay đổi === */
  const handleSave = async () => {
    if (!track) return;

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      if (isAdmin) {
        // ✅ ADMIN: gửi field mà admin controller đang nhận
        const body: any = {};
        if (title.trim()) body.title = title.trim();
        body.albumId = albumId ? albumId : null;
        if (coverUrl) body.coverUrl = coverUrl;

        // ✅ NEW: audioUrl
        if (audioUrl) body.audioUrl = audioUrl;

        const res = await fetch(`${API_BASE}/admin/tracks/${trackId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("admin update track error", txt);
          alert("Lưu thay đổi thất bại (admin).");
          return;
        }

        setMsg("Đã lưu thay đổi bài hát ✨");
        return;
      }

      // ✅ ARTIST: giữ logic đầy đủ như cũ + thêm audioUrl
      const body: any = {
        title: title.trim(),
        albumId: albumId || null,
        lyrics: lyrics.trim() || null,
      };

      const d = parseInt(duration, 10);
      if (!Number.isNaN(d) && d >= 0) body.duration = d;
      if (coverUrl) body.coverUrl = coverUrl;

      // ✅ NEW: audioUrl
      if (audioUrl) body.audioUrl = audioUrl;

      const res = await fetch(`${API_BASE}/artist/me/tracks/${track.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("artist update track error", txt);
        alert("Lưu thay đổi thất bại.");
        return;
      }

      setMsg("Đã lưu thay đổi bài hát ✨");
    } catch (e) {
      console.error("handleSave error", e);
      alert("Có lỗi khi lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  };

  /* === UI === */

  if (!currentUser) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-cyan-200/80">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-cyan-200/80">
        Đang tải dữ liệu bài hát...
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-red-400">{error || "Không tìm thấy bài hát"}</p>
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
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-b from-[#061c2c] via-[#020916] to-black text-slate-50">
      {/* Glow background */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pt-6 pb-24">
        <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-cyan-300/80">
              {isAdmin ? "Admin" : "Artist"} • Edit Track
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_0_24px_rgba(56,189,248,0.7)]">
              Chỉnh sửa bài hát
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              {track.title} •{" "}
              {track.album?.title ? `Album: ${track.album.title}` : "Single"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#4CC3ED] via-[#22d3ee] to-[#6366f1] px-5 py-2 text-xs font-semibold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-60"
            >
              💾 Lưu thay đổi
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-full border border-slate-600/70 bg-slate-950/70 px-4 py-2 text-xs hover:bg-slate-900"
            >
              ⟵ Quay lại
            </button>
          </div>
        </header>

        {msg && (
          <div className="mb-4 rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-100">
            {msg}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-[2fr,1.3fr]">
          {/* LEFT: MAIN FORM */}
          <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow shadow-black/60">
            {/* Title */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                Tên bài hát
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                placeholder="Tên bài hát"
              />
            </div>

            {/* Album */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                Album
              </label>
              <select
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-[12px] text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
              >
                <option value="">Single (không thuộc album)</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-400">
                {isSingle
                  ? "Bài hát sẽ được xem là single."
                  : "Bài hát sẽ thuộc về album đã chọn."}
                {isAdmin &&
                  " (Admin: danh sách album có thể chỉ hiện album hiện tại nếu thiếu API.)"}
              </p>
            </div>

            {/* Duration + Lyrics: chỉ ARTIST mới chỉnh */}
            {!isAdmin && (
              <>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                    Thời lượng (giây)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-40 rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                    placeholder="VD: 180"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Có thể để trống, hệ thống sẽ giữ giá trị cũ.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                    Lời bài hát (lyrics)
                  </label>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                    placeholder="Nhập lời bài hát..."
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Có thể bỏ trống nếu bạn chưa muốn thêm lời.
                  </p>
                </div>
              </>
            )}
          </section>

          {/* RIGHT: COVER + META */}
          <section className="space-y-4 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-sky-950/80 p-4 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
            {/* COVER */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                Ảnh bìa bài hát
              </label>
              <div className="flex gap-3">
                <div className="h-28 w-28 overflow-hidden rounded-2xl border border-cyan-400/60 bg-slate-900/80 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      coverUrl
                        ? resolveUrlMaybe(coverUrl)
                        : track.coverUrl
                        ? resolveUrlMaybe(track.coverUrl)
                        : "/default-cover.jpg"
                    }
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 text-[11px] text-slate-300">
                  <p className="mb-2">
                    Chọn ảnh mới để thay cover. Ảnh sẽ upload lên server và áp dụng
                    khi bạn nhấn{" "}
                    <span className="font-semibold text-cyan-200">“Lưu thay đổi”</span>.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full cursor-pointer text-[11px] text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCover(file);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ✅ NEW: AUDIO */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-100">
                Audio bài hát
              </label>

              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="text-[11px] text-slate-300 mb-2">
                  Upload file audio mới (mp3, wav...). File sẽ upload lên server và chỉ áp dụng khi bạn nhấn{" "}
                  <span className="font-semibold text-cyan-200">“Lưu thay đổi”</span>.
                </div>

                <audio
                  controls
                  className="w-full"
                  src={resolveUrlMaybe(audioUrl || track.audioUrl)}
                />

                <div className="mt-2">
                  <input
                    type="file"
                    accept="audio/*"
                    className="block w-full cursor-pointer text-[11px] text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-50 hover:file:bg-indigo-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadAudio(file);
                    }}
                  />
                  <div className="mt-1 text-[10px] text-slate-400 break-all">
                    URL hiện tại:{" "}
                    <span className="text-slate-200">
                      {(audioUrl || track.audioUrl) ? (audioUrl || track.audioUrl) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* META */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/80 p-3 text-[11px] text-slate-300">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                Thông tin hiện tại
              </div>
              <ul className="space-y-1">
                <li>
                  <span className="text-slate-400">ID: </span>
                  <span className="font-mono text-[10px] text-slate-100">
                    {track.id}
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">Album: </span>
                  <span className="text-slate-100">
                    {track.album?.title ?? "Single"}
                  </span>
                </li>
                <li>
                  <span className="text-slate-400">Thời lượng: </span>
                  <span className="text-slate-100">
                    {typeof track.duration === "number"
                      ? `${Math.floor(track.duration / 60)}:${String(
                          track.duration % 60,
                        ).padStart(2, "0")}`
                      : "Chưa có"}
                  </span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
