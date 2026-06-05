// api/src/artist/artist-me.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Patch,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

class CreateTrackDto {
  title: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // giây
  lyrics?: string;
}

class UpdateTrackDto {
  title?: string;
  coverUrl?: string;
  audioUrl?: string;
  duration?: number;
  lyrics?: string | null;
}

class UpdateProfileDto {
  artistName?: string;
  avatar?: string;
  displayName?: string;
}

@Controller('artist/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ARTIST)
export class ArtistMeController {
  constructor(private prisma: PrismaService) {}

  private async getArtistByUserId(userId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!artist) {
      throw new NotFoundException('Bạn chưa có hồ sơ nghệ sĩ');
    }
    return artist;
  }

  // ====== TRACK LIST ======
  @Get('tracks')
  async getMyTracks(@Req() req: any) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    return this.prisma.track.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        duration: true,
        coverUrl: true,
        audioUrl: true,
        createdAt: true,
        lyrics: true,
      },
    });
  }

  // ====== OVERVIEW CHO TRANG /artist ======
  @Get('overview')
  async getMyOverview(@Req() req: any) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    const tracks = await this.prisma.track.findMany({
      where: { artistId: artist.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        duration: true,
        coverUrl: true,
        audioUrl: true,
        createdAt: true,
      },
    });

    const totalTracks = tracks.length;
    const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);

    if (!artist.user) {
      throw new InternalServerErrorException('User not loaded');
    }

    return {
      artist: {
        id: artist.id,
        name: artist.name,
        avatar: artist.avatar,
      },
      user: {
        id: artist.user.id,
        email: artist.user.email,
        name: artist.user.name,
      },
      stats: {
        totalTracks,
        totalDuration,
      },
      tracks,
    };
  }

  // ====== PROFILE NGHỆ SĨ ======
  @Patch('profile')
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    const updatesArtist: any = {};
    const updatesUser: any = {};

    if (dto.artistName !== undefined && dto.artistName.trim() !== '') {
      updatesArtist.name = dto.artistName.trim();
    }
    if (dto.avatar !== undefined) {
      updatesArtist.avatar = dto.avatar.trim() || null;
    }
    if (dto.displayName !== undefined && dto.displayName.trim() !== '') {
      updatesUser.name = dto.displayName.trim();
    }

    let updatedArtist = artist;
    let updatedUser = artist.user;

    if (Object.keys(updatesArtist).length) {
      updatedArtist = await this.prisma.artist.update({
        where: { id: artist.id },
        data: updatesArtist,
        include: { user: true },
      });
    }

    if (!artist.user) {
      throw new InternalServerErrorException('User not loaded');
    }

    if (Object.keys(updatesUser).length) {
      updatedUser = await this.prisma.user.update({
        where: { id: artist.user.id },
        data: updatesUser,
      });
    }

    if (!updatedUser) {
      throw new InternalServerErrorException('Updated user missing');
    }

    return {
      artist: {
        id: updatedArtist.id,
        name: updatedArtist.name,
        avatar: updatedArtist.avatar,
      },
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    };
  }

  // ====== TẠO BÀI HÁT ======
  @Post('tracks')
  async createMyTrack(@Req() req: any, @Body() dto: CreateTrackDto) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    if (!dto.title || !dto.audioUrl || !dto.coverUrl) {
      throw new BadRequestException('Thiếu title / audioUrl / coverUrl');
    }
    if (!dto.duration || dto.duration <= 0) {
      throw new BadRequestException('Duration phải > 0 (giây)');
    }

    return this.prisma.track.create({
      data: {
        title: dto.title,
        duration: dto.duration,
        coverUrl: dto.coverUrl,
        audioUrl: dto.audioUrl,
        artistId: artist.id,
        lyrics: dto.lyrics || null,
      },
      select: {
        id: true,
        title: true,
        duration: true,
        coverUrl: true,
        audioUrl: true,
        createdAt: true,
        lyrics: true,
      },
    });
  }

  // 🆕 ====== SỬA BÀI HÁT ======
  @Patch('tracks/:id')
  async updateMyTrack(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTrackDto,
  ) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    const track = await this.prisma.track.findUnique({ where: { id } });
    if (!track || track.artistId !== artist.id) {
      throw new NotFoundException('Không tìm thấy bài hát của bạn');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl;
    if (dto.audioUrl !== undefined) data.audioUrl = dto.audioUrl;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.lyrics !== undefined) data.lyrics = dto.lyrics;

    const updated = await this.prisma.track.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        duration: true,
        coverUrl: true,
        audioUrl: true,
        createdAt: true,
        lyrics: true,
      },
    });

    return updated;
  }

  // ====== XOÁ BÀI HÁT ======
  @Delete('tracks/:id')
  async deleteMyTrack(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub as string;
    const artist = await this.getArtistByUserId(userId);

    const track = await this.prisma.track.findUnique({
      where: { id },
    });
    if (!track || track.artistId !== artist.id) {
      throw new NotFoundException('Không tìm thấy bài hát của bạn');
    }

    await this.prisma.track.delete({ where: { id } });

    return { ok: true };
  }
}
