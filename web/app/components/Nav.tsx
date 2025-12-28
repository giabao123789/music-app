// web/app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  verified: boolean;
  artistId?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Dùng chung cách lấy token với TrackCard
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage =
    localStorage.getItem("mp:token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token");

  if (fromStorage) return fromStorage;

  const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);

  return null;
}

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Lấy user + artistId từ localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadUser = () => {
      const raw = localStorage.getItem("currentUser");
      if (!raw) {
        setUser(null);
        setArtistId(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as CurrentUser;
        setUser(parsed);

        const storedArtistId =
          parsed.artistId || localStorage.getItem("artistId");
        if (storedArtistId) {
          setArtistId(storedArtistId);
        }
      } catch {
        setUser(null);
        setArtistId(null);
      }
    };

    loadUser();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "currentUser" || e.key === "accessToken") {
        loadUser();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Nếu là ARTIST nhưng chưa có artistId -> gọi /artist/me để lấy
  useEffect(() => {
    if (!user || user.role !== "ARTIST") return;
    if (artistId) return; // đã có rồi

    const token = getAuthToken();
    if (!token) {
      console.warn("[Nav] Không tìm thấy token cho ARTIST");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/artist/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.warn(
            "[Nav] /artist/me trả về lỗi",
            res.status,
            await res.text().catch(() => "")
          );
          return;
        }

        const data = await res.json();
        if (data?.id) {
          localStorage.setItem("artistId", data.id);
          setArtistId(data.id);
        }
      } catch (err) {
        console.error("[Nav] gọi /artist/me lỗi", err);
      }
    })();
  }, [user, artistId]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("mp:token");
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("access_token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("artistId");

      // Xoá luôn cookie token (nếu có) cho sạch session
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    setUser(null);
    setArtistId(null);
    router.push("/login");
  };

  const role = user?.role;
  const isArtist = role === "ARTIST";

  return (
    <nav
      className={
        "navbar-gradient text-white flex items-center gap-4 px-4 py-3 " +
        "border-b border-white/10 shadow-lg shadow-black/40 sticky top-0 z-40"
      }
    >
      {/* Logo + tên app */}
      <div className="flex items-center gap-3">
        <div
          className="
            w-9 h-9 rounded-full
            bg-gradient-to-br from-[#4e148c] via-[#4361ee] to-[#4cc9f0]
            flex items-center justify-center
            text-xs font-bold
            shadow-[0_0_20px_rgba(76,201,240,0.9)]
          "
        >
          ♫
        </div>
        <span className="font-semibold text-sm sm:text-base tracking-wide">
          Music App
        </span>
      </div>

      {/* NAV LINKS */}
      <div className="flex gap-4 ml-4 text-xs sm:text-sm items-center">
        {/* USER / ADMIN (không phải ARTIST) */}
        {!isArtist && (
          <>
            <Link href="/" className="hover:text-[#4cc9f0] transition-colors">
              Music
            </Link>
            <Link
              href="/favorites"
              className="hover:text-[#4cc9f0] transition-colors"
            >
              Yêu thích
            </Link>
            <Link
              href="/playlists"
              className="hover:text-[#4cc9f0] transition-colors"
            >
              Playlist
            </Link>
            <Link
              href="/artists"
              className="hover:text-[#4cc9f0] transition-colors"
            >
              Nghệ sĩ
            </Link>

            {/* MENU ADMIN DROPDOWN */}
            {role === "ADMIN" && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu((v) => !v)}
                  className="
                    px-3 py-1 rounded-full text-xs sm:text-sm
                    bg-gradient-to-r from-[#7209b7] to-[#4361ee]
                    shadow-[0_0_18px_rgba(79,70,229,0.9)]
                    hover:shadow-[0_0_24px_rgba(76,201,240,1)]
                    transition-all flex items-center gap-1
                  "
                >
                  Admin
                  <span className="text-[10px]">▼</span>
                </button>

                {showAdminMenu && (
                  <div
                    className="
                      absolute mt-2 w-44 rounded-xl overflow-hidden
                      bg-slate-900/95 border border-cyan-500/50
                      shadow-[0_0_25px_rgba(34,211,238,0.8)]
                    "
                  >
                    <Link
                      href="/admin/users"
                      className="block px-3 py-2 text-xs sm:text-sm hover:bg-slate-800 hover:text-cyan-300"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      Người dùng
                    </Link>
                    <Link
                      href="/admin/artists"
                      className="block px-3 py-2 text-xs sm:text-sm hover:bg-slate-800 hover:text-cyan-300"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      Nghệ sĩ
                    </Link>
                    <Link
                      href="/admin/tracks"
                      className="block px-3 py-2 text-xs sm:text-sm hover:bg-slate-800 hover:text-cyan-300"
                      onClick={() => setShowAdminMenu(false)}
                    >
                      Bài hát
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ARTIST MODE */}
        {isArtist && (
          <>
            <Link
              href="/artist"
              className="hover:text-[#4cc9f0] transition-colors"
            >
              Trang nghệ sĩ
            </Link>
            <Link
              href="/artist/upload"
              className="hover:text-[#4cc9f0] transition-colors"
            >
              Upload nhạc
            </Link>
            {artistId && (
              <Link
                href={`/artists/${artistId}`}
                className="hover:text-[#4cc9f0] whitespace-nowrap transition-colors"
              >
                Trang của tôi
              </Link>
            )}
          </>
        )}
      </div>

      {/* Góc phải: user info */}
      <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm">
        {!user ? (
          <>
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-[#4cc9f0] transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="underline underline-offset-4 hover:text-pink-300 transition-colors"
            >
              Đăng ký
            </Link>
          </>
        ) : (
          <>
            <span className="opacity-80 max-w-[220px] truncate text-right">
              {user.email} ({role})
            </span>
            <button
              onClick={handleLogout}
              className="underline underline-offset-4 hover:text-red-300 transition-colors"
            >
              Đăng xuất
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
