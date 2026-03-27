// prisma/fetch-lyrics-online.ts
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// API miễn phí — có thể thay đổi
const BASE_LYRICS_API = 'https://api.lyrics.ovh/v1';

// Delay để tránh rate limit
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLyricsFromApi(title: string, artistName: string) {
  if (!artistName) return null;

  try {
    const url = `${BASE_LYRICS_API}/${encodeURIComponent(artistName)}/${encodeURIComponent(title)}`;
    console.log('   🌐 Gọi API:', url);

    const res = await axios.get(url, { timeout: 8000 });
    const data = res.data as { lyrics?: string };

    if (!data.lyrics || !data.lyrics.trim()) {
      console.log('   ❌ API không có lyrics');
      return null;
    }

    return data.lyrics.trim();
  } catch (err: any) {
    console.log('   ❌ Lỗi API:', err?.response?.status || err?.code || err?.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Đang lấy danh sách toàn bộ Track...');

  const tracks = await prisma.track.findMany({
    include: { artist: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`🎧 Tổng số track: ${tracks.length}
`);

  for (const track of tracks) {
    console.log('========================================');
    console.log(`🎵 ${track.title} – ${track.artist?.name || 'Unknown'}`);

    if (track.lyrics && track.lyrics.trim()) {
      console.log('   💡 Bỏ qua vì đã có lyrics');
      continue;
    }

    const artist = track.artist?.name || '';
    if (!artist) {
      console.log('   ⚠️ Bỏ qua vì thiếu tên nghệ sĩ');
      continue;
    }

    const lyrics = await fetchLyricsFromApi(track.title, artist);
    if (!lyrics) {
      console.log('   ⚠️ Chưa tìm được lyrics');
      continue;
    }

    await prisma.track.update({
      where: { id: track.id },
      data: { lyrics },
    });

    console.log('   ✅ Cập nhật lyrics thành công');

    await delay(1000);
  }
}

main()
  .catch((err) => {
    console.error('Lỗi khi chạy script fetch-lyrics-online:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
