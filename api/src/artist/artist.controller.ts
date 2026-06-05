import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Query,
} from '@nestjs/common';
import { ArtistService } from './artist.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

/* =======================
   Upload helpers
======================= */
function editFileName(
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `${name}-${Date.now()}-${randomName}${fileExtName}`);
}

@Controller('artist')
export class ArtistController {
  constructor(
    private readonly artistService: ArtistService,
    private readonly prisma: PrismaService, // ✅ thêm – KHÔNG ảnh hưởng service cũ
  ) {}

  /* =======================
     AUTH HELPER
  ======================= */
  private extractUserId(req: any): string {
    const authHeader =
      req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new BadRequestException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : parts[0];

    if (!token) {
      throw new BadRequestException('Invalid Authorization header');
    }

    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      const userId = payload.sub || payload.id || payload.userId;
      if (!userId) throw new Error();
      return userId;
    } catch {
      throw new BadRequestException('Invalid JWT token');
    }
  }

  /* =======================
     /artist/me
  ======================= */

  @Get('me')
  getMe(@Req() req: any) {
    return this.artistService.getMe(this.extractUserId(req));
  }
@Patch('me/profile')
async updateProfile(@Req() req: any, @Body() body: any) {
  return this.artistService.updateProfile(
    this.extractUserId(req),
    body,
  );
}

  @Get('me/overview')
  getOverview(@Req() req: any) {
    return this.artistService.getOverview(this.extractUserId(req));
  }

  @Get('me/tracks')
  getMyTracks(@Req() req: any) {
    return this.artistService.myTracks(this.extractUserId(req));
  }

  @Get('me/albums')
  getMyAlbums(@Req() req: any) {
    return this.artistService.myAlbums(this.extractUserId(req));
  }

  @Get('me/followers')
  myFollowers(@Req() req: any) {
    return this.artistService.myFollowers(this.extractUserId(req));
  }

  @Get('me/notifications')
  myNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);
    const only =
      onlyUnread === '1' || onlyUnread === 'true' || onlyUnread === 'yes';
    return this.artistService.myNotifications(this.extractUserId(req), {
      limit: lim,
      onlyUnread: only,
    });
  }

  @Patch('me/notifications/read-all')
  readAllNotifications(@Req() req: any) {
    return this.artistService.readAllNotifications(this.extractUserId(req));
  }

  @Patch('me/notifications/:id/read')
  readOne(@Req() req: any, @Param('id') id: string) {
    return this.artistService.markNotificationRead(
      this.extractUserId(req),
      id,
    );
  }

  @Delete('me/notifications/:id')
  deleteOneNotification(@Req() req: any, @Param('id') id: string) {
    return this.artistService.deleteNotification(this.extractUserId(req), id);
  }

  @Delete('me/notifications')
  deleteAllNotifications(@Req() req: any) {
    return this.artistService.deleteAllNotifications(this.extractUserId(req));
  }

  /* =======================
     Upload
  ======================= */

  @Post('me/upload-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: editFileName,
      }),
    }),
  )
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/images/${file.filename}` };
  }

  @Post('me/upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: editFileName,
      }),
    }),
  )
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/audio/${file.filename}` };
  }

  @Post('me/upload-track')
  uploadTrack(@Req() req: any, @Body() body: any) {
    return this.artistService.uploadTrack(this.extractUserId(req), body);
  }

  @Post('me/albums')
  createAlbum(@Req() req: any, @Body() body: any) {
    return this.artistService.createAlbum(this.extractUserId(req), body);
  }

  @Patch('me/albums/:id')
  updateAlbum(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.artistService.updateAlbum(
      this.extractUserId(req),
      id,
      body,
    );
  }

  @Patch('me/tracks/:id')
  updateTrack(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.artistService.updateTrack(
      this.extractUserId(req),
      id,
      body,
    );
  }

  @Patch('me/tracks/:id/album')
  updateTrackAlbum(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.artistService.updateTrackAlbum(
      this.extractUserId(req),
      id,
      body,
    );
  }

  @Delete('me/tracks/:id')
  deleteTrack(@Req() req: any, @Param('id') id: string) {
    return this.artistService.deleteTrack(this.extractUserId(req), id);
  }

  @Patch('me/albums/:id/reorder')
  reorderAlbumTracks(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.artistService.reorderAlbumTracks(
      this.extractUserId(req),
      id,
      body,
    );
  }

  @Delete('me/albums/:id')
  deleteAlbum(@Req() req: any, @Param('id') id: string) {
    return this.artistService.deleteAlbum(this.extractUserId(req), id);
  }

  /* =======================
     PUBLIC – LIST ARTIST (✨ PATCH)
  ======================= */

  @Get()
  async listArtists() {
    const artists = await this.artistService.listArtists();
    if (!artists?.length) return [];

    const ids = artists.map((a) => a.id);

    const tracks = await this.prisma.track.findMany({
      where: {
        artistId: { in: ids },
        deletedAt: null,
      },
      select: {
        artistId: true,
        popularity: true,
      },
    });

    const playsMap = new Map<string, number>();
    for (const t of tracks) {
      const prev = playsMap.get(t.artistId) ?? 0;
      playsMap.set(
        t.artistId,
        prev +
          (typeof t.popularity === 'number' && Number.isFinite(t.popularity)
            ? t.popularity
            : 0),
      );
    }

    return artists.map((a) => ({
      ...a,
      totalPlays: playsMap.get(a.id) ?? 0, // ✅ NEW
    }));
  }

  @Get(':id')
  getArtistById(@Param('id') id: string) {
    return this.artistService.getArtistById(id);
  }
}

/* =======================
   /artists alias (GIỮ NGUYÊN)
======================= */
@Controller('artists')
export class PublicArtistsController {
  constructor(
    private readonly artistService: ArtistService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listArtists() {
    const artists = await this.artistService.listArtists();
    if (!artists?.length) return [];

    const ids = artists.map((a) => a.id);

    const tracks = await this.prisma.track.findMany({
      where: { artistId: { in: ids }, deletedAt: null },
      select: { artistId: true, popularity: true },
    });

    const map = new Map<string, number>();
    for (const t of tracks) {
      map.set(t.artistId, (map.get(t.artistId) ?? 0) + (t.popularity ?? 0));
    }

    return artists.map((a) => ({
      ...a,
      totalPlays: map.get(a.id) ?? 0,
    }));
  }

  @Get(':id')
  getArtist(@Param('id') id: string) {
    return this.artistService.getArtistById(id);
  }
}
