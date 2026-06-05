// /lib/config.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  // Nếu đã là link đầy đủ thì giữ nguyên
  if (/^https?:\/\//i.test(raw)) return raw;
  // Nếu bắt đầu bằng "/" thì ghép với API_BASE
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  // Còn lại thì thêm "/" ở giữa
  return `${API_BASE}/${raw}`;
}