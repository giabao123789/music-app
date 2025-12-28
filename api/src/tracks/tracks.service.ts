// api/src/tracks/tracks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public list tracks cho homepage, search...
   *  - Ẩn các bài đã bị khoá (deletedAt != null) nhưng filter ở ngoài code
   *    để không phụ thuộc schema Prisma (tránh lỗi Unknown argument deletedAt)
   *  - Hỗ trợ search theo q, genre, artistId, limit
   */
  async findAllPublic(params?: {
    q?: string;
    genre?: string;
    artistId?: string;
    limit?: number;
  }) {
    const { q, genre, artistId, limit } = params || {};

    const tracks = await this.prisma.track.findMany({
      where: {
        // KHÔNG dùng deletedAt trong where nữa
        ...(q
          ? {
              title: {
                contains: q,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(genre ? { genre } : {}),
        ...(artistId ? { artistId } : {}),
      },
      orderBy: [
        // Ưu tiên bài phổ biến, sau đó mới tới mới nhất
        { popularity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit && limit > 0 ? limit : undefined,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            avatar: true,
            mainGenre: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
      },
    });

    // Ẩn các bài đã bị khoá (nếu có field deletedAt thì check, không có thì vẫn ok)
    return tracks.filter((t: any) => !t.deletedAt);
  }

  /**
   * Top tracks dùng cho /tracks/top
   */
  async findTopPublic(limit = 20) {
    const tracks = await this.prisma.track.findMany({
      // KHÔNG filter deletedAt trong where để không lỗi Prisma
      orderBy: {
        popularity: 'desc',
      },
      take: limit,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            avatar: true,
            mainGenre: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
      },
    });

    // Chỉ trả những bài chưa khoá
    return tracks.filter((t: any) => !t.deletedAt);
  }

  /**
   * Chi tiết 1 bài hát cho trang /tracks/:id
   * - Nếu bài đã khoá (deletedAt != null) -> 404
   */
  async findOnePublic(id: string) {
    const track = await this.prisma.track.findUnique({
      where: { id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            avatar: true,
            mainGenre: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
      },
    });

    // Nếu schema không có deletedAt thì t.deletedAt sẽ là undefined => coi như chưa khoá
    if (!track || (track as any).deletedAt) {
      throw new NotFoundException('Track not found');
    }

    return track;
  }

  /**
   * +1 lượt nghe (popularity) mỗi lần play.
   * Không throw nếu track bị xoá/mất, để tránh crash player.
   */
  async incrementPlay(id: string) {
    try {
      await this.prisma.track.update({
        where: { id },
        data: {
          popularity: {
            increment: 1,
          },
        },
      });
    } catch {
      // nếu id không tồn tại thì bỏ qua
    }
  }
}
