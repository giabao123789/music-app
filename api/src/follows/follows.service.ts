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

    // đã follow rồi thì trả trạng thái hiện tại
    const existing = await this.prisma.follow.findUnique({
      where: {
        userId_artistId: { userId, artistId },
      },
    });

    if (!existing) {
      await this.prisma.follow.create({
        data: {
          userId,
          artistId,
        },
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

    await this.prisma.follow
      .delete({
        where: {
          userId_artistId: { userId, artistId },
        },
      })
      .catch(() => null); // nếu chưa follow thì bỏ qua

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

    // Không cần userId vẫn dùng được – frontend sẽ default isFollowing = false
    return {
      followersCount,
    };
  }
}
