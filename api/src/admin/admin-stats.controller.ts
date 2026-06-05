// api/src/admin/admin-stats.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStats() {
    const [users, artists, tracks, albums, follows, favorites, listensAgg] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.artist.count(),
        this.prisma.track.count(),
        this.prisma.album.count(),
        this.prisma.follow.count(),
        this.prisma.favorite.count(),
        this.prisma.track.aggregate({
          _sum: {
            popularity: true, // tổng lượt nghe
          },
        }),
      ]);

    const listens = listensAgg._sum.popularity ?? 0;

    return {
      totals: {
        users,
        artists,
        tracks,
        albums,
        follows,
        favorites,
        listens,
      },
    };
  }
}
