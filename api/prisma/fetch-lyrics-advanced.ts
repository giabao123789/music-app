// prisma/fetch-lyrics-advanced.ts
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// API chính (do bạn cấu hình)
const CUSTOM_LYRICS_API = process.env.LYRICS_API_URL;
const CUSTOM_LYRICS_KEY = process.env.LYRICS_API_KEY;

// Fallback API miễn phí
const FALLBACK_LYRICS_API = "https://api.lyrics.ovh/v1";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Gọi API “xịn” do bạn cấu hình (RapidAPI / service riêng)
async function fetchFromCustomApi(title: string, artist: string) {
  if (!CUSTOM_LYRICS_API) return null;

  try {
    console.log("   🌐 [CUSTOM] Gọi API lyrics xịn");

    const res = await axios.get(CUSTOM_LYRICS_API, {
      params: {
        title,
        artist,
      },
      headers: CUSTOM_LYRICS_KEY
        ? { "x-api-key": CUSTOM_LYRICS_KEY }
        : undefined,
      timeout: 8000,
    });

    // Tùy API mà map lại cho đúng
    const data = res.data as { lyrics?: string };

    if (!data.lyrics || !data.lyrics.trim()) return null;
    return data.lyrics.trim();
  } catch (e: any) {
    console.log(
      "   ❌ [CUSTOM] Lỗi API:",
      e?.response?.status || e?.code || e?.message,
    );
    return null;
  }
}

// Fallback: lyrics.ovh
async function fetchFromOvh(title: string, artist: string) {
  if (!artist) return null;

  try {
    const url = `${FALLBACK_LYRICS_API}/${encodeURIComponent(
      artist,
    )}/${encodeURIComponent(title)}`;
    console.log("   🌐 [OVH] Gọi:", url);

    const res = await axios.get(url, { timeout: 8000 });
    const data = res.data as { lyrics?: string };
    if (!data.lyrics || !data.lyrics.trim()) return null;
    return data.lyrics.trim();
  } catch (e: any) {
    console.log(
      "   ❌ [OVH] Lỗi:",
      e?.response?.status || e?.code || e?.message,
    );
    return null;
  }
}

// Hàm tổng: thử custom → fallback ovh
async function fetchLyrics(title: string, artist: string) {
  // Thử custom trước
  const custom = await fetchFromCustomApi(title, artist);
  if (custom) return custom;

  // Fallback
  return fetchFromOvh(title, artist);
}

async function main() {
  console.log("🔍 Lấy toàn bộ tracks để chèn lyrics...");

  const tracks = await prisma.track.findMany({
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`🎧 Tổng số track: ${tracks.length}\n`);

  for (const track of tracks) {
    console.log("========================================");
    console.log(`🎵 ${track.title} – ${track.artist?.name || "Unknown"}`);

    // Nếu muốn giữ lyrics cũ, bỏ comment đoạn này
    // if (track.lyrics) {
    //   console.log("   ➜ Đã có lyrics, bỏ qua");
    //   continue;
    // }

    const artistName = track.artist?.name ?? "";
    const lyrics = await fetchLyrics(track.title, artistName);

    if (!lyrics) {
      console.log("   ➜ Không tìm được lyrics");
      continue;
    }

    await prisma.track.update({
      where: { id: track.id },
      data: { lyrics },
    });

    console.log("   ✅ Đã lưu lyrics cho:", track.id);
    await delay(500); // tránh bị rate-limit
  }

  console.log("\n✨ Hoàn tất fetch lyrics cho toàn bộ tracks!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
