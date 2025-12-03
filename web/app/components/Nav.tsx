"use client";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  return (
    <nav className="sticky top-0 z-10 bg-transparent
/80 backdrop-blur border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-4 text-slate-200">
        <a href="/" className="font-semibold">Music</a>
        <a href="/favorites" className="hover:underline">Yêu thích</a>
        <a href="/playlists" className="hover:underline">Playlist</a>
      </div>
    </nav>
  );
}
