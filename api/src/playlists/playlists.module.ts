// api/src/playlists/playlists.module.ts
import { Module } from '@nestjs/common';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  // Không import module nào khác để tránh circular
  imports: [],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, PrismaService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
