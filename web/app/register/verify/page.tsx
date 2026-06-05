"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";

export default function VerifyPage() {
  const router = useRouter();
  const search = useSearchParams();

  const email = search.get("email") ?? "";
  const password = search.get("password") ?? "";
  const role = (search.get("role") ?? "USER") as "USER" | "ARTIST";
  const displayName = search.get("displayName") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // nếu thiếu thông tin thì quay lại form đăng ký
  useEffect(() => {
    if (!email || !password) {
      alert("Thiếu thông tin đăng ký, hãy nhập lại.");
      router.replace("/register");
    }
  }, [email, password, router]);

  const maskedEmail = useMemo(() => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    return `${user.slice(0, 2)}***@${domain}`;
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      alert("OTP phải đủ 6 số");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          password,
          role,
          displayName: displayName || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      alert("Xác minh thành công, đang đăng nhập…");
      router.push("/");
    } catch (err: any) {
      alert(`Xác minh thất bại: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/register");
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-slate-100">
      {/* Video background – giống register */}
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

      {/* BLUE NEON overlay nhẹ */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(circle_at_25%_85%,rgba(34,211,238,0.14),transparent_65%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.12),transparent_65%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md -translate-x-[300px]">
          {/* Brand */}
          <div className="mb-6 text-center">
            <div className="mt-2 text-4xl font-extrabold tracking-[0.14em] text-[#38bdf8] drop-shadow-[0_0_26px_rgba(56,189,248,0.45)]">
              MUSIC WEB
            </div>
            <div className="mt-2 text-sm text-white/60">
              Nhập mã OTP đã gửi về email
            </div>
          </div>

          {/* Card – giống register */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
            <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.16),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.12),transparent_55%)]" />

            <form onSubmit={handleVerify} className="relative space-y-3">
              <h1 className="text-2xl font-semibold">Xác minh OTP</h1>
              <p className="text-sm text-white/60">
                Mã đã gửi đến{" "}
                <span className="font-semibold">{maskedEmail}</span>
              </p>

              <div className="space-y-1">
                <label className="text-sm text-white/70">Mã OTP</label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/25
                  px-3 py-2.5 text-center tracking-[0.45em] text-lg outline-none
                  focus:border-[#38bdf8]/70 focus:ring-2 focus:ring-[#38bdf8]/25"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-[#38bdf8] to-[#22d3ee]
                px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110
                disabled:opacity-60 shadow-[0_0_30px_rgba(56,189,248,0.25)]"
              >
                {loading ? "Đang xác minh..." : "Xác minh & đăng nhập"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full rounded-2xl border border-white/10
                px-4 py-2.5 text-sm text-white/80 hover:bg-white/5"
              >
                Nhập lại thông tin
              </button>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            Kiểm tra cả thư mục Spam nếu chưa thấy email.
          </div>
        </div>
      </div>
    </main>
  );
}
