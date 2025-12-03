// src/tracks/tracks.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly prisma: PrismaService,
  ) {}

  // Public: TẤT CẢ TRACK (USER nhìn thấy nhạc artist upload)
  @Get()
  findAll() {
    return this.tracksService.findAll();
  }

  // Top 50
  @Get('top')
  async getTopTracks() {
    const tracks = await this.prisma.track.findMany({
      orderBy: { popularity: 'desc' },
      take: 50,
      include: { artist: true, album: true },
    });

    return tracks.map((t) => ({
      id: t.id,
      title: t.title,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      duration: t.duration,
      lyrics: t.lyrics,
      artist: t.artist,
      album: t.album,
    }));
  }

  // Detail track
  @Get(':id')
  async getTrackDetail(@Param('id') id: string) {
    const t = await this.prisma.track.findUnique({
      where: { id },
      include: { artist: true, album: true },
    });

    if (!t) throw new NotFoundException('Track not found');

    return {
      id: t.id,
      title: t.title,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      duration: t.duration,
      lyrics: t.lyrics,
      artist: t.artist,
      album: t.album,
    };
  }
}
