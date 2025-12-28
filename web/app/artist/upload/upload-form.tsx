"use client";

import React, { useMemo, useState, FormEvent } from "react";

export type ArtistMe = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type AlbumSummary = {
  id: string;
  title: string;
  coverUrl?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

type UploadResponse = {
  url: string;
};

async function uploadFile(path: string, file: File): Promise<UploadResponse> {
  const token = getTokenFromStorage();
  const formData = new FormData();
  formData.append("file", file);

  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Upload file thất bại");
  }

  return res.json();
}

/** ✅ NEW: lấy duration (giây) từ file audio */
async function getAudioDurationSeconds(file: File): Promise<number> {
  if (typeof window === "undefined") return 0;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();

    const done = (sec: number) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      resolve(Number.isFinite(sec) && sec > 0 ? sec : 0);
    };

    audio.preload = "metadata";
    audio.src = url;

    audio.onloadedmetadata = () => {
      const sec = audio.duration;
      done(sec);
    };

    audio.onerror = () => done(0);
  });
}

/** ✅ Danh sách thể loại (KHÔNG có OTHER/Khác) */
const GENRES = [
  { value: "POP", label: "Pop" },
  { value: "RNB", label: "R&B" },
  { value: "INDIE", label: "Indie" },
  { value: "EDM", label: "EDM" },
  { value: "RAP", label: "Rap" },
  { value: "BALLAD", label: "Ballad" },
] as const;

const GENRE_VALUES = new Set(GENRES.map((g) => g.value));

const resetAllFileInputs = () => {
  const fileInputs = document.querySelectorAll<HTMLInputElement>(
    'input[type="file"]'
  );
  fileInputs.forEach((input) => (input.value = ""));
};

const titleFromFileName = (file: File) => {
  const base = (file.name || "Untitled").replace(/\.[^/.]+$/, "").trim();
  return base || "Untitled";
};

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type BatchTrackItem = {
  key: string;
  audioFile: File;
  coverFile: File | null;

  title: string;
  genre: string; // "" | valid
  duration: string; // number string | ""
  lyrics: string; // optional
};

/* =====================================================
 *   TRACK UPLOAD FORM
 * ===================================================*/

type UploadTrackFormProps = {
  artist: ArtistMe | null;
  albums: AlbumSummary[];
  onCreated?: () => void;

  enableLyrics?: boolean;
  enableDuration?: boolean;
  forceAlbumSelect?: boolean;
};

