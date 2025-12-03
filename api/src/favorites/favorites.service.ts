// api/src/favorites/favorites.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bật / tắt yêu thích một bài hát cho user
   */
  async toggle(userId: string | undefined, trackId: string) {
    if (!userId) {
      throw new BadRequestException('User id is required');
    }
    if (!trackId) {
      throw new BadRequestException('trackId is required');
    }

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: {
          userId_trackId: {
            userId,
            trackId,
          },
        },
      });

      return { liked: false };
    }

    await this.prisma.favorite.create({
      data: {
        userId,
        trackId,
      },
    });

    return { liked: true };
  }

  /**
   * Lấy danh sách bài hát yêu thích của user
   */
  async list(userId: string | undefined) {
    if (!userId) {
      throw new BadRequestException('User id is required');
    }

    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        track: {
          include: {
            artist: true,
          },
        },
      },
    });

    // Flatten ra cho frontend dùng luôn
    return favorites.map((fav) => {
      const t = fav.track;
      return {
        id: t.id,
        title: t.title,
        duration: t.duration,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        lyrics: t.lyrics,
        artist: t.artist ? { id: t.artist.id, name: t.artist.name } : null,
        favoriteAt: fav.createdAt,
      };
    });
  }
}
