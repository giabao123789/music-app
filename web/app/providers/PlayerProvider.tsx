// web/app/providers/PlayerProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

export type Track = {
  id: string;
  title: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: string | null; // để PlayerBar có thể cache lời bài hát
  artist?: { name: string | null } | null;
};

type Ctx = {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>; // PlayerBar cần dùng để cache lyrics
  index: number;
  setIndex: (i: number) => void;
  current?: Track;
  playing: boolean;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  time: number;
  duration: number;
  seek: (pct: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  addToQueue: (t: Track) => void;
  clearQueue: () => void;
  playNow: (t: Track) => void;
};

const PlayerCtx = createContext<Ctx | null>(null);

export const usePlayer = () => {
  const v = useContext(PlayerCtx);
  if (!v) throw new Error("usePlayer must be used inside PlayerProvider");
  return v;
};

const LS_QUEUE = "mp:queue";
const LS_INDEX = "mp:index";
const LS_VOL = "mp:vol";
const LS_PLAYING = "mp:playing";
const LS_LAST = "mp:last"; // nhớ vị trí đang nghe
const LS_RECENT = "mp:recent"; // lịch sử nghe

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const lastPersistRef = useRef<number>(0);

  // ===== STATE =====
  const [queue, setQueue] = useState<Track[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]");
    } catch {
      return [];
    }
  });

  const [index, setIndexState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const n = Number(localStorage.getItem(LS_INDEX) || 0);
    return Number.isFinite(n) ? n : 0;
  });

  const [playing, setPlaying] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_PLAYING) === "1";
  });

  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(localStorage.getItem(LS_VOL) ?? 1);
    if (!Number.isFinite(v)) return 1;
    return Math.max(0, Math.min(1, v));
  });

  const current = useMemo<Track | undefined>(() => {
    if (!queue.length) return undefined;
    if (index < 0 || index >= queue.length) return queue[0];
    return queue[index];
  }, [queue, index]);

  // ===== helper để setIndex & lưu localStorage =====
  const setIndex = useCallback((i: number) => {
    setIndexState(i);
    try {
      localStorage.setItem(LS_INDEX, String(i));
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(LS_VOL, String(clamped));
    } catch {
      // ignore
    }
    if (audio.current) audio.current.volume = clamped;
  }, []);

  // ===== restore last time for current track =====
  useEffect(() => {
    if (!current) return;
    try {
      const raw = localStorage.getItem(LS_LAST);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id: string; time: number };
      if (parsed?.id === current.id && Number.isFinite(parsed.time)) {
        setTime(parsed.time);
      }
    } catch {
      // ignore
    }
  }, [current?.id]);

  // ===== init audio listeners (chỉ chạy một lần) =====
  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    const onLoaded = () => {
      setDuration(el.duration || 0);

      // khi load xong metadata thì seek về vị trí cũ nếu có
      try {
        const lastRaw = localStorage.getItem(LS_LAST);
        if (lastRaw && current) {
          const last = JSON.parse(lastRaw) as { id: string; time: number };
          if (last?.id === current.id && Number.isFinite(last.time)) {
            const t = Math.max(0, Math.min(last.time, el.duration || last.time));
            el.currentTime = t;
            setTime(t);
          }
        }
      } catch {
        // ignore
      }
    };

    const onTime = () => {
      const t = el.currentTime || 0;
      setTime(t);

      const now = Date.now();
      if (!current || now - lastPersistRef.current < 1000) return;
      lastPersistRef.current = now;

      // lưu vị trí hiện tại
      try {
        localStorage.setItem(
          LS_LAST,
          JSON.stringify({ id: current.id, time: Math.floor(t) }),
        );
      } catch {
        // ignore
      }
    };

    const onEnded = () => {
      setTime(el.duration || 0);
      setPlaying(false);
      setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
    };

    const beforeUnload = () => {
      if (!current) return;
      try {
        localStorage.setItem(
          LS_LAST,
          JSON.stringify({ id: current.id, time: Math.floor(el.currentTime || 0) }),
        );
      } catch {
        // ignore
      }
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      el.pause();
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      window.removeEventListener("beforeunload", beforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // không phụ thuộc để tránh gắn listener nhiều lần

  // ===== queue/index thay đổi -> set src & persist queue/index =====
  useEffect(() => {
    try {
      localStorage.setItem(LS_QUEUE, JSON.stringify(queue));
      localStorage.setItem(LS_INDEX, String(index));
    } catch {
      // ignore
    }

    const el = audio.current;
    if (!el || !current) return;

    let src = current.audioUrl || "";
    if (src && !src.startsWith("http")) {
      // nếu chỉ là /music/xxx.mp3 thì thêm origin
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      src = origin + src;
    }

    console.log("[PLAYER] set src =", src, "from audioUrl =", current.audioUrl);

    el.src = src;
    el.load();
    el.volume = volume;
    setTime(0);
  }, [queue, index, current, volume]);

  // ===== khi đổi bài -> ghi lại lịch sử mp:recent =====
  useEffect(() => {
    if (!current) return;
    try {
      const raw = localStorage.getItem(LS_RECENT);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const newIds = [current.id, ...ids.filter((x) => x !== current.id)].slice(
        0,
        50,
      );
      localStorage.setItem(LS_RECENT, JSON.stringify(newIds));
    } catch {
      // ignore
    }
  }, [current?.id]);

  // ===== play / pause khi state playing đổi =====
  useEffect(() => {
    const el = audio.current;
    if (!el || !current) return;

    if (playing) {
      el
        .play()
        .then(() => {
          console.log("[PLAYER] playing", current.title);
        })
        .catch((err) => {
          console.error("AUDIO PLAY ERROR:", err);
          console.error("Current track:", current);
          console.error("Audio src now:", el.src);
          setPlaying(false);
        });
    } else {
      el.pause();
    }
  }, [playing, current]);

  // ===== persist playing flag =====
  useEffect(() => {
    try {
      localStorage.setItem(LS_PLAYING, playing ? "1" : "0");
    } catch {
      // ignore
    }
  }, [playing]);

  // ===== ACTIONS =====
  const toggle = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < queue.length ? i + 1 : i));
  }, [queue.length, setIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : 0));
  }, [setIndex]);

  const seek = useCallback(
    (pct: number) => {
      const el = audio.current;
      if (!el || !duration) return;
      const target = (pct / 100) * duration;
      el.currentTime = target;
      setTime(target);

      if (current) {
        try {
          localStorage.setItem(
            LS_LAST,
            JSON.stringify({ id: current.id, time: Math.floor(target) }),
          );
        } catch {
          // ignore
        }
      }
    },
    [duration, current],
  );

  const addToQueue = useCallback((t: Track) => {
    setQueue((q) => {
      if (q.some((x) => x.id === t.id)) return q;
      return [...q, t];
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIndex(0);
    setPlaying(false);
    setTime(0);
    try {
      localStorage.removeItem(LS_QUEUE);
      localStorage.removeItem(LS_INDEX);
      localStorage.removeItem(LS_LAST);
    } catch {
      // ignore
    }
  }, [setIndex]);

  const playNow = useCallback((t: Track) => {
    setQueue((q) => {
      const existingIndex = q.findIndex((x) => x.id === t.id);
      if (existingIndex !== -1) {
        setIndex(existingIndex);
        return q;
      }
      const newQueue = [...q, t];
      setIndex(newQueue.length - 1);
      return newQueue;
    });
    setPlaying(true);
  }, [setIndex]);

  // nhận event "add-track" từ ngoài (ví dụ TrackCard dispatch CustomEvent)
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Track>;
      if (!ce.detail) return;
      addToQueue(ce.detail);
    };
    window.addEventListener("add-track", handler as EventListener);
    return () =>
      window.removeEventListener("add-track", handler as EventListener);
  }, [addToQueue]);

  const value = useMemo<Ctx>(
    () => ({
      queue,
      setQueue,
      index,
      setIndex,
      current,
      playing,
      toggle,
      next,
      prev,
      time,
      duration,
      seek,
      volume,
      setVolume,
      addToQueue,
      clearQueue,
      playNow,
    }),
    [
      queue,
      index,
      current,
      playing,
      time,
      duration,
      volume,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      addToQueue,
      clearQueue,
      playNow,
      setIndex,
    ],
  );

  return (
    <PlayerCtx.Provider value={value}>
      {children}
      {/* audio element thực sự dùng để phát */}
      <audio ref={audio} className="hidden" />
    </PlayerCtx.Provider>
  );
}
