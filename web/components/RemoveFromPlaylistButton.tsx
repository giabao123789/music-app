"use client";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";

export default function RemoveFromPlaylistButton({
  playlistId,
  trackId,
  onDone,
}: {
  playlistId: string;
  trackId: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const removeTrack = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: "DELETE" });
      const txt = await res.text();
      if (!res.ok) {
        toast.show(`Xóa thất bại (${res.status})`, "error");
        console.error("remove failed:", txt);
        return;
      }
      toast.show("Đã xóa khỏi playlist ✅");
      // ưu tiên callback nếu có; nếu không thì refresh trang nhẹ
      onDone ? onDone() : router.refresh();
    } catch (e) {
      toast.show("Lỗi mạng khi xóa", "error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={removeTrack}
      disabled={loading}
      className="px-2 py-1 rounded border border-red-400 text-red-300 text-xs hover:bg-red-900/20 disabled:opacity-60"
      title="Xóa khỏi playlist"
    >
      {loading ? "Đang xóa..." : "✖ Xóa"}
    </button>
  );
}
