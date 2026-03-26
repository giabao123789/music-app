// api/src/admin/admin-artists.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/artists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminArtistsController {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ helpers: followersCount + totalListens (sum Track.popularity)
  private async computeArtistStats(artistId: string) {
    const [followersCount, agg] = await Promise.all([
      this.prisma.follow.count({ where: { artistId } }).catch(() => 0),
      this.prisma.track
        .aggregate({
          where: { artistId },
          _sum: { popularity: true },
        })
        .catch(() => ({ _sum: { popularity: 0 } as any })),
    ]);

    const totalListens = Number(agg?._sum?.popularity ?? 0) || 0;
    return { followersCount, totalListens };
  }

  // ===== NEW: Notification helpers =====
  private async createNotification(params: {
    artistId: string;
    type: 'ARTIST_PROFILE_UPDATED';
    title: string;
    message: string;
    entity?: { type: 'Artist'; id: string };
    payload?: any;
  }) {
    const doc = {
      _id: `noti_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      artistId: params.artistId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity: params.entity ?? null,
      payload: params.payload ?? null,
      createdAt: new Date(),
      readAt: null,
    };

    try {
      await (this.prisma as any).$runCommandRaw({
        insert: 'Notification',
        documents: [doc],
      });
    } catch {
      // ignore
    }
  }

  @Get()
  async findAll() {
    const artists = await this.prisma.artist.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
        mainGenre: true,
        bio: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
          },
        },
        tracks: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            createdAt: true,
            popularity: true,
          },
        },
      },
    });

    const withStats = await Promise.all(
      artists.map(async (a) => {
        const stats = await this.computeArtistStats(a.id);
        return { ...a, ...stats };
      }),
    );

    return withStats;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
        mainGenre: true,
        bio: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
          },
        },
        tracks: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            createdAt: true,
            popularity: true,
          },
        },
      },
    });

    if (!artist) throw new NotFoundException('Artist not found');

    const stats = await this.computeArtistStats(id);
    return { ...artist, ...stats };
  }

  // ✅ NEW: danh sách followers của 1 artist
  @Get(':id/followers')
  async listFollowers(@Param('id') id: string) {
    const exists = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Artist not found');

    const rows = await this.prisma.follow
      .findMany({
        where: { artistId: id },
        orderBy: { createdAt: 'desc' as any },
        select: {
          id: true,
          createdAt: true as any,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              verified: true,
              createdAt: true as any,
            },
          },
        },
      })
      .catch(async () => {
        return this.prisma.follow.findMany({
          where: { artistId: id },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                verified: true,
                createdAt: true as any,
              },
            },
          },
        }) as any;
      });

    return rows.map((r: any) => r.user).filter(Boolean);
  }

  @Patch(':id')
  async updateArtist(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      avatar?: string;
      userId?: string | null;
      mainGenre?: string | null;
      bio?: string | null;
    },
  ) {
    const before = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true, avatar: true, mainGenre: true, bio: true, userId: true },
    });
    if (!before) throw new NotFoundException('Artist not found');

    const updated = await this.prisma.artist.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.avatar !== undefined && { avatar: body.avatar }),
        ...(body.userId !== undefined && { userId: body.userId }),
        ...(body.mainGenre !== undefined && { mainGenre: body.mainGenre }),
        ...(body.bio !== undefined && { bio: body.bio }),
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
        mainGenre: true,
        bio: true,
      },
    });

    // ===== NEW: notification cho chính artist đó =====
    const changed: string[] = [];
    const safe = (v: any) => (v === undefined ? '(không có)' : v === null ? 'null' : String(v));

    if (body.name !== undefined && safe(before.name) !== safe(updated.name)) {
      changed.push(`Tên nghệ sĩ: "${safe(before.name)}" → "${safe(updated.name)}"`);
    }
    if (body.avatar !== undefined && safe(before.avatar) !== safe(updated.avatar)) {
      changed.push(`Avatar: ${safe(before.avatar)} → ${safe(updated.avatar)}`);
    }
    if (body.mainGenre !== undefined && safe(before.mainGenre) !== safe(updated.mainGenre)) {
      changed.push(`MainGenre: ${safe(before.mainGenre)} → ${safe(updated.mainGenre)}`);
    }
    if (body.bio !== undefined && safe(before.bio) !== safe(updated.bio)) {
      changed.push(`Bio: ${safe(before.bio)} → ${safe(updated.bio)}`);
    }

    const msg = changed.length
      ? `Admin đã cập nhật hồ sơ nghệ sĩ:\n- ${changed.join('\n- ')}`
      : 'Admin đã cập nhật hồ sơ nghệ sĩ.';

    await this.createNotification({
      artistId: id,
      type: 'ARTIST_PROFILE_UPDATED',
      title: 'Admin đã cập nhật hồ sơ của bạn',
      message: msg,
      entity: { type: 'Artist', id },
      payload: { artistId: id },
    });

    return updated;
  }

  @Delete(':id')
  async deleteArtist(@Param('id') id: string) {
    const result = await this.prisma.artist.deleteMany({
      where: { id },
    });

    return { ok: true, deleted: result.count };
  }
}
