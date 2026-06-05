// api/src/follows/follows.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Đảm bảo artist tồn tại */
  private async ensureArtistExists(artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
  }

  /** FOLLOW */
  async follow(userId: string, artistId: string) {
    await this.ensureArtistExists(artistId);

    // ✅ FIX: Tránh Prisma parse Follow.createdAt (đang bị dữ liệu string -> DateTime lỗi)
    // Chỉ select field cần để kiểm tra tồn tại
    const existing = await this.prisma.follow.findUnique({
      where: {
        userId_artistId: { userId, artistId },
      },
      select: {
        id: true,
        userId: true,
        artistId: true,
      },
    });

    // Nếu chưa follow thì chèn bản ghi bằng Mongo raw,
    // tránh dùng prisma.follow.create (đòi replica set transaction)
    if (!existing) {
      const id =
        'fol_' +
        Math.random().toString(36).substring(2, 8) +
        Date.now().toString(36);

      // collection name = tên model "Follow"
      await (this.prisma as any).$runCommandRaw({
        insert: 'Follow',
        documents: [
          {
            _id: id, // map vào field id (schema: id String @id @map("_id"))
            userId,
            artistId,
            createdAt: new Date(),
          },
        ],
      });
    }

    const followersCount = await this.prisma.follow.count({
      where: { artistId },
    });

    return {
      followersCount,
      isFollowing: true,
    };
  }

  /** UNFOLLOW */
  async unfollow(userId: string, artistId: string) {
    await this.ensureArtistExists(artistId);

    // Xoá bằng Mongo raw thay vì prisma.follow.deleteMany (tránh P2031)
    await (this.prisma as any).$runCommandRaw({
      delete: 'Follow',
      deletes: [
        {
          q: { userId, artistId },
          limit: 0, // 0 = xoá tất cả bản ghi match
        },
      ],
    });

    const followersCount = await this.prisma.follow.count({
      where: { artistId },
    });

    return {
      followersCount,
      isFollowing: false,
    };
  }

  /** Đếm followers – public */
  async getPublicFollowCount(artistId: string) {
    await this.ensureArtistExists(artistId);

    const followersCount = await this.prisma.follow.count({
      where: { artistId },
    });

    // Không cần userId vẫn dùng được – FE default isFollowing = false
    return {
      followersCount,
    };
  }

  /** LẤY DANH SÁCH NGHỆ SĨ USER ĐÃ FOLLOW */
  async getMyFollowingArtists(userId: string) {
    // ✅ Tránh Prisma phải parse Follow.createdAt (đang bị string -> DateTime lỗi)
    // ✅ Không dùng orderBy createdAt nữa để không đụng field bẩn
    const rows = await this.prisma.follow.findMany({
      where: { userId },
      select: {
        artistId: true,
        artist: {
          include: {
            _count: {
              select: {
                tracks: true,
                followers: true,
              },
            },
          },
        },
      },
    });

    // Trả về list artist cho FE dùng luôn (FE bạn đã hỗ trợ x.artist ?? x)
    return rows.map((r) => r.artist).filter(Boolean);
  }
  // api/src/follows/follows.service.ts
  /** ✅ FIX REFRESH: followersCount + isFollowing (need login) */
  async getFollowStatus(userId: string, artistId: string) {
    await this.ensureArtistExists(artistId);

    // ✅ select field an toàn, tránh parse createdAt bẩn
    const existing = await this.prisma.follow.findUnique({
      where: { userId_artistId: { userId, artistId } },
      select: { id: true },
    });

    const followersCount = await this.prisma.follow.count({
      where: { artistId },
    });

    return {
      followersCount,
      isFollowing: !!existing,
    };
  }

}
