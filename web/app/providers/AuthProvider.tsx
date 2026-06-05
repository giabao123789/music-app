"use client";

import type { ReactNode } from "react";

/**
 * AuthProvider mới KHÔNG dùng NextAuth nữa.
 * Vẫn giữ nguyên tên component để các chỗ import không bị lỗi.
 */
export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Chỉ render children, không wrap SessionProvider
  return <>{children}</>;
}
