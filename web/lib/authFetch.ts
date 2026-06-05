// lib/authFetch.ts
import { API_BASE } from "./config";

function getToken() {
  if (typeof window === "undefined") return null;
  // thử nhiều key phổ biến – bạn có thể chỉnh lại cho đúng với login của bạn
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }

  // đảm bảo JSON khi cần
  if (!("Content-Type" in headers)) {
    (headers as any)["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // vẫn gửi cookie
  });

  return res;
}
