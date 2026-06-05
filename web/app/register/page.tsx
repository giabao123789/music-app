// web/app/register/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "USER" | "ARTIST";

function pickApiErrorMessageFromText(raw: string): string {
  if (!raw) return "Đăng ký thất bại";

  try {
    const data = JSON.parse(raw);
    const msg = (data as any)?.message;

    if (Array.isArray(msg)) {
      const joined = msg.filter(Boolean).join("\n");
      if (joined.trim()) return joined;
    }
    if (typeof msg === "string" && msg.trim()) return msg;

    const err = (data as any)?.error;
    if (typeof err === "string" && err.trim()) return err;
  } catch {}

  return raw.trim() || "Đăng ký thất bại";
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [loading, setLoading] = useState(false);

  // ✅ NEW: error state (hiển thị dưới form)
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();

    // reset error mỗi lần submit
    setError(null);

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          displayName: displayName || null,
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        const friendly = pickApiErrorMessageFromText(text);
        throw new Error(friendly);
      }

      const q = new URLSearchParams({
        email,
        password,
        role,
        displayName: displayName || "",
      });

      router.push(`/register/verify?${q.toString()}`);
    } catch (err: any) {
      // ✅ hiển thị lỗi dưới form (không alert)
      setError(err?.message || "Đăng ký thất bại");
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
        <source src="/videos/register.mp4" type="video/mp4" />
      </video>

      {/* BLUE NEON overlay */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_25%_85%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.14),transparent_60%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md -translate-x-[300px]">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="mt-2 text-4xl font-extrabold tracking-[0.14em] text-[#38bdf8] drop-shadow-[0_0_26px_rgba(56,189,248,0.45)]">
              MUSIC WEB
            </div>
            <div className="mt-2 text-sm text-white/60">
              Tạo tài khoản và nhận OTP qua email
            </div>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
            <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.18),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.12),transparent_55%)]" />

            <form onSubmit={handleStart} className="relative space-y-2">
              <h1 className="text-2xl font-semibold">Tạo tài khoản</h1>
              <p className="text-sm text-white/60">
                Nhập thông tin → hệ thống gửi OTP → bạn xác minh ở bước tiếp theo.
              </p>

              {/* ❌ ERROR MESSAGE */}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm text-white/70">Email</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none
                  focus:border-[#38bdf8]/70 focus:ring-2 focus:ring-[#38bdf8]/25"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                />
              </div>

              {/* Display name */}
              <div className="space-y-1">
                <label className="text-sm text-white/70">
                  Tên hiển thị (tuỳ chọn)
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none
                  focus:border-[#38bdf8]/70 focus:ring-2 focus:ring-[#38bdf8]/25"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm text-white/70">Mật khẩu</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 outline-none
                  focus:border-[#38bdf8]/70 focus:ring-2 focus:ring-[#38bdf8]/25"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm text-white/70 block">
                  Đăng ký với tư cách
                </label>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setRole("USER")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      role === "USER"
                        ? "border-[#38bdf8]/70 bg-[#38bdf8]/18 shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">Người dùng</div>
                    <div className="text-xs text-white/60">Nghe nhạc, follow</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("ARTIST")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      role === "ARTIST"
                        ? "border-[#22d3ee]/70 bg-[#22d3ee]/18 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">Nghệ sĩ</div>
                    <div className="text-xs text-white/60">Upload, quản lý</div>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#38bdf8] to-[#22d3ee]
                px-4 py-3 text-sm font-semibold text-black hover:brightness-110
                disabled:opacity-60 shadow-[0_0_30px_rgba(56,189,248,0.25)]"
              >
                {loading ? "Đang gửi OTP..." : "Đăng gửi OTP"}
              </button>

              <p className="text-sm text-center text-white/60">
                Đã có tài khoản?{" "}
                <a
                  href="/login"
                  className="text-[#38bdf8] hover:brightness-110 underline decoration-white/20"
                >
                  Đăng nhập
                </a>
              </p>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            OTP sẽ được gửi về email bạn nhập.
          </div>
        </div>
      </div>
    </main>
  );
}
