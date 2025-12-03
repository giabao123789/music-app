import { Controller, Get, Param } from "@nestjs/common";
import { AlbumsService } from "./albums.service";

@Controller("albums")
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.albumsService.getAlbumById(id);
  }
}
