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
    const head = user.slice(0, 2);
    return `${head}***@${domain}`;
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
      console.log("verify-otp:", res.status, text);

      if (!res.ok) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      alert("Xác minh thành công, đang đăng nhập…");
      router.push("/"); // hoặc /login tuỳ flow
    } catch (err: any) {
      console.error(err);
      alert(`Xác minh thất bại: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/register");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-transparent
 text-slate-100">
      <form
        onSubmit={handleVerify}
        className="w-full max-w-md space-y-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800"
      >
        <h1 className="text-2xl font-semibold mb-2">Tạo tài khoản</h1>
        <p className="text-sm text-slate-400">
          Nhập mã OTP đã được gửi đến{" "}
          <span className="font-semibold">{maskedEmail}</span>
        </p>

        <div className="space-y-1">
          <label className="text-sm">Mã OTP</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 tracking-[0.4em] text-center text-lg"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6 chữ số"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? "Đang xác minh..." : "Xác minh OTP & đăng nhập"}
        </button>

        <button
          type="button"
          onClick={handleBack}
          className="w-full py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          Nhập lại thông tin
        </button>
      </form>
    </main>
  );
}
