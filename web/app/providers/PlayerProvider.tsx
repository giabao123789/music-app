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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type Track = {
  id: string;
  title: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: string | null; // để PlayerBar có thể cache lời bài hát
  artist?: { name: string | null } | null;
  popularity?: number | null;
  genre?: string | null;
};

type Ctx = {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>; // PlayerBar cần dùng để cache lyrics
  index: number;
  setIndex: (i: number) => void;
  current?: Track;
  playing: boolean;
  toggle: () => void;
  playNow: (t: Track) => void;
  addToQueue: (t: Track) => void;
  clearQueue: () => void;
  next: () => void;
  prev: () => void;
  time: number;
  duration: number;
  seek: (pct: number) => void;
  volume: number;
  setVolume: (v: number) => void;
};

const PlayerCtx = createContext<Ctx | null>(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
};

// localStorage keys
const LS_QUEUE = "mp:queue";
const LS_INDEX = "mp:index";
const LS_VOL = "mp:vol";
const LS_PLAYING = "mp:playing";
const LS_LAST = "mp:last";
const LS_RECENT = "mp:recent";

function resolveMediaUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  // raw có thể là "/uploads/..." hoặc "uploads/..."
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const lastPersistRef = useRef<number>(0);

  // ===== Realtime lượt nghe: chỉ +1 khi nghe > 50% duration =====
  const currentRef = useRef<Track | undefined>(undefined);
  const queueRef = useRef<Track[]>([]);
  const countedRef = useRef<boolean>(false);
  const countedTrackIdRef = useRef<string | null>(null);

  const [queue, setQueue] = useState<Track[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]");
    } catch {
      return [];
    }
  });

  // ===== Gọi API tăng lượt nghe (popularity) =====
  const bumpPopularity = useCallback(
    (trackId: string) => {
      // fire-and-forget, không chặn UI
      fetch(`${API_BASE}/tracks/${trackId}/play`, {
        method: "POST",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          // nếu backend trả popularity number thì sync lại (tùy backend)
          if (!data || typeof data.popularity !== "number") return;

          // Cập nhật queue local để UI thấy số lượt nghe mới
          setQueue((prev) =>
            prev.map((t) =>
              t.id === trackId ? { ...t, popularity: data.popularity } : t,
            ),
          );
        })
        .catch(() => {
          // lỗi network thì bỏ qua, không ảnh hưởng player
        });
    },
    [setQueue],
  );

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

  // keep refs in sync for audio listeners (listener chỉ gắn 1 lần)
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

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

  // load lại vị trí nghe gần nhất cho bài hiện tại (nếu có)
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
        if (lastRaw && currentRef.current) {
          const last = JSON.parse(lastRaw) as { id: string; time: number };
          if (last?.id === currentRef.current.id && Number.isFinite(last.time)) {
            const t = Math.max(0, Math.min(last.time, el.duration || last.time));
            el.currentTime = t;
          }
        }
      } catch {
        // ignore
      }
    };

    const onTime = () => {
      const t = el.currentTime || 0;
      setTime(t);

      const live = currentRef.current;
      const now = Date.now();
      if (!live || now - lastPersistRef.current < 1000) return;
      lastPersistRef.current = now;

      // lưu vị trí hiện tại
      try {
        localStorage.setItem(
          LS_LAST,
          JSON.stringify({ id: live.id, time: Math.floor(el.currentTime || 0) }),
        );
      } catch {
        // ignore
      }

      // ===== +1 lượt nghe khi nghe > 50% duration (mỗi bài 1 lần) =====
      // reset đã được xử lý khi current đổi (ở effect current?.id)
      if (countedRef.current && countedTrackIdRef.current === live.id) return;

      const durFromAudio = Number.isFinite(el.duration) ? el.duration : NaN;
      const durFromTrack =
        typeof (live as any).duration === "number" && Number.isFinite((live as any).duration)
          ? (live as any).duration
          : 0;
      const dur =
        Number.isFinite(durFromAudio) && durFromAudio > 0 ? durFromAudio : durFromTrack;
      if (!dur || dur <= 0) return;

      if (t >= dur * 0.5) {
        countedRef.current = true;
        countedTrackIdRef.current = live.id;

        // Realtime UI: +1 ngay lập tức (null-safe)
        setQueue((prev) =>
          prev.map((x) =>
            x.id === live.id
              ? {
                  ...x,
                  popularity:
                    typeof (x as any).popularity === "number"
                      ? (x as any).popularity + 1
                      : 1,
                }
              : x,
          ),
        );

        // Sync backend (fire-and-forget)
        bumpPopularity(live.id);
      }
    };

    const onEnded = () => {
      setTime(el.duration || 0);
      setPlaying(false);
      setIndex((i) => (i + 1 < queueRef.current.length ? i + 1 : i));
    };

    const beforeUnload = () => {
      const live = currentRef.current;
      if (!live) return;
      try {
        localStorage.setItem(
          LS_LAST,
          JSON.stringify({ id: live.id, time: Math.floor(el.currentTime || 0) }),
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

    // reset "đã cộng lượt nghe" khi đổi bài
    if (countedTrackIdRef.current !== current.id) {
      countedRef.current = false;
      countedTrackIdRef.current = null;
    }

    const src = resolveMediaUrl(current.audioUrl);

    console.log(
      "[PLAYER] set src =",
      src,
      "from audioUrl =",
      current.audioUrl,
    );

    el.src = src;
    el.load();
    el.volume = volume;

    // set duration ngay nếu có
    setDuration(el.duration || 0);

    // nếu đang play -> play luôn
    if (playing) {
      el.play().catch((err) => {
        console.error("[PLAYER] play() failed", err);
        console.error("Audio src now:", el.src);
        setPlaying(false);
      });
    }

    // lưu recent ids
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
    try {
      localStorage.setItem(LS_PLAYING, playing ? "1" : "0");
    } catch {
      // ignore
    }
    const el = audio.current;
    if (!el) return;

    if (playing) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing]);

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
    },
    [duration],
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

  const playNow = useCallback(
    (t: Track) => {
      setQueue((q) => {
        const existingIndex = q.findIndex((x) => x.id === t.id);
        if (existingIndex !== -1) {
          // đã có trong queue thì chỉ nhảy tới bài đó
          setIndex(existingIndex);
          return q;
        }
        const newQueue = [...q, t];
        setIndex(newQueue.length - 1);
        return newQueue;
      });

      setPlaying(true);
    },
    [setIndex],
  );

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
