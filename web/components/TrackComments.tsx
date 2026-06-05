"use client";

import React, { useEffect, useState, useMemo } from "react";
import { API_BASE } from "@/lib/config";

const API_COMMENTS_BASE = `${API_BASE}/comments`;

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  name?: string | null;
  avatar?: string | null;
};

type CommentUser = {
  id: string;
  name: string | null;
  avatar?: string | null;
};

type TrackComment = {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
};

type TrackCommentsProps = {
  trackId: string;
  compact?: boolean; // nếu muốn UI nhỏ gọn hơn ở nơi khác
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

function getCurrentUserFromStorage(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem("currentUser") ||
    localStorage.getItem("user") ||
    null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function TrackComments({ trackId, compact }: TrackCommentsProps) {
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // load current user
  useEffect(() => {
    const u = getCurrentUserFromStorage();
    setCurrentUser(u);
  }, []);

  const canPost = useMemo(() => !!currentUser, [currentUser]);

  const isOwner = (c: TrackComment) =>
    currentUser && c.user && c.user.id === currentUser.id;

  // FETCH COMMENTS
  useEffect(() => {
    if (!trackId) return;

    let cancelled = false;

    async function fetchComments() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_COMMENTS_BASE}/track/${trackId}`);
        if (!res.ok) {
          throw new Error(await res.text().catch(() => "Không tải được comment"));
        }
        const data: TrackComment[] = await res.json();
        if (!cancelled) setComments(data || []);
      } catch (e: any) {
        if (!cancelled) {
          console.error("[TrackComments] fetch error", e);
          setError("Không thể tải bình luận.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchComments();

    // optional: “realtime” kiểu poll nhẹ mỗi 20s
    const interval = setInterval(fetchComments, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trackId]);

  // SUBMIT COMMENT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!currentUser) {
      alert("Bạn cần đăng nhập để bình luận.");
      return;
    }

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setPosting(true);
      setError(null);

      const res = await fetch(`${API_COMMENTS_BASE}/track/${trackId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Gửi bình luận thất bại");
      }

      const created: TrackComment = await res.json();
      setContent("");
      // realtime: prepend vào danh sách
      setComments((prev) => [created, ...prev]);
    } catch (e: any) {
      console.error("[TrackComments] post error", e);
      setError(e.message || "Không thể gửi bình luận.");
    } finally {
      setPosting(false);
    }
  };

  // DELETE COMMENT
  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;
    if (!confirm("Xoá bình luận này?")) return;

    const token = getTokenFromStorage();
    if (!token) {
      alert("Không tìm thấy token. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      const res = await fetch(`${API_COMMENTS_BASE}/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Xoá bình luận thất bại");
      }

      // realtime: xoá khỏi state
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e: any) {
      console.error("[TrackComments] delete error", e);
      alert(e.message || "Không thể xoá bình luận.");
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl border border-cyan-500/40
        bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-sky-950/70
        text-xs text-slate-100 shadow-[0_0_40px_rgba(56,189,248,0.35)]
        ${compact ? "p-3" : "p-4 md:p-5"}
      `}
    >
      {/* NEON GLOW */}
      <div className="pointer-events-none absolute -inset-32 opacity-30">
        <div className="bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
      </div>

      <div className="relative z-10 space-y-3">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cyan-300">
              Bình luận
            </div>
            <div className="text-[11px] text-slate-400">
              {comments.length} bình luận
            </div>
          </div>

          {!canPost && (
            <span className="hidden text-[11px] text-slate-400 md:inline">
              Đăng nhập để tham gia bình luận ✨
            </span>
          )}
        </div>

        {/* FORM INPUT */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={compact ? 2 : 3}
            placeholder={
              canPost
                ? "Viết cảm nhận của bạn về bài hát này..."
                : "Đăng nhập để bình luận..."
            }
            disabled={!canPost || posting}
            className={`
              w-full resize-none rounded-2xl border bg-slate-950/70 px-3 py-2
              text-[12px] text-slate-50 outline-none
              transition
              ${
                canPost
                  ? "border-cyan-500/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/70"
                  : "border-slate-700/70 text-slate-500"
              }
            `}
          />
          <div className="flex items-center justify-between gap-2">
            {error && (
              <span className="max-w-[60%] truncate text-[11px] text-red-300">
                {error}
              </span>
            )}
            <button
              type="submit"
              disabled={!canPost || posting || !content.trim()}
              className={`
                ml-auto inline-flex items-center gap-1 rounded-full
                bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500
                px-4 py-1.5 text-[11px] font-semibold text-slate-950
                shadow shadow-cyan-500/50
                transition
                hover:brightness-110
                disabled:cursor-not-allowed disabled:opacity-50
              `}
            >
              {posting ? "Đang gửi..." : "Gửi bình luận"}
            </button>
          </div>
        </form>

        {/* LIST */}
        <div
          className={`
            mt-1 space-y-2 overflow-y-auto pr-1
            ${compact ? "max-h-48" : "max-h-72"}
          `}
        >
          {loading && (
            <p className="text-[11px] text-cyan-200/80">Đang tải bình luận...</p>
          )}

          {!loading && comments.length === 0 && (
            <p className="text-[11px] text-slate-400">
              Chưa có bình luận nào. Hãy là người đầu tiên lên tiếng 🎧
            </p>
          )}

          {comments.map((c) => {
            const canDelete = isOwner(c) || currentUser?.role === "ADMIN";
            const avatarUrl =
              c.user.avatar && c.user.avatar.startsWith("http")
                ? c.user.avatar
                : c.user.avatar
                ? `${API_BASE}${c.user.avatar}`
                : null;

            return (
              <div
                key={c.id}
                className="group flex items-start gap-3 rounded-2xl bg-slate-950/70 px-3 py-2 border border-slate-800/80 hover:border-cyan-500/60 transition"
              >
                <div className="mt-0.5 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-cyan-400/50 bg-slate-900/80">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={c.user.name || "avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-cyan-200">
                      {c.user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[60%] truncate text-[12px] font-semibold text-slate-50">
                      {c.user.name || "Người dùng"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-100 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="ml-1 mt-1 hidden rounded-full border border-red-500/70 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-500/25 group-hover:inline-flex"
                  >
                    Xoá
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
