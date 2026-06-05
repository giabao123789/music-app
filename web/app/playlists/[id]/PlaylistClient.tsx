"use client";
import RemoveFromPlaylistButton from "@/components/RemoveFromPlaylistButton";
import { useRouter } from "next/navigation";

type Track = { id: string; title: string; coverUrl: string; artist?: { name: string | null } | null };
type Detail = { id: string; name: string; tracks: Track[] };

export default function PlaylistClient({ detail }: { detail: Detail }) {
  const router = useRouter();
  const count = detail.tracks.length;

  const onRemoved = () => router.refresh(); // refresh nhẹ sau khi xóa

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-2xl font-semibold">{detail.name}</h1>
        <div className="text-sm text-slate-400">{count} bài</div> {/* ✅ tổng số bài */}
      </div>

      {count === 0 ? (
        <div className="text-slate-400 text-sm">Playlist chưa có bài hát nào.</div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detail.tracks.map((t) => (
            <li key={t.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
              <img src={t.coverUrl} alt={t.title} className="w-full h-40 object-cover rounded-lg mb-2" />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-sm text-slate-400">{t.artist?.name ?? "Unknown Artist"}</div>
                </div>
                <RemoveFromPlaylistButton playlistId={detail.id} trackId={t.id} onDone={onRemoved} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
