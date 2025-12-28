// api/scripts/fix-artist-createdAt.ts
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
    const db = client.db(); // lấy DB từ connection string
    const artistCol = db.collection('Artist');

    console.log('🔍 Tìm các Artist có createdAt là string...');

    // Tìm document có field createdAt kiểu string
    const toFix = await artistCol
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

      await artistCol.updateOne(
        { _id: doc._id },
        {
          $set: { createdAt: newDate },
        },
      );

      console.log(
        `✅ Đã convert _id=${doc._id} từ "${old}" -> Date (${newDate.toISOString()})`,
      );
    }

    console.log('🎉 Hoàn tất fix createdAt cho Artist');
  } catch (err) {
    console.error('❌ Lỗi khi chạy script:', err);
  } finally {
    await client.close();
  }
}

main();
