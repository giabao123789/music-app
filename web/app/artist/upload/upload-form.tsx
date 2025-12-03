"use client";

import React, { useState, FormEvent } from "react";

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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  formData.append("file", file); // trùng FileInterceptor('file')

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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

/* =====================================================
 *   TRACK UPLOAD FORM
 * ===================================================*/

type UploadTrackFormProps = {
  artist: ArtistMe | null;
  albums: AlbumSummary[];
  onCreated?: () => void;

  /** Bật input lyrics */
  enableLyrics?: boolean;
  /** Bật input duration (giây) */
  enableDuration?: boolean;
  /** Bắt buộc chọn album (dùng cho “Upload track vào album”) */
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
  const [title, setTitle] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(""); // giây
  const [lyrics, setLyrics] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!artist) {
      setError("Không tìm thấy profile nghệ sĩ. Hãy reload trang.");
      return;
    }

    if (!title.trim()) {
      setError("Vui lòng nhập tên bài hát.");
      return;
    }
    if (!audioFile) {
      setError("Vui lòng chọn file mp3.");
      return;
    }
    if (!coverFile) {
      setError("Vui lòng chọn ảnh cover.");
      return;
    }

    if (forceAlbumSelect && !albumId) {
      setError("Vui lòng chọn album cho bài hát này.");
      return;
    }

    if (enableDuration && duration.trim()) {
      const n = Number(duration.trim());
      if (!Number.isFinite(n) || n < 0) {
        setError("Thời lượng (giây) không hợp lệ.");
        return;
      }
    }

    const token = getTokenFromStorage();
    if (!token) {
      setError("Không tìm thấy accessToken. Vui lòng đăng nhập lại.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload cover
      const coverRes = await uploadFile("/artist/me/upload-cover", coverFile);

      // 2. Upload audio
      const audioRes = await uploadFile("/artist/me/upload-audio", audioFile);

      // 3. Gửi dữ liệu track
      const payload: any = {
        title: title.trim(),
        coverUrl: coverRes.url,
        audioUrl: audioRes.url,
        albumId: albumId || null,
      };

      if (enableDuration && duration.trim()) {
        payload.duration = Number(duration.trim());
      }
      if (enableLyrics && lyrics.trim()) {
        payload.lyrics = lyrics.trim();
      }

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
      setTitle("");
      setAlbumId("");
      setAudioFile(null);
      setCoverFile(null);
      setDuration("");
      setLyrics("");

      // reset input file
      const fileInputs = document.querySelectorAll<HTMLInputElement>(
        'input[type="file"]'
      );
      fileInputs.forEach((input) => (input.value = ""));

      onCreated?.();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi upload track.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const albumLabel = forceAlbumSelect ? "Album (bắt buộc)" : "Album (tuỳ chọn)";

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
            Upload file mp3, cover và{" "}
            {enableLyrics ? "lời bài hát" : "metadata"} cho bài nhạc.
          </p>
        </div>
        {artist && (
          <span className="text-[11px] text-slate-300">
            Nghệ sĩ:{" "}
            <span className="font-medium text-cyan-300">{artist.name}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/15 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {success}
        </div>
      )}

      {/* TÊN BÀI HÁT */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-200">
          Tên bài hát
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-cyan-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
          placeholder="Ví dụ: Lạc Trôi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

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
                ? "— Chọn album cho bài hát —"
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
            Chưa có album nào. Bạn có thể tạo album ở form phía dưới.
          </p>
        )}
      </div>

      {/* HÀNG FILE */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* MP3 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-200">
            File mp3
          </label>
          <input
            type="file"
            accept="audio/mpeg"
            className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-cyan-500"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
          />
          <p className="text-[11px] text-slate-400">
            Hỗ trợ định dạng <code>.mp3</code>.
          </p>
        </div>

        {/* COVER */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-200">
            Ảnh cover
          </label>
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
              placeholder="Ví dụ: 210"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <p className="text-[11px] text-slate-400">
              Có thể để trống, hệ thống sẽ tính sau.
            </p>
          </div>
        )}

        {enableLyrics && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-200">
              Lời bài hát
            </label>
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang upload..." : "Upload track"}
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
      // 1. Upload cover lên /artist/me/upload-cover
      const uploaded = await uploadFile("/artist/me/upload-cover", coverFile);

      // 2. Tạo album trực tiếp trong backend
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
      setSuccess(
        `Album "${album.title}" đã được tạo thành công! Người nghe sẽ thấy album này ngay.`
      );

      // reset input
      setTitle("");
      setCoverFile(null);
      const fileInputs = document.querySelectorAll<HTMLInputElement>(
        'input[type="file"]'
      );
      fileInputs.forEach((i) => (i.value = ""));

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
        <label className="block text-xs font-medium text-slate-200">
          Tên album
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-indigo-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-0 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/70"
          placeholder="Ví dụ: RUBY"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="text-[11px] text-slate-400">
          Tên này sẽ dùng luôn cho album mà người nghe thấy trên ứng dụng.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-200">
          Ảnh cover album
        </label>
        <input
          type="file"
          accept="image/*"
          className="block w-full cursor-pointer text-xs text-slate-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-50 hover:file:bg-indigo-500"
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
        />
        <p className="text-[11px] text-slate-400">
          Ảnh này sẽ xuất hiện trong trang nghệ sĩ & trang album của người dùng.
        </p>
      </div>

      {coverUrl && (
        <div className="space-y-2 rounded-lg border border-slate-700/70 bg-slate-950/70 p-3">
          <p className="text-xs font-medium text-slate-200">coverUrl đã lưu:</p>
          <code className="block max-w-full truncate text-xs text-cyan-300">
            {coverUrl}
          </code>
          <p className="text-[11px] text-slate-400">
            Dùng để debug nếu cần. Bình thường bạn không cần copy dòng này nữa.
          </p>
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
