"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ARTIST" | "ADMIN";
  verified: boolean;
  createdAt: string;
  Artist?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = localStorage.getItem("accessToken");
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Fetch /admin/users failed:", res.status, text);
          setError(`API lỗi: ${res.status}`);
          setUsers([]);
          return;
        }

        const data = await res.json();
        console.log("Users API data:", data);
        setUsers(data);
      } catch (e) {
        console.error("Error fetching users:", e);
        setError("Không thể tải danh sách người dùng");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  if (!mounted) return null;

  if (!token) {
    return <div>Hãy đăng nhập trước.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Quản lý người dùng</h2>
      {loading && <p>Đang tải...</p>}
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <table className="min-w-full text-sm border border-neutral-800">
        <thead className="bg-neutral-900">
          <tr>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Tên</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Verified</th>
            <th className="p-2 border">Artist</th>
            <th className="p-2 border">Created</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-neutral-800">
              <td className="p-2 border">{u.email}</td>
              <td className="p-2 border">{u.name}</td>
              <td className="p-2 border">{u.role}</td>
              <td className="p-2 border">{u.verified ? "✅" : "❌"}</td>
              <td className="p-2 border">{u.Artist?.name ?? "-"}</td>
              <td className="p-2 border">
                {new Date(u.createdAt).toLocaleString()}
              </td>
              <td className="p-2 border">
                {/* TODO: nút Xóa/Sửa nếu cần */}
              </td>
            </tr>
          ))}

          {!loading && !error && users.length === 0 && (
            <tr>
              <td className="p-2 text-center" colSpan={7}>
                Không có user nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