export function UploadTrackForm({
  artist,
  albums,
  onCreated,
  enableLyrics,
  enableDuration,
  forceAlbumSelect,
}: UploadTrackFormProps) {
  // mode
  const [batchMode, setBatchMode] = useState(false);

  // shared album
  const [albumId, setAlbumId] = useState("");

  // ===== SINGLE (giữ nguyên chức năng) =====
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [duration, setDuration] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState<string>("");

  // ===== BATCH (mỗi bài đầy đủ) =====
  const [batchItems, setBatchItems] = useState<BatchTrackItem[]>([]);

  // status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const albumsMap = useMemo(
    () => new Map(albums.map((a) => [a.id, a.title])),
    [albums]
  );

  const albumLabel = forceAlbumSelect ? "Album (bắt buộc)" : "Album (tuỳ chọn)";

  const resetSingle = () => {
    setTitle("");
    setAlbumId("");
    setAudioFile(null);
    setCoverFile(null);
    setDuration("");
    setLyrics("");
    setGenre("");
  };

  const resetBatch = () => {
    setAlbumId("");
    setBatchItems([]);
  };

  const toggleMode = () => {
    setError(null);
    setSuccess(null);
    setProgress(null);
    setIsSubmitting(false);

    // khi đổi mode: reset input để khỏi rối
    resetSingle();
    resetBatch();
    resetAllFileInputs();

    setBatchMode((v) => !v);
  };

  const onPickBatchAudios = (files: FileList | null) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;

    setBatchItems((prev) => {
      const next = [...prev];
      for (const f of arr) {
        const key = uid();
        next.push({
          key,
          audioFile: f,
          coverFile: null,
          title: titleFromFileName(f),
          genre: "",
          duration: "",
          lyrics: "",
        });

        // ✅ auto duration theo file (không phá nếu enableDuration=false)
        if (enableDuration) {
          (async () => {
            const sec = await getAudioDurationSeconds(f);
            if (sec > 0) {
              // update sau khi state đã có item
              setBatchItems((cur) =>
                cur.map((it) =>
                  it.key === key ? { ...it, duration: String(Math.round(sec)) } : it
                )
              );
            }
          })();
        }
      }
      return next;
    });
  };

  const updateBatchItem = (key: string, patch: Partial<BatchTrackItem>) => {
    setBatchItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
    );
  };

  const removeBatchItem = (key: string) => {
    setBatchItems((prev) => prev.filter((it) => it.key !== key));
  };

  const validateSingle = () => {
    if (!artist) return "Không tìm thấy profile nghệ sĩ. Hãy reload trang.";
    if (!title.trim()) return "Vui lòng nhập tên bài hát.";
    if (!audioFile) return "Vui lòng chọn file mp3.";
    if (!coverFile) return "Vui lòng chọn ảnh cover.";
    if (forceAlbumSelect && !albumId) return "Vui lòng chọn album cho bài hát này.";

    if (genre && !GENRE_VALUES.has(genre)) return "Thể loại không hợp lệ.";

    if (enableDuration && duration.trim()) {
      const n = Number(duration.trim());
      if (!Number.isFinite(n) || n < 0) return "Thời lượng (giây) không hợp lệ.";
    }

    return null;
  };

  const validateBatch = () => {
    if (!artist) return "Không tìm thấy profile nghệ sĩ. Hãy reload trang.";
    if (!batchItems.length) return "Vui lòng chọn ít nhất 1 file mp3.";
    if (forceAlbumSelect && !albumId) return "Vui lòng chọn album cho các bài hát này.";

    for (let i = 0; i < batchItems.length; i++) {
      const it = batchItems[i];
      const idx = i + 1;

      if (!it.title.trim()) return `Track ${idx}: thiếu Title`;
      if (!it.coverFile) return `Track ${idx}: thiếu Cover`;

      if (it.genre && !GENRE_VALUES.has(it.genre)) return `Track ${idx}: Genre không hợp lệ`;

      if (enableDuration && it.duration.trim()) {
        const n = Number(it.duration.trim());
        if (!Number.isFinite(n) || n < 0) return `Track ${idx}: Duration không hợp lệ`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setProgress(null);

    const token = getTokenFromStorage();
    if (!token) {
      setError("Không tìm thấy accessToken. Vui lòng đăng nhập lại.");
      return;
    }

    const err = batchMode ? validateBatch() : validateSingle();
    if (err) {
      setError(err);
      return;
    }

    setIsSubmitting(true);

    try {
      // =========================
      // SINGLE (giữ nguyên như cũ)
      // =========================
      if (!batchMode) {
        setProgress("Đang upload cover...");
        const coverRes = await uploadFile("/artist/me/upload-cover", coverFile!);

        setProgress("Đang upload audio...");
        const audioRes = await uploadFile("/artist/me/upload-audio", audioFile!);

        const payload: any = {
          title: title.trim(),
          coverUrl: coverRes.url,
          audioUrl: audioRes.url,
          albumId: albumId || null,
          genre: genre || null,
        };

        if (enableDuration && duration.trim()) payload.duration = Number(duration.trim());
        if (enableLyrics && lyrics.trim()) payload.lyrics = lyrics.trim();

        setProgress("Đang tạo track...");
        const res = await fetch(`${API_BASE}/artist/me/upload-track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Upload track thất bại");
        }

        setSuccess("Upload track thành công! 🎵");
        resetSingle();
        resetAllFileInputs();
        onCreated?.();
        return;
      }

      // =========================
      // BATCH (mỗi bài đủ cover/title/genre/duration/lyrics)
      // =========================
      const total = batchItems.length;
      let okCount = 0;

      for (let i = 0; i < batchItems.length; i++) {
        const it = batchItems[i];
        const trackNo = i + 1;
        const displayTitle = it.title.trim() || it.audioFile.name;

        setProgress(`Track ${trackNo}/${total}: Upload cover - ${displayTitle}`);
        const coverRes = await uploadFile("/artist/me/upload-cover", it.coverFile!);

        setProgress(`Track ${trackNo}/${total}: Upload audio - ${displayTitle}`);
        const audioRes = await uploadFile("/artist/me/upload-audio", it.audioFile);

        const payload: any = {
          title: it.title.trim(),
          coverUrl: coverRes.url,
          audioUrl: audioRes.url,
          albumId: albumId || null,
          genre: it.genre || null,
        };

        if (enableDuration && it.duration.trim()) payload.duration = Number(it.duration.trim());
        if (enableLyrics && it.lyrics.trim()) payload.lyrics = it.lyrics.trim();

        setProgress(`Track ${trackNo}/${total}: Tạo track - ${displayTitle}`);
        const res = await fetch(`${API_BASE}/artist/me/upload-track`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Track ${trackNo}: Upload thất bại`);
        }

        okCount++;
      }

      setSuccess(`Upload thành công ${okCount}/${total} track! 🎵`);
      resetBatch();
      resetAllFileInputs();
      onCreated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi upload track.");
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-sky-950/70 p-5 shadow-[0_0_40px_rgba(56,189,248,0.35)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            Upload Track
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            {batchMode
              ? "Upload nhiều bài: mỗi track có cover/title/genre/duration/lyrics riêng."
              : "Upload 1 bài: mp3 + cover + metadata."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-400/15"
          >
            {batchMode ? "Đang bật nhiều bài" : "Đang bật 1 bài"}
          </button>
        </div>
      </div>

      {artist && (
        <div className="text-[11px] text-slate-300">
          Nghệ sĩ: <span className="font-medium text-cyan-300">{artist.name}</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {progress && (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          {progress}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {success}
        </div>
      )}

      {/* ALBUM */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-200">
          {albumLabel}
        </label>
        {albums.length > 0 ? (
          <select
            className="w-full rounded-lg border border-sky-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/70"
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
          >
            <option value="">
              {forceAlbumSelect
                ? "— Chọn album —"
                : "— Single (không thuộc album) —"}
            </option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[11px] text-slate-400">
            Chưa có album nào. Bạn có thể tạo album ở form phía trên.
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Album đang chọn:{" "}
          <span className="text-slate-200">
            {albumId ? albumsMap.get(albumId) || albumId : "Single"}
          </span>
        </p>
      </div>

      {/* ===================== SINGLE UI ===================== */}
      {!batchMode && (
        <>
          {/* TITLE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">Tên bài hát</label>
            <input
              type="text"
              className="w-full rounded-lg border border-cyan-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
              placeholder="Ví dụ: Lạc Trôi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* GENRE */}
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Thể loại</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="" className="bg-slate-900">
                — Chọn thể loại —
              </option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value} className="bg-slate-900">
                  {g.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Không có “Khác/OTHER”. Chỉ chọn đúng thể loại trong danh sách.
            </p>
          </div>

          {/* FILES */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-200">File mp3</label>
              <input
                type="file"
                accept="audio/mpeg"
                className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
                onChange={async (e) => {
                  const f = e.target.files?.[0] || null;
                  setAudioFile(f);

                  // ✅ auto title nếu đang trống
                  if (f && !title.trim()) setTitle(titleFromFileName(f));

                  // ✅ auto duration theo file (nếu bật duration)
                  if (f && enableDuration) {
                    const sec = await getAudioDurationSeconds(f);
                    if (sec > 0) setDuration(String(Math.round(sec)));
                  }
                }}
              />
              <p className="text-[11px] text-slate-400">
                Hỗ trợ định dạng <code>.mp3</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-200">Ảnh cover</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-sky-500"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              />
              <p className="text-[11px] text-slate-400">
                Ảnh sẽ được upload lên <code>/uploads/images</code> trên backend.
              </p>
            </div>
          </div>

          {/* DURATION + LYRICS */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,2fr]">
            {enableDuration && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">
                  Thời lượng (giây)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border border-indigo-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/70"
                  placeholder="Tự lấy từ file mp3 (có thể sửa)"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  Khi chọn mp3, hệ thống tự điền duration theo file (bạn vẫn có thể sửa).
                </p>
              </div>
            )}

            {enableLyrics && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-200">Lời bài hát</label>
                <textarea
                  rows={enableDuration ? 3 : 4}
                  className="w-full rounded-lg border border-cyan-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                  placeholder="Nhập lời bài hát (có thể bỏ trống)..."
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================== BATCH UI ===================== */}
      {batchMode && (
        <>
          {/* pick audios */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">
              Chọn nhiều file mp3
            </label>
            <input
              type="file"
              accept="audio/mpeg"
              multiple
              className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
              onChange={(e) => onPickBatchAudios(e.target.files)}
            />
            <p className="text-[11px] text-slate-400">
              Sau khi chọn mp3, bên dưới sẽ hiện Track 1/2/3... để bạn nhập đủ thông tin.
              {enableDuration ? " Duration sẽ tự lấy từ file." : ""}
            </p>
          </div>

          {/* total count */}
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-4 py-3">
            <div className="text-sm text-slate-200">
              Tổng số track muốn up:{" "}
              <span className="font-semibold text-cyan-300">{batchItems.length}</span>
            </div>
            {batchItems.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchItems([])}
                className="mt-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-100 hover:bg-red-500/15"
              >
                Xoá toàn bộ danh sách track
              </button>
            )}
          </div>

          {/* list tracks 1..n */}
          {batchItems.length > 0 && (
            <div className="space-y-3">
              {batchItems.map((it, idx) => (
                <div
                  key={it.key}
                  className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 shadow-[0_0_20px_rgba(56,189,248,0.12)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-100">
                      Track {idx + 1}
                      <span className="ml-2 text-[11px] font-normal text-slate-400">
                        ({it.audioFile.name})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeBatchItem(it.key)}
                      className="rounded-full border border-slate-600/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900/60"
                    >
                      Xoá track này
                    </button>
                  </div>

                  {/* Title */}
                  <div className="mt-3 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">Tên bài hát</label>
                    <input
                      type="text"
                      value={it.title}
                      onChange={(e) => updateBatchItem(it.key, { title: e.target.value })}
                      className="w-full rounded-lg border border-cyan-500/30 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      placeholder="Tên bài hát..."
                    />
                  </div>

                  {/* Cover */}
                  <div className="mt-3 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-200">
                      Ảnh cover (riêng)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-sky-500"
                      onChange={(e) =>
                        updateBatchItem(it.key, { coverFile: e.target.files?.[0] || null })
                      }
                    />
                    <p className="text-[11px] text-slate-400">
                      {it.coverFile ? `Đã chọn: ${it.coverFile.name}` : "Chưa chọn cover"}
                    </p>
                  </div>

                  {/* Genre + Duration */}
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200">Thể loại</label>
                      <select
                        value={it.genre}
                        onChange={(e) => updateBatchItem(it.key, { genre: e.target.value })}
                        className="w-full rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="" className="bg-slate-900">
                          — Không chọn (ẩn badge) —
                        </option>
                        {GENRES.map((g) => (
                          <option key={g.value} value={g.value} className="bg-slate-900">
                            {g.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        Genre = null thì UI sẽ ẩn badge.
                      </p>
                    </div>

                    {enableDuration && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-200">
                          Thời lượng (giây)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={it.duration}
                          onChange={(e) => updateBatchItem(it.key, { duration: e.target.value })}
                          className="w-full rounded-lg border border-indigo-500/30 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/60"
                          placeholder="Tự lấy từ file mp3 (có thể sửa)"
                        />
                        <p className="text-[11px] text-slate-400">
                          Duration tự lấy từ file mp3 nếu đọc được metadata.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lyrics */}
                  {enableLyrics && (
                    <div className="mt-3 space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200">Lời bài hát</label>
                      <textarea
                        rows={3}
                        value={it.lyrics}
                        onChange={(e) => updateBatchItem(it.key, { lyrics: e.target.value })}
                        className="w-full rounded-lg border border-cyan-500/30 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                        placeholder="Nhập lời bài hát (có thể bỏ trống)..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang upload..." : batchMode ? "Upload nhiều track" : "Upload track"}
      </button>
    </form>
  );
}

/* =====================================================
 *   ALBUM COVER + CREATE ALBUM FORM
 * ===================================================*/

type UploadAlbumFormProps = {
  onCreated?: () => void;
};

export function UploadAlbumForm({ onCreated }: UploadAlbumFormProps) {
  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Vui lòng nhập tên album.");
      return;
    }
    if (!coverFile) {
      setError("Vui lòng chọn ảnh cover album.");
      return;
    }

    const token = getTokenFromStorage();
    if (!token) {
      setError("Không tìm thấy accessToken. Vui lòng đăng nhập lại.");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploaded = await uploadFile("/artist/me/upload-cover", coverFile);

      const res = await fetch(`${API_BASE}/artist/me/albums`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          coverUrl: uploaded.url,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Tạo album thất bại.");
      }

      const album = await res.json();

      setCoverUrl(uploaded.url);
      setSuccess(`Album "${album.title}" đã được tạo thành công!`);

      setTitle("");
      setCoverFile(null);
      resetAllFileInputs();

      onCreated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi tạo album.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-indigo-400/40 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-indigo-950/70 p-5 shadow-[0_0_40px_rgba(129,140,248,0.35)] backdrop-blur-xl"
    >
      <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-300 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
        Upload Album Cover
      </h2>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-100">
          {success}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-200">Tên album</label>
        <input
          type="text"
          className="w-full rounded-lg border border-indigo-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/70"
          placeholder="Ví dụ: RUBY"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-200">Ảnh cover album</label>
        <input
          type="file"
          accept="image/*"
          className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-indigo-500"
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
        />
      </div>

      {coverUrl && (
        <div className="space-y-2 rounded-lg border border-slate-700/70 bg-slate-950/70 p-3">
          <p className="text-xs font-medium text-slate-200">coverUrl đã lưu:</p>
          <code className="block max-w-full truncate text-xs text-cyan-300">
            {coverUrl}
          </code>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-indigo-500/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang tạo album..." : "Upload cover & tạo album"}
      </button>
    </form>
  );
}
