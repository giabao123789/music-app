"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SearchDropdown({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Click ra ngoài thì ẩn dropdown
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, []);

  // Gọi API tìm kiếm (tối đa 6 kết quả)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        const combined = [
          ...(data.tracks || []).map((t: any) => ({ ...t, type: "track" })),
          ...(data.artists || []).map((a: any) => ({ ...a, type: "artist" })),
          ...(data.albums || []).map((al: any) => ({ ...al, type: "album" })),
        ].slice(0, 6);

        setResults(combined);
        setOpen(combined.length > 0);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    fetchData();
  }, [query]);

  if (!open || results.length === 0) return null;

  return (
    <div
      ref={ref}
      className="
        absolute left-0 right-0 mt-2 z-50 
        bg-[#050816]/95 backdrop-blur-xl 
        border border-white/10 rounded-2xl 
        shadow-2xl overflow-hidden
      "
    >
      {results.map((item) => (
        <Link
          key={item.id}
          href={
            item.type === "track"
              ? `/track/${item.id}`
              : item.type === "artist"
              ? `/artist/${item.id}`
              : `/album/${item.id}`
          }
          className="
            flex items-center gap-3 px-4 py-3 
            hover:bg-white/10 transition text-sm text-slate-200
          "
        >
          {/* Cover / Avatar */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              item.coverUrl ||
              item.avatar ||
              "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg"
            }
            className="w-10 h-10 rounded-lg object-cover"
            alt=""
          />

          <div className="min-w-0">
            <div className="font-semibold truncate">
              {item.title || item.name}
            </div>

            <div className="text-xs text-slate-400 truncate">
              {item.type === "track"
                ? item.artist?.name ?? "Không rõ nghệ sĩ"
                : item.type === "artist"
                ? "Nghệ sĩ"
                : "Album"}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
