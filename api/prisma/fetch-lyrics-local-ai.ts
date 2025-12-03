// prisma/fetch-lyrics-local-ai.ts
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

// 3 nguồn lyrics free (không cần API key)
const SOURCES = [
  (title: string, artist: string) =>
    `https://lyricsovh.ncthuongthanh.workers.dev/?title=${encodeURIComponent(
      title
    )}&artist=${encodeURIComponent(artist)}`,

  (title: string, artist: string) =>
    `https://lyrist.vercel.app/api/${encodeURIComponent(
      title
    )}/${encodeURIComponent(artist)}`,

  (title: string, artist: string) =>
    `https://some-random-api-netease.vercel.app/lyrics?title=${encodeURIComponent(
      title
    )}&artist=${encodeURIComponent(artist)}`,
];

async function getLyrics(title: string, artist: string) {
  for (const buildUrl of SOURCES) {
    const url = buildUrl(title, artist);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();

      const text =
        data?.lyrics ||
        data?.lyric ||
        data?.lrc ||
        data?.result?.lyrics ||
        data?.result?.lyric ||
        null;

      if (typeof text === "string" && text.trim().length > 20) {
        console.log("   ✔ Lấy lyrics thành công từ:", url);
        return text.trim();
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

async function main() {
  console.log("🔍 Đang lấy danh sách track chưa có lyrics...");

  const tracks = await prisma.track.findMany({
    where: {
      OR: [{ lyrics: null }, { lyrics: "" }],
    },
    include: { artist: true },
  });

  console.log(`🎵 Tổng số bài cần điền lyrics: ${tracks.length}`);

  for (const track of tracks) {
    const title = track.title;
    const artist = track.artist?.name || "";

    console.log(`\n🎶 Đang xử lý: "${title}" – ${artist}`);

    const lyrics = await getLyrics(title, artist);

    if (!lyrics) {
      console.log("   ❌ Không lấy được lyrics ở cả 3 nguồn");
      continue;
    }

    await prisma.track.update({
      where: { id: track.id },
      data: { lyrics },
    });

    console.log("   📌 Đã lưu lyrics.");
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\n✨ Hoàn tất fill lyrics!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
