"use client";

import { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { API_BASE } from "@/lib/config";

type Role = "USER" | "ARTIST" | "ADMIN";

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  verified?: boolean;
  // backend trả Date, nhưng qua JSON sẽ thành string ISO
  createdAt?: string | Date | null;
};

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Dùng lại helper giống AdminGuard
function getToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return res;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/admin/users");

      if (!res.ok) {
        console.error("load users status:", res.status);
        throw new Error("Failed to load users");
      }

      const data = (await res.json()) as AdminUser[];
      setUsers(data);
    } catch (e) {
      console.error("load users error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (id: string, role: Role) => {
    try {
      setSavingId(id);
      const res = await authFetch(`/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        console.error("update role status:", res.status);
        throw new Error("Update role failed");
      }

      await fetchUsers();
    } catch (e) {
      console.error("update role error", e);
      alert("Không thể cập nhật quyền. Xem console để biết thêm chi tiết.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Bạn chắc chắn muốn xoá user này?")) return;
    try {
      setSavingId(id);
      const res = await authFetch(`/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("delete user status:", res.status);
        throw new Error("Delete user failed");
      }

      await fetchUsers();
    } catch (e) {
      console.error("delete user error", e);
      alert("Không thể xoá user. Xem console để biết thêm chi tiết.");
    } finally {
      setSavingId(null);
    }
  };

  // danh sách đã lọc theo search
  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers =
    normalizedSearch === ""
      ? users
      : users.filter((u) => {
          const text = `${u.email} ${u.name || ""} ${u.role}`.toLowerCase();
          return text.includes(normalizedSearch);
        });

  return (
    <AdminGuard>
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-purple-900 via-black to-purple-950 text-blue-50 px-4 md:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(56,189,248,0.9)]">
                Quản lý người dùng
              </h1>
              <p className="text-sm text-blue-200/80 mt-1">
                Thay đổi quyền, xoá tài khoản vi phạm. Neon dashboard ✨
              </p>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Tìm email, tên, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-slate-950/70 border border-cyan-400/60 px-4 py-2 text-sm text-blue-50 placeholder:text-blue-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-cyan-300/70">
                {filteredUsers.length}/{users.length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/60 border border-cyan-500/40 shadow-[0_0_25px_rgba(34,211,238,0.45)] overflow-hidden">
            <div className="px-4 py-3 border-b border-cyan-500/40 flex items-center justify-between">
              <span className="text-sm uppercase tracking-wide text-cyan-300">
                Danh sách user
              </span>
              {loading && (
                <span className="text-xs text-blue-200 animate-pulse">
                  Đang tải...
                </span>
              )}
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 sticky top-0 z-10">
                  <tr className="text-xs text-blue-200/80 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left hidden md:table-cell">
                      Tên
                    </th>
                    <th className="px-4 py-2 text-left hidden lg:table-cell">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left hidden md:table-cell">
                      Xác thực
                    </th>
                    <th className="px-4 py-2 text-right">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-slate-800/60 hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-50">
                            {u.email}
                          </span>
                          <span className="text-[11px] text-blue-300/70 md:hidden">
                            {u.name || "(Không tên)"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2 hidden md:table-cell text-blue-100/90">
                        {u.name || <span className="italic">Không tên</span>}
                      </td>

                      {/* ✅ CreatedAt: ngày + giờ + phút */}
                      <td className="px-4 py-2 hidden lg:table-cell text-xs text-slate-300">
                        {formatDateTime(u.createdAt)}
                      </td>

                      <td className="px-4 py-2">
                        <select
                          className="bg-slate-950/90 border border-cyan-500/50 rounded-full px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          value={u.role}
                          disabled={savingId === u.id}
                          onChange={(e) =>
                            updateRole(u.id, e.target.value as Role)
                          }
                        >
                          <option value="USER">USER</option>
                          <option value="ARTIST">ARTIST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td className="px-4 py-2 hidden md:table-cell">
                        {u.verified ? (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-400/60">
                            Đã xác thực
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded-full bg-slate-700/40 text-slate-200 border border-slate-500/60">
                            Chưa xác thực
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={savingId === u.id}
                          className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-red-500 text-white shadow-[0_0_15px_rgba(248,113,113,0.8)] hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-blue-200/70 text-sm"
                      >
                        Không tìm thấy user phù hợp với từ khoá.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
