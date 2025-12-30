// web/app/admin/albums/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AlbumItem = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseAt: string | null;
  createdAt?: string | null;
  artist?: { id: string; name: string | null; avatar?: string | null } | null;
  _count?: { tracks: number } | null;
};

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("mp:token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token")
  );
}

// ✅ FALLBACK SVG (khỏi cần /public/default-cover.jpg)
const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <defs>
      <radialGradient id="g" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#4CC9ED" stop-opacity="0.95"/>
        <stop offset="45%" stop-color="#2563EB" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#050816" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="150" cy="150" r="86" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="10"/>
    <circle cx="150" cy="150" r="18" fill="rgba(255,255,255,0.22)"/>
    <text x="50%" y="78%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="16" fill="rgba(255,255,255,0.78)">No Cover</text>
  </svg>
`);

function resolveCover(raw?: string | null) {
  if (!raw) return FALLBACK_COVER;
  const s = String(raw).trim();
  if (!s) return FALLBACK_COVER;
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;

  const norm = s.replaceAll("\\", "/");
  if (norm.startsWith("/")) return `${API_BASE}${encodeURI(norm)}`;
  return `${API_BASE}/${encodeURI(norm)}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("vi-VN");
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function AdminAlbumsPage() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);

  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const token = useMemo(() => getTokenFromStorage(), []);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumItem | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openEdit = (album: AlbumItem) => {
    setEditing(album);
    setEditTitle(album.title || "");
    setEditCoverUrl(album.coverUrl ?? null);
    setEditFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setEditFile(null);
  };

  const fetchAlbums = async (keyword: string) => {
    setErr(null);
    setLoading(true);

    try {
      if (!token) {
        setErr("Bạn chưa đăng nhập (thiếu token). Vui lòng đăng nhập lại.");
        setItems([]);
        return;
      }

      const url = `${API_BASE}/admin/albums?q=${encodeURIComponent(keyword || "")}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data?.items)
        ? (data.items as AlbumItem[])
        : Array.isArray(data)
        ? (data as AlbumItem[])
        : [];

      setItems(list);
    } catch (e: any) {
      setErr(e?.message || "Không thể tải danh sách album");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAlbums(dq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const handleDelete = async (id: string) => {
    setErr(null);

    if (!token) {
      setErr("Thiếu token. Vui lòng đăng nhập lại.");
      return;
    }

    const ok = confirm("Bạn có chắc muốn xoá album này? (Các bài hát sẽ trở thành single)");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/admin/albums/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Xoá album thất bại");
      }

      await fetchAlbums(dq);
    } catch (e: any) {
      setErr(e?.message || "Xoá album thất bại");
    }
  };

  const uploadCoverFile = async (file: File): Promise<string> => {
    if (!token) throw new Error("Thiếu token. Vui lòng đăng nhập lại.");

    const fd = new FormData();
    fd.append("file", file);

    const up = await fetch(`${API_BASE}/artist/me/upload-cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!up.ok) {
      const txt = await up.text().catch(() => "");
      throw new Error(txt || "Upload ảnh thất bại");
    }

    const json = await up.json();
    const url = json?.url;
    if (!url) throw new Error("Upload xong nhưng thiếu url trả về");
    return url as string;
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!token) {
      setErr("Thiếu token. Vui lòng đăng nhập lại.");
      return;
    }

    const t = String(editTitle || "").trim();
    if (!t) {
      setErr("Tên album không được để trống.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      let coverUrlToSave: string | null = editCoverUrl ?? null;

      if (editFile) {
        coverUrlToSave = await uploadCoverFile(editFile);
      }

      const res = await fetch(`${API_BASE}/admin/albums/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: t,
          coverUrl: coverUrlToSave,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Cập nhật album thất bại");
      }

      await fetchAlbums(dq);
      closeEdit();
    } catch (e: any) {
      setErr(e?.message || "Cập nhật album thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 text-slate-100 bg-transparent">
      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-[#4CC9ED] drop-shadow-[0_0_28px_rgba(76,201,237,0.85)]">
            Admin • Quản lý Album
          </h1>
          <p className="text-xs text-slate-300/80">
            Gõ để tìm • Sửa tên + đổi ảnh • Xoá album (track sẽ thành single) • Hiển thị ngày tạo (nếu API trả về)
          </p>
        </div>

        <Link
          href="/admin/users"
          className="rounded-full border border-cyan-300/15 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
        >
          ⟵ Về Admin
        </Link>
      </div>

      {err && (
        <div className="mb-4 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* SEARCH */}
      <div className="mb-4 rounded-3xl border border-cyan-300/15 bg-gradient-to-r from-[#050816]/80 via-[#071b3a]/50 to-black/70 backdrop-blur-xl p-3 shadow-[0_0_48px_rgba(76,201,237,0.14)]">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex-1 min-w-[240px] relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Gõ vài chữ để tìm album / nghệ sĩ..."
              className="w-full rounded-2xl border border-cyan-300/15 bg-black/25 px-4 py-2 text-sm outline-none
                         focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/20"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              {loading ? "Đang tìm..." : dq ? "Đã lọc" : "Tất cả"}
            </div>
          </div>

          <button
            onClick={() => setQ("")}
            className="rounded-2xl border border-cyan-300/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            title="Xoá tìm kiếm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="rounded-3xl border border-cyan-300/12 bg-gradient-to-b from-[#050816]/80 via-[#071b3a]/40 to-black/80 backdrop-blur-xl overflow-hidden shadow-[0_0_65px_rgba(76,201,237,0.12)]">
        <div className="px-4 py-3 border-b border-white/10 text-xs uppercase tracking-widest text-slate-300">
          Danh sách album {dq ? `(lọc: “${dq}”)` : ""}
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-slate-300">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-300">Không có album nào.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((a) => (
              <div
                key={a.id}
                className="px-4 py-3 flex items-center gap-4"
              >
                {/* LEFT */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveCover(a.coverUrl)}
                    alt={a.title}
                    className="w-12 h-12 rounded-xl object-cover border border-cyan-200/15 bg-black/30"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                    }}
                  />

                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {a.title}
                    </div>
                    <div className="text-xs text-slate-300/80 truncate">
                      Nghệ sĩ: {a.artist?.name || "(Không rõ)"} • Tracks:{" "}
                      {a._count?.tracks ?? 0}
                      {a.createdAt ? ` • Tạo: ${fmtDate(a.createdAt)}` : ""}
                    </div>
                  </div>
                </div>

                {/* RIGHT (nằm hẳn bên phải, cân đối) */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <Link
                    href={`/albums/${a.id}`}
                    className="min-w-[56px] text-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    Xem
                  </Link>

                  <button
                    onClick={() => openEdit(a)}
                    className="min-w-[56px] text-center rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100
                               hover:bg-cyan-400/18 hover:border-cyan-200/65
                               shadow-[0_0_14px_rgba(76,201,237,0.16)]"
                  >
                    Sửa
                  </button>

                  <button
                    onClick={() => handleDelete(a.id)}
                    className="min-w-[56px] text-center rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/20"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-cyan-300/25 bg-gradient-to-b from-[#050816]/95 via-[#071b3a]/88 to-black/95 p-5 shadow-[0_0_80px_rgba(76,201,237,0.20)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Edit Album
                </div>
                <div className="truncate text-lg font-bold text-white">
                  {editing.title}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Ngày tạo:{" "}
                  <span className="text-slate-200">{fmtDate(editing.createdAt ?? null)}</span>
                </div>
              </div>

              <button
                onClick={closeEdit}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[160px,1fr]">
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveCover(editFile ? URL.createObjectURL(editFile) : editCoverUrl)}
                  alt="cover"
                  className="w-36 h-36 rounded-2xl object-cover border border-cyan-200/15 bg-black/40"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="block w-full cursor-pointer text-[11px] text-slate-200
                             file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-cyan-600
                             file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-slate-50
                             hover:file:bg-cyan-500"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                />

                <div className="text-[11px] text-slate-400 text-center">
                  Chọn ảnh để thay cover (upload), hoặc giữ nguyên.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    Tên album
                  </label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-2xl border border-cyan-300/15 bg-black/25 px-4 py-2 text-sm outline-none
                               focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="Nhập tên album..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-100">
                    CoverUrl (tuỳ chọn)
                  </label>
                  <input
                    value={editCoverUrl ?? ""}
                    onChange={(e) => setEditCoverUrl(e.target.value || null)}
                    className="w-full rounded-2xl border border-cyan-300/15 bg-black/25 px-4 py-2 text-sm outline-none
                               focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="Nếu không upload file thì có thể dán URL..."
                    disabled={!!editFile}
                  />
                  {!!editFile && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      Đang chọn file → sẽ ưu tiên upload file, input URL bị khoá.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={closeEdit}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
                    disabled={saving}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-full bg-gradient-to-r from-[#4CC9ED] to-[#2563EB] px-5 py-2 text-sm font-semibold text-slate-950
                               shadow-[0_0_34px_rgba(76,201,237,0.26)] hover:brightness-110 disabled:opacity-60"
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  * Lưu sẽ gọi PATCH <span className="text-slate-200">/admin/albums/:id</span> với title + coverUrl.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
