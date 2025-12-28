"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (presetEmail) setEmail(presetEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !code || !newPassword) {
      alert("Vui lòng nhập đầy đủ email, OTP và mật khẩu mới");
      return;
    }
    if (newPassword.length < 4) {
      alert("Mật khẩu tối thiểu 4 ký tự");
      return;
    }
    if (newPassword !== confirm) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        console.error("reset-password error:", data);
        alert(data?.message || "Đặt lại mật khẩu thất bại");
        return;
      }

      setMsg("Đặt lại mật khẩu thành công! Đang chuyển về trang đăng nhập...");

      setTimeout(() => {
        router.replace("/login");
      }, 800);
    } catch (err) {
      console.error(err);
      alert("Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-slate-100">
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

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,182,213,0.22),transparent_55%),radial-gradient(circle_at_25%_85%,rgba(255,118,188,0.16),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(186,230,253,0.10),transparent_60%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="text-xs tracking-[0.45em] text-white/60">2</div>
            <div className="mt-2 text-4xl font-extrabold tracking-[0.14em] text-[#ffd1e6] drop-shadow-[0_0_24px_rgba(255,118,188,0.35)]">
              MUSIC WEBSITE
            </div>
            <div className="mt-2 text-sm text-white/60">
              Nhập OTP và mật khẩu mới
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-md shadow-[0_0_70px_rgba(255,118,188,0.10)]">
            <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_18%_12%,rgba(255,118,188,0.18),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(255,182,213,0.10),transparent_55%)]" />

            <div className="relative">
              <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
              <p className="mt-1 text-sm text-white/60">
                OTP hết hạn sau 10 phút.
              </p>

              {msg && (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {msg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  <label className="block text-sm text-white/70">Mã OTP</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-slate-100 outline-none focus:border-[#ff76bc]/60 focus:ring-2 focus:ring-[#ffb6d5]/20"
                    placeholder="VD: 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm text-white/70">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-slate-100 outline-none focus:border-[#ff76bc]/60 focus:ring-2 focus:ring-[#ffb6d5]/20"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm text-white/70">Nhập lại mật khẩu</label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-slate-100 outline-none focus:border-[#ff76bc]/60 focus:ring-2 focus:ring-[#ffb6d5]/20"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#ffb6d5] to-[#ff76bc] px-4 py-3 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60 shadow-[0_0_28px_rgba(255,118,188,0.20)]"
                >
                  {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
                </button>

                <div className="pt-2 text-center text-sm text-white/60">
                  <a
                    href="/login"
                    className="text-[#ffd1e6] hover:brightness-110 underline decoration-white/20"
                  >
                    Quay về đăng nhập
                  </a>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            Tip: Mỗi OTP chỉ dùng được 1 lần.
          </div>
        </div>
      </div>
    </main>
  );
}
 