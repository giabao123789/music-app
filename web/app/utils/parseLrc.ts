// web/app/utils/parseLrc.ts

export type LrcLine = {
  time: number; // giây
  text: string;
};

const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?]/g;

/**
 * Parse nội dung .lrc thành list { time, text }
 */
export function parseLrc(lrc: string): LrcLine[] {
  const lines = lrc.split(/\r?\n/);
  const result: LrcLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let match: RegExpExecArray | null;
    const times: number[] = [];
    timeTagRegex.lastIndex = 0;

    // lấy hết time tag trong dòng
    while ((match = timeTagRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const cent = match[3] ? parseInt(match[3], 10) : 0;
      const t = min * 60 + sec + cent / 100;
      times.push(t);
    }

    // text là phần phía sau time tag cuối
    const text = line.replace(timeTagRegex, "").trim();
    if (!text || times.length === 0) continue;

    for (const t of times) {
      result.push({ time: t, text });
    }
  }

  // sort theo thời gian
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Từ currentTime, tìm index dòng đang active
 */
export function getActiveLrcIndex(
  lrcLines: LrcLine[],
  currentTime: number,
): number {
  if (lrcLines.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < lrcLines.length; i++) {
    if (currentTime + 0.05 >= lrcLines[i].time) idx = i;
    else break;
  }
  return idx;
}
