// api/scripts/fix-track-createdAt.ts
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL không được cấu hình trong .env');
    process.exit(1);
  }

  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db(); // tên DB lấy từ connection string
    const trackCol = db.collection('Track'); // 👈 đúng tên model Prisma: Track

    console.log('🔍 Tìm các Track có createdAt là string...');

    const toFix = await trackCol
      .find({
        createdAt: { $type: 'string' },
      })
      .toArray();

    console.log(`👉 Tìm được ${toFix.length} document cần sửa`);

    for (const doc of toFix) {
      const old = doc.createdAt;
      let newDate: Date | null = null;

      if (typeof old === 'string') {
        const d = new Date(old);
        if (!isNaN(d.getTime())) {
          newDate = d;
        }
      }

      if (!newDate) {
        console.log(
          `⚠ Bỏ qua _id=${doc._id} vì không convert được createdAt="${old}"`,
        );
        continue;
      }

      await trackCol.updateOne(
        { _id: doc._id },
        { $set: { createdAt: newDate } },
      );

      console.log(
        `✅ Đã convert _id=${doc._id} từ "${old}" -> Date (${newDate.toISOString()})`,
      );
    }

    console.log('🎉 Hoàn tất fix createdAt cho Track');
  } catch (err) {
    console.error('❌ Lỗi khi chạy script:', err);
  } finally {
    await client.close();
  }
}

main();
