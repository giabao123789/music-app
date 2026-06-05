// api/src/favorites/favorites.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MongoClient, Db, Collection } from 'mongodb';

type FavoriteDoc = {
  _id?: any;
  id?: string;           // không dùng với Mongo driver, nhưng lỡ có cũng k sao
  userId: string;
  trackId: string;
  createdAt: Date;
};

@Injectable()
export class FavoritesService {
  private mongoClient: MongoClient;
  private dbPromise: Promise<Db>;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }

    // Kết nối Mongo thuần để tránh lỗi transaction của Prisma
    this.mongoClient = new MongoClient(url);

    this.dbPromise = this.mongoClient.connect().then((client) => {
      // Lấy tên DB từ URL (mongodb://.../dbname?...)
      const match = url.match(/\/([^/?]+)(\?|$)/);
      const dbName = match ? match[1] : 'test';
      return client.db(dbName);
    });
  }

  private async getCollection(): Promise<Collection<FavoriteDoc>> {
    const db = await this.dbPromise;
    // Tên collection Prisma dùng mặc định = tên model
    return db.collection<FavoriteDoc>('Favorite');
  }

  /**
   * Toggle yêu thích 1 bài hát
   * - Nếu chưa like -> insert document
   * - Nếu đã like -> delete document
   * Toàn bộ phần này dùng Mongo driver, KHÔNG đi qua Prisma => không còn lỗi replica set.
   */
  async toggle(userId: string, trackId: string) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }
    if (!trackId) {
      throw new BadRequestException('trackId is required');
    }

    // Đảm bảo track tồn tại (dùng Prisma – chỉ là READ, không bị vấn đề transaction)
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true },
    });

    if (!track) {
      throw new BadRequestException('Track not found');
    }

    const col = await this.getCollection();

    // Kiểm tra đã like chưa
    const existing = await col.findOne({ userId, trackId });

    if (existing) {
      // Đã có -> xoá
      await col.deleteOne({ _id: existing._id });
      return { liked: false };
    }

    // Chưa có -> tạo mới (1 insert đơn thuần, không liên quan Prisma)
    await col.insertOne({
      userId,
      trackId,
      createdAt: new Date(),
    });

    return { liked: true };
  }

  /**
   * Lấy danh sách bài hát yêu thích của user
   * - Đọc từ Mongo driver
   * - Sau đó dùng Prisma để lấy thông tin Track + Artist
   */
  async list(userId: string) {
    if (!userId) {
      throw new BadRequestException('Missing userId');
    }

    const col = await this.getCollection();

    const favorites = await col
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    if (!favorites.length) {
      return [];
    }

    const trackIds = favorites.map((f) => f.trackId);

    // Lấy thông tin track qua Prisma (READ)
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds } },
      include: { artist: true },
    });

    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    // Map về dạng FE đang dùng
    return favorites
      .map((fav) => {
        const t = trackMap.get(fav.trackId);
        if (!t) return null;

        return {
          id: t.id,
          title: t.title,
          duration: t.duration,
          audioUrl: t.audioUrl,
          coverUrl: t.coverUrl,
          genre: t.genre,
          artist: t.artist ? { id: t.artist.id, name: t.artist.name } : null,
          favoritedAt: fav.createdAt,
        };
      })
      .filter(Boolean);
  }
}
