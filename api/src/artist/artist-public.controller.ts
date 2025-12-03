// api/src/artist/artist-public.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('artists') // công khai, không cần JWT
export class ArtistPublicController {
  constructor(private prisma: PrismaService) {}

  // GET /artists  -> list nghệ sĩ (dùng cho page danh sách)
  @Get()
  async listArtists() {
    const artists = await this.prisma.artist.findMany({
      include: {
        _count: { select: { tracks: true } },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return artists.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      displayName: a.user?.name ?? null,
      tracksCount: a._count.tracks,
    }));
  }

  // GET /artists/:id -> trang công khai 1 nghệ sĩ
  @Get(':id')
  async getArtist(@Param('id') id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        tracks: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            duration: true,
            coverUrl: true,
            audioUrl: true,
            createdAt: true,
            description: true,
          },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    const totalTracks = artist.tracks.length;
    const totalDuration = artist.tracks.reduce(
      (sum, t) => sum + t.duration,
      0,
    );

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        avatar: artist.avatar,
      },
      user: {
        displayName: artist.user?.name ?? null,
      },
      stats: {
        totalTracks,
        totalDuration,
      },
      tracks: artist.tracks,
    };
  }
}
