// web/app/login/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Role = "USER" | "ARTIST" | "ADMIN";

type LoginResponse = {
  ok: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    verified: boolean;
  };
};

function pickApiErrorMessage(data: any): string {
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.filter(Boolean).join("\n");
  if (typeof msg === "string" && msg.trim()) return msg;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return "Đăng nhập thất bại";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: error state để hiện dòng đỏ thay vì alert
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse | any = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        console.error("Login error:", data);
        setError(pickApiErrorMessage(data)); // ✅ show message cụ thể từ backend
        return;
      }

      // ✅ Lưu token + user (GIỮ NGUYÊN)
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      // ✅ Cookie để middleware không đá về /auth (GIỮ NGUYÊN)
      const maxAge = 7 * 24 * 60 * 60; // 7 ngày
      document.cookie = `accessToken=${encodeURIComponent(
        data.accessToken
      )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      document.cookie = `token=${encodeURIComponent(
        data.accessToken
      )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

      // ✅ Redirect theo rule của bạn (GIỮ NGUYÊN)
      const role = data.user.role as Role;

      if (callbackUrl) {
        router.replace(callbackUrl);
        return;
      }

      if (role === "ADMIN") {
        router.replace("/admin/users");
      } else if (role === "ARTIST") {
        router.replace("/artist");
      } else {
        router.replace("/");
      }
    } catch (err) {
      console.error(err);
      setError("Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-slate-100">
      {/* Video background */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/videos/login.mp4" type="video/mp4" />
      </video>

      {/* Overlay: PINK PASTEL NEON */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,182,213,0.22),transparent_55%),radial-gradient(circle_at_25%_85%,rgba(255,118,188,0.16),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(186,230,253,0.10),transparent_60%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="text-xs tracking-[0.45em] text-white/60"></div>
            <div className="mt-2 text-4xl font-extrabold tracking-[0.14em] text-[#ffd1e6] drop-shadow-[0_0_24px_rgba(255,118,188,0.35)]">
              MUSIC WEBSITE
            </div>
            <div className="mt-2 text-sm text-white/60">
              Đăng nhập để vào trang chủ
            </div>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-md shadow-[0_0_70px_rgba(255,118,188,0.10)]">
            <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_18%_12%,rgba(255,118,188,0.18),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(255,182,213,0.10),transparent_55%)]" />

            <div className="relative">
              <h1 className="text-2xl font-semibold">Đăng nhập</h1>
              <p className="mt-1 text-sm text-white/60">
                Nhập thông tin tài khoản của bạn.
              </p>

              {/* ✅ ERROR MESSAGE (đỏ, không alert) */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm text-white/70">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-slate-100 outline-none focus:border-[#ff76bc]/60 focus:ring-2 focus:ring-[#ffb6d5]/20"
                    placeholder="you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm text-white/70">Mật khẩu</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-slate-100 outline-none focus:border-[#ff76bc]/60 focus:ring-2 focus:ring-[#ffb6d5]/20"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#ffb6d5] to-[#ff76bc] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60 shadow-[0_0_28px_rgba(255,118,188,0.20)]"
                >
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                <div className="pt-2 text-center text-sm text-white/60">
                  <a
                    href="/forgot-password"
                    className="text-[#ffd1e6] hover:brightness-110 underline decoration-white/20"
                  >
                    Quên mật khẩu?
                  </a>
                </div>

                <div className="pt-2 text-center text-sm text-white/60">
                  Chưa có tài khoản?{" "}
                  <a
                    href="/register"
                    className="text-[#ffd1e6] hover:brightness-110 underline decoration-white/20"
                  >
                    Đăng ký
                  </a>
                </div>
              </form>
            </div>
          </div>

                 </div>
      </div>
    </main>
  );
}
