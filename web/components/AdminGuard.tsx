"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "USER" | "ARTIST" | "ADMIN";

type CurrentUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

// Lấy token từ localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

// Giải mã JWT để lấy thông tin user + role
function decodeUserFromToken(): CurrentUser | null {
  if (typeof window === "undefined") return null;

  const token = getToken();
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadStr = atob(parts[1]);
    const payload = JSON.parse(payloadStr);

    const role = (payload.role || payload["role"]) as Role | undefined;
    if (!role) return null;

    const user: CurrentUser = {
      id: (payload.sub as string) || (payload.id as string) || "",
      email: (payload.email as string) || "",
      name: (payload.name as string) || null,
      role,
    };

    return user;
  } catch (err) {
    console.error("Lỗi giải mã JWT trong AdminGuard:", err);
    return null;
  }
}

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = decodeUserFromToken();
    setUser(u);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-950 text-blue-100">
        <div className="animate-pulse text-lg tracking-wide">
          Đang kiểm tra quyền truy cập...
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 via-black to-purple-950 text-blue-100">
        <p className="text-xl font-semibold mb-4">
          Bạn không có quyền truy cập trang quản trị.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.6)] hover:scale-105 transition-transform"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
