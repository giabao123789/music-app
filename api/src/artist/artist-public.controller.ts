// api/src/artist/artist-public.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ArtistService } from './artist.service';

@Controller('artists')
export class ArtistPublicController {
  constructor(private readonly artistService: ArtistService) {}

  // GET /artists  -> dùng cho trang home, trang /artists
  @Get()
  listArtists() {
    return this.artistService.listArtists();
  }

  // GET /artists/:id  -> chi tiết nghệ sĩ public
  @Get(':id')
  getArtistById(@Param('id') id: string) {
    return this.artistService.getArtistById(id);
  }
}
