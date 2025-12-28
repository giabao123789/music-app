// web/app/Shell.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";

import Nav from "@/components/Nav";
import PlayerBar from "@/components/PlayerBar";
import ClientOnly from "@/components/ClientOnly";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ Ẩn Nav + PlayerBar ở các trang auth + forgot/reset password
  const hideChrome =
    pathname === "/auth" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/reset-password/");

  return (
    <>
      {!hideChrome && <Nav />}
      {children}
      {!hideChrome && (
        <ClientOnly>
          <PlayerBar />
        </ClientOnly>
      )}
    </>
  );
}
