// api/src/favorites/favorites.module.ts
import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  // 👇 Import AuthModule để trong context FavoritesModule có JwtService, JwtAuthGuard
  imports: [AuthModule],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    PrismaService,
    JwtAuthGuard, // dùng cho @UseGuards(JwtAuthGuard) trong controller
  ],
  exports: [FavoritesService],
})
export class FavoritesModule {}
