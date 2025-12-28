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
      // Follow: giả định model Follow có artistId
      this.prisma.follow.count({ where: { artistId } }).catch(() => 0),

      // Total listens: sum popularity của Track theo artistId
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

  @Get()
  async findAll() {
    // giữ select cũ + bổ sung stats
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
            popularity: true, // ✅ thêm để admin xem nếu cần
          },
        },
      },
    });

    // ✅ add followersCount + totalListens
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
            popularity: true, // ✅
          },
        },
      },
    });

    if (!artist) throw new NotFoundException('Artist not found');

    const stats = await this.computeArtistStats(id);
    return { ...artist, ...stats };
  }

  // ✅ NEW: danh sách followers của 1 artist
  // GET /admin/artists/:id/followers
  @Get(':id/followers')
  async listFollowers(@Param('id') id: string) {
    // check artist tồn tại (để UI khỏi hiểu nhầm)
    const exists = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Artist not found');

    // Follow: giả định Follow có userId + artistId và relation user
    const rows = await this.prisma.follow.findMany({
      where: { artistId: id },
      orderBy: { createdAt: 'desc' as any }, // nếu schema Follow có createdAt thì đúng; không có cũng không sao (catch)
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
    }).catch(async () => {
      // fallback nếu Follow không có createdAt/orderBy khác
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

    // normalize output cho frontend dễ dùng
    return rows
      .map((r: any) => r.user)
      .filter(Boolean);
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
    return this.prisma.artist.update({
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
  }

  @Delete(':id')
  async deleteArtist(@Param('id') id: string) {
    // giữ y như bạn đang dùng deleteMany để tránh transaction
    const result = await this.prisma.artist.deleteMany({
      where: { id },
    });

    return {
      ok: true,
      deleted: result.count,
    };
  }
}
