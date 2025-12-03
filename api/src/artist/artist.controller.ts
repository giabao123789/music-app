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
} from '@nestjs/common';
import { ArtistService } from './artist.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
  constructor(private readonly artistService: ArtistService) {}

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
      if (!payloadBase64) {
        throw new Error('Invalid JWT structure');
      }

      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);

      const userId = payload.sub || payload.id || payload.userId;
      if (!userId) {
        throw new Error('No user id in token payload');
      }

      return userId;
    } catch {
      throw new BadRequestException('Invalid JWT token');
    }
  }

  // ====== /artist/me ======

  @Get('me')
  async getMe(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.artistService.getMe(userId);
  }

  @Get('me/tracks')
  async getMyTracks(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.artistService.myTracks(userId);
  }

  @Get('me/albums')
  async getMyAlbums(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.artistService.myAlbums(userId);
  }

  // update profile (name, avatar, bio,…)
  @Patch('me/profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.artistService.updateProfile(userId, body);
  }

  @Post('me/upload-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/images',
        filename: editFileName,
      }),
    }),
  )
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = `/uploads/images/${file.filename}`;
    return { url };
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
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = `/uploads/audio/${file.filename}`;
    return { url };
  }

  @Post('me/upload-track')
  async uploadTrack(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.artistService.uploadTrack(userId, body);
  }

  @Post('me/albums')
  async createAlbum(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    return this.artistService.createAlbum(userId, body);
  }

  @Patch('me/albums/:id')
  async updateAlbum(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = this.extractUserId(req);
    return this.artistService.updateAlbum(userId, id, body);
  }

  // update track (đổi album, title, lyrics, …)
  @Patch('me/tracks/:id')
  async updateTrack(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = this.extractUserId(req);
    return this.artistService.updateTrack(userId, id, body);
  }

  // ✅ route mới: chỉ dùng để đổi album cho track (dùng cho trang /albums/[id])
  @Patch('me/tracks/:id/album')
  async updateTrackAlbum(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = this.extractUserId(req);
    return this.artistService.updateTrackAlbum(userId, id, body);
  }

  // xoá track
  @Delete('me/tracks/:id')
  async deleteTrack(@Req() req: any, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    return this.artistService.deleteTrack(userId, id);
  }

  // ✅ route mới: lưu thứ tự track trong album (drag & drop)
  @Patch('me/albums/:id/reorder')
  async reorderAlbumTracks(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const userId = this.extractUserId(req);
    return this.artistService.reorderAlbumTracks(userId, id, body);
  }
  // ❌ xoá album (các bài trong album sẽ thành single)
  // ------------------------- GIỮ NGUYÊN MỌI IMPORT -------------------------


// ------------------------- THÊM ROUTE XOÁ ALBUM -------------------------
@Delete('me/albums/:id')
async deleteAlbum(@Req() req: any, @Param('id') id: string) {
  const userId = this.extractUserId(req);
  return this.artistService.deleteAlbum(userId, id);
}
// ------------------------------------------------------------------------


  // ====== PUBLIC ======

  @Get()
  async listArtists() {
    return this.artistService.listArtists();
  }

  @Get(':id')
  async getArtistById(@Param('id') id: string) {
    return this.artistService.getArtistById(id);
  }
}
