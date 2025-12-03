// api/src/favorites/favorites.module.ts
import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    // dùng config JWT từ AuthModule (nếu AuthModule export JwtModule)
    AuthModule,
    // phòng trường hợp AuthModule không export JwtModule
    JwtModule.register({}),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService, PrismaService],
})
export class FavoritesModule {}
