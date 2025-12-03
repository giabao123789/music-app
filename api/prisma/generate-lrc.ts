// prisma/generate-lrc.ts
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// format mm:ss.xx
function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  const cs = Math.floor((sec % 1) * 100)
    .toString()
    .padStart(2, "0");
  return `[${m}:${s}.${cs}]`;
}

async function main() {
  console.log("🔍 Đang tải danh sách tracks từ Prisma...");

  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`🎵 Tổng số bài hát: ${tracks.length}`);
  console.log("");

  const lyricsDir = path.join(__dirname, "../../web/public/lyrics");

  // tạo thư mục nếu chưa có
  if (!fs.existsSync(lyricsDir)) {
    fs.mkdirSync(lyricsDir, { recursive: true });
  }

  for (const track of tracks) {
    console.log("--------------------------------------------------");
    console.log(`🎶 ${track.title}`);

    if (!track.lyrics || !track.lyrics.trim()) {
      console.log("⚠ Bỏ qua: không có lyrics trong DB");
      continue;
    }

    if (!track.audioUrl) {
      console.log("⚠ Bỏ qua: không có audioUrl (không biết tên file)");
      continue;
    }

    // audioUrl dạng: /music/<file>.mp3
    const base = path.basename(track.audioUrl).replace(/\.mp3$/i, "");
    const lrcPath = path.join(lyricsDir, `${base}.lrc`);

    const lines = track.lyrics
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      console.log("⚠ Bỏ qua: lyrics rỗng");
      continue;
    }

    const total = track.duration || 0;
    if (total <= 0) {
      console.log("⚠ Bỏ qua: duration không hợp lệ");
      continue;
    }

    // thời gian mỗi dòng
    const step = total / lines.length;

    const lrcContent: string[] = [];

    lines.forEach((line, index) => {
      const t = step * index;
      lrcContent.push(`${formatTime(t)}${line}`);
    });

    fs.writeFileSync(lrcPath, lrcContent.join("\n"), "utf8");

    console.log(`✅ Tạo file LRC: ${base}.lrc`);
  }

  console.log("\n✨ Xong! Tất cả LRC đã được tạo trong web/public/lyrics/");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
