// prisma/fetch-lyrics-lyricsovh.ts
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

// Gọi lyrics.ovh: https://api.lyrics.ovh/v1/artist/title
async function fetchFromLyricsOvh(title: string, artist: string) {
  if (!artist.trim()) {
    return null;
  }

  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(
    artist
  )}/${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // 404 = không tìm thấy lyrics
      return null;
    }

    const data: any = await res.json();
    const text = typeof data?.lyrics === "string" ? data.lyrics.trim() : "";

    if (text.length < 20) {
      return null;
    }

    return text;
  } catch (err) {
    console.warn("Lỗi gọi lyrics.ovh:", err);
    return null;
  }
}

async function main() {
  console.log("🔍 Đang lấy danh sách track chưa có lyrics...");

  const tracks = await prisma.track.findMany({
    where: {
      OR: [{ lyrics: null }, { lyrics: "" }],
    },
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`🎵 Tổng số bài cần thử lấy lyrics: ${tracks.length}`);

  let updated = 0;

  for (const track of tracks) {
    const title = track.title;
    const artistName = track.artist?.name ?? "";

    console.log(`\n🎶 Đang xử lý: "${title}" – ${artistName}`);

    const lyrics = await fetchFromLyricsOvh(title, artistName);

    if (!lyrics) {
      console.log("   ❌ lyrics.ovh không có dữ liệu cho bài này");
      continue;
    }

    await prisma.track.update({
      where: { id: track.id },
      data: { lyrics },
    });

    updated++;
    console.log("   ✅ Đã lưu lyrics vào DB");

    // Nghỉ 300ms tránh spam API
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `\n✨ Hoàn tất. Đã điền lyrics cho ${updated}/${tracks.length} track bằng lyrics.ovh`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
