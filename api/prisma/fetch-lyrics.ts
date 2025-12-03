// prisma/fetch-lyrics.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

const API_URL = process.env.LYRICS_API_URL;
const API_KEY = process.env.LYRICS_API_KEY;

// Hàm gọi API lyrics do bạn cấu hình
async function fetchLyricsFromApi(title: string, artist?: string | null) {
  if (!API_URL) {
    console.warn("⚠ Chưa cấu hình LYRICS_API_URL trong .env");
    return null;
  }

  try {
    const url = new URL(API_URL);
    url.searchParams.set("title", title);
    if (artist) url.searchParams.set("artist", artist);

    const headers: Record<string, string> = {};
    if (API_KEY) {
      // Tuỳ dịch vụ bạn sửa header này cho đúng (Bearer / X-API-Key / v.v.)
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      console.warn(
        `⚠ API lỗi (${res.status}) cho: "${title}" - "${artist ?? ""}"`
      );
      return null;
    }

    const data: any = await res.json();

    // Tuỳ API bạn sửa key này cho đúng, mặc định là data.lyrics
    const text: unknown = data.lyrics;

    if (typeof text !== "string") {
      console.warn("⚠ API không trả về lyrics dạng string");
      return null;
    }

    const cleaned = text.trim();
    if (cleaned.length < 20) {
      console.warn("⚠ Lyrics quá ngắn, bỏ qua");
      return null;
    }

    return cleaned;
  } catch (err) {
    console.error("❌ Lỗi gọi API lyrics:", err);
    return null;
  }
}

async function main() {
  console.log("🔍 Đang tìm các track chưa có lyrics...");

  const tracks = await prisma.track.findMany({
    where: {
      OR: [{ lyrics: null }, { lyrics: "" }],
    },
    include: {
      artist: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`🎵 Số track cần điền lyrics: ${tracks.length}`);
  if (tracks.length === 0) {
    return;
  }

  let updatedCount = 0;

  for (const track of tracks) {
    const artistName = track.artist?.name ?? undefined;

    console.log(
      `\n🎶 Đang xử lý: "${track.title}" - "${artistName ?? "Unknown"}"`
    );

    const lyrics = await fetchLyricsFromApi(track.title, artistName);

    if (!lyrics) {
      console.log("⏭ Không lấy được lyrics, bỏ qua.");
      continue;
    }

    await prisma.track.update({
      where: { id: track.id },
      data: { lyrics },
    });

    updatedCount++;
    console.log("✅ Đã lưu lyrics vào DB.");

    // Nghỉ 500ms tránh bị API rate limit (có thể chỉnh nhỏ/lớn hơn)
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(
    `\n✨ Hoàn tất. Đã cập nhật lyrics cho ${updatedCount}/${tracks.length} track.`
  );
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
