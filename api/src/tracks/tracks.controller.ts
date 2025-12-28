// api/src/tracks/tracks.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TracksService } from './tracks.service';
import { Public } from '../auth/public.decorator';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * GET /tracks
   * Danh sách bài hát public (homepage, search…)
   * Query:
   *  - q: search theo tên bài
   *  - genre
   *  - artistId
   *  - limit
   */
  @Public()
  @Get()
  findAllPublic(
    @Query('q') q?: string,
    @Query('genre') genre?: string,
    @Query('artistId') artistId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.tracksService.findAllPublic({
      q: q || undefined,
      genre: genre || undefined,
      artistId: artistId || undefined,
      limit:
        typeof parsedLimit === 'number' && !Number.isNaN(parsedLimit)
          ? parsedLimit
          : undefined,
    });
  }

  /**
   * GET /tracks/top
   * Top bài hát theo popularity (đã filter khoá).
   */
  @Public()
  @Get('top')
  findTop() {
    return this.tracksService.findTopPublic();
  }

  /**
   * GET /tracks/:id
   * Chi tiết 1 bài public. Nếu bài bị khoá -> 404.
   */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tracksService.findOnePublic(id);
  }

  /**
   * POST /tracks/:id/play
   * +1 lượt nghe (popularity) mỗi lần play.
   * Để @Public() để web player không cần gửi token.
   */
  @Public()
  @Post(':id/play')
  @HttpCode(HttpStatus.NO_CONTENT)
  async play(@Param('id') id: string) {
    await this.tracksService.incrementPlay(id);
  }
}
