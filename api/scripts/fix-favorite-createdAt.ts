// scripts/fix-favorite-createdAt.ts
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ Missing DATABASE_URL in .env');
    process.exit(1);
  }

  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db(); // dùng db trong connection string
    const favorites = db.collection('Favorite'); // tên collection theo model Favorite của Prisma

    console.log('🔍 Tìm các Favorite có createdAt là string...');

    const docs = await favorites
      .find({ createdAt: { $type: 'string' } })
      .toArray();

    console.log(`👉 Tìm được ${docs.length} document cần sửa`);

    for (const doc of docs) {
      const str = doc.createdAt as string;
      const d = new Date(str);

      if (isNaN(d.getTime())) {
        console.log(
          `⚠ Bỏ qua _id=${doc._id} vì createdAt không convert được:`,
          str,
        );
        continue;
      }

      await favorites.updateOne(
        { _id: doc._id },
        { $set: { createdAt: d } },
      );

      console.log(`✅ Đã convert _id=${doc._id} từ "${str}" -> Date`);
    }

    console.log('🎉 Hoàn tất fix createdAt cho Favorite');
  } catch (err) {
    console.error('❌ Lỗi khi chạy script:', err);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Script crashed:', err);
});
