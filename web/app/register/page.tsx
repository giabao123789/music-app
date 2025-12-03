"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "USER" | "ARTIST";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [loading, setLoading] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Nhập email + mật khẩu");
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
      console.log("register-start:", res.status, text);

      if (!res.ok) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      alert("Đã gửi OTP, vui lòng kiểm tra email!");

      // 👉 đưa toàn bộ thông tin qua trang verify
      const q = new URLSearchParams({
        email,
        password,
        role,
        displayName: displayName || "",
      });

      router.push(`/register/verify?${q.toString()}`);
    } catch (err: any) {
      console.error(err);
      alert(`Đăng ký thất bại: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-transparent
 text-slate-100">
      <form
        onSubmit={handleStart}
        className="w-full max-w-md space-y-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800"
      >
        <h1 className="text-2xl font-semibold mb-2">Tạo tài khoản</h1>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Tên hiển thị (tuỳ chọn)</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Mật khẩu</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm block mb-1">Đăng ký với tư cách</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={role === "USER"}
                onChange={() => setRole("USER")}
              />
              Người dùng
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={role === "ARTIST"}
                onChange={() => setRole("ARTIST")}
              />
              Nghệ sĩ
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Đang gửi OTP..." : "Đăng gửi OTP"}
        </button>

        <p className="text-sm text-center text-slate-400">
          Đã có tài khoản?{" "}
          <a href="/login" className="underline">
            Đăng nhập
          </a>
        </p>
      </form>
    </main>
  );
}
