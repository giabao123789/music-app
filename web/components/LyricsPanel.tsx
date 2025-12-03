"use client";

import { usePlayer } from "../providers/PlayerProvider";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function LyricsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { current } = usePlayer();
  const [lyrics, setLyrics] = useState("Đang tải lời bài hát...");

  useEffect(() => {
    if (!current) return;

    setLyrics("Đang tải lời bài hát...");

    fetch(`http://localhost:3001/tracks/${current.id}`)
      .then((res) => res.json())
      .then((data) => {
        setLyrics(data?.lyrics || "Không có lời bài hát.");
      })
      .catch(() => {
        setLyrics("Không thể tải lời bài hát.");
      });
  }, [current?.id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Panel chính */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.22 }}
            className="
              w-[90%] max-w-2xl max-h-[80vh]
              bg-gradient-to-b from-[#141922] via-[#0e131b] to-[#090d14]
              border border-white/10 rounded-2xl shadow-2xl
              p-6 text-white relative overflow-hidden
            "
          >
            {/* Nút đóng */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full 
                bg-white/10 hover:bg-white/20 transition"
            >
              <X size={18} />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-center mb-1">
              {current?.title}
            </h2>

            {current?.artist?.name && (
              <p className="text-center text-sky-400 text-sm mb-4">
                {current.artist.name}
              </p>
            )}

            {/* Lyrics */}
            <div
              className="
                overflow-y-auto max-h-[60vh]
                custom-scrollbar
                text-slate-300 leading-relaxed whitespace-pre-wrap
                px-2 py-1 tracking-wide
              "
            >
              {lyrics}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
