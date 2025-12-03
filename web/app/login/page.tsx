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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse | any = await res.json();

      if (!res.ok || !data.ok) {
        console.error("Login error:", data);
        alert("Đăng nhập thất bại");
        return;
      }

      // Lưu token + user vào localStorage cho phần API backend
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("currentUser", JSON.stringify(data.user));

      // === LOGIC CHUYỂN HƯỚNG ===
      const role = data.user.role as Role;

      // 1. Nếu có callbackUrl => ưu tiên dùng (ví dụ /artist/upload)
      if (callbackUrl) {
        router.push(callbackUrl);
        return;
      }

      // 2. Không có callbackUrl => theo role
      if (role === "ADMIN") {
        router.push("/admin/users");
      } else if (role === "ARTIST") {
        router.push("/artist");
      } else {
        // USER bình thường -> về trang chủ nghe nhạc
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      alert("Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Đăng nhập</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Mật khẩu</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white rounded py-2 font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
