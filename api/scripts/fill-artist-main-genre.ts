// api/scripts/fill-artist-main-genre.ts

import 'dotenv/config';
import { MongoClient } from 'mongodb';

// Lấy URI từ DATABASE_URL của Prisma
const uri =
  process.env.DATABASE_URL ||
  'mongodb://127.0.0.1:27017/music-app'; // fallback nếu thiếu

// Danh sách thể loại hợp lệ (giống enum Genre trong Prisma)
const GENRES = ['POP', 'BALLAD', 'RAP', 'INDIE', 'RNB', 'EDM', ] as const;
type Genre = (typeof GENRES)[number];

function pickRandomGenre(): Genre {
  const idx = Math.floor(Math.random() * GENRES.length);
  return GENRES[idx];
}

async function main() {
  console.log('🔌 Kết nối MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();

  // Lấy DB từ connection string (nếu không có thì dùng 'music-app')
  const url = new URL(uri);
  const dbName = url.pathname?.replace('/', '') || 'music-app';

  const db = client.db(dbName);
  // Prisma với Mongo đặt tên collection theo model => "Artist"
  const artistsCol = db.collection('Artist');

  console.log('🔍 Tìm artist có mainGenre = null hoặc "" ...');

  const cursor = artistsCol.find({
    $or: [{ mainGenre: null }, { mainGenre: '' }],
  });

  let count = 0;

  for await (const artist of cursor) {
    const genre = pickRandomGenre();

    await artistsCol.updateOne(
      { _id: artist._id },
      { $set: { mainGenre: genre } }
    );

    count++;
    if (count % 50 === 0) {
      console.log(`✅ Đã cập nhật ${count} artist...`);
    }
  }

  console.log(`🎉 Hoàn tất. Đã cập nhật ${count} artist.`);

  await client.close();
}

main().catch((err) => {
  console.error('❌ Lỗi khi chạy script fill-artist-main-genre:', err);
  process.exit(1);
});
