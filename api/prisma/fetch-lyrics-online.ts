// prisma/fetch-lyrics-online.ts
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// API miễn phí — có thể thay đổi
const BASE_LYRICS_API = "https://api.lyrics.ovh/v1";

// Delay để tránh rate limit
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Lấy lyrics từ API
async function fetchLyricsFromApi(title: string, artistName: string) {
  if (!artistName) return null;

  try {
    const url = `${BASE_LYRICS_API}/${encodeURIComponent(
      artistName,
    )}/${encodeURIComponent(title)}`;

    console.log("   🌐 Gọi API:", url);

    const res = await axios.get(url, { timeout: 8000 });

    const data = res.data as { lyrics?: string };

    if (!data.lyrics || !data.lyrics.trim()) {
      console.log("   ❌ API không có lyrics");
      return null;
    }

    return data.lyrics.trim();
  } catch (err: any) {
    console.log(
      "   ❌ Lỗi API:",
      err?.response?.status || err?.code || err?.message,
    );
    return null;
  }
}

async function main() {
  console.log("🔍 Đang lấy danh sách toàn bộ Track...");

  const tracks = await prisma.track.findMany({
    include: { artist: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`🎧 Tổng số track: ${tracks.length}\n`);

  for (const track of tracks) {
    console.log("========================================");
    console.log(`🎵 ${track.title} – ${track.artist?.name || "Unknown"}`);

    // Nếu bạn KHÔNG muốn overwrite lyrics cũ → bỏ qua bài đã có lyrics
    // if (track.lyrics) {
    //   console.log("   ➜ Bài này đã có lyri
