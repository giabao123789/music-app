// api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AdminGuard } from './admin.guard';

import { AdminUsersController } from './admin-users.controller';
import { AdminArtistsController } from './admin-artists.controller';
import { AdminTracksController } from './admin-tracks.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminAlbumsController } from './admin-albums.controller'; // ✅ ADD


@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    AdminUsersController,
    AdminArtistsController,
    AdminTracksController,
    AdminStatsController,
    AdminAlbumsController,
  ],
  providers: [JwtAuthGuard, RolesGuard, AdminGuard],
})
export class AdminModule {}
