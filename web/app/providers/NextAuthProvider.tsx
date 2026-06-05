"use client";

import type { ReactNode } from "react";

/**
 * Stub cho NextAuthProvider để không còn phụ thuộc next-auth/react.
 * Nếu chỗ khác vẫn import NextAuthProvider thì vẫn chạy bình thường.
 */
export default function NextAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
