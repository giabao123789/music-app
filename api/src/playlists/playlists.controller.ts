import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';

@Controller()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  // ============ USER PLAYLIST LIST ============

  // POST /users/:userId/playlists
  @Post('users/:userId/playlists')
  createForUser(
    @Param('userId') userId: string,
    @Body('name') name: string,
  ) {
    return this.playlistsService.create(userId, name);
  }

  // GET /users/:userId/playlists
  @Get('users/:userId/playlists')
  findForUser(@Param('userId') userId: string) {
    return this.playlistsService.findByUser(userId);
  }

  // ============ UPDATE TÊN PLAYLIST ============

  // PATCH /playlists/:id
  @Patch('playlists/:id')
  updateMeta(
    @Param('id') id: string,
    @Body('name') name?: string,
  ) {
    return this.playlistsService.updateMeta(id, { name });
  }

  // ============ REORDER TRACKS ============

  // PATCH /playlists/:id/reorder
  @Patch('playlists/:id/reorder')
  reorder(
    @Param('id') playlistId: string,
    @Body('items')
    items: { trackId: string; order: number }[],
  ) {
    return this.playlistsService.reorderTracks(playlistId, items);
  }

  // ============ PLAYLIST DETAIL ============

  // GET /playlists/:id
  @Get('playlists/:id')
  async detail(@Param('id') id: string) {
    const pl = await this.playlistsService.findOneWithTracks(id);

    if (!pl) {
      // không tìm thấy playlist -> trả trống (frontend xử lý)
      return { id, name: 'Playlist', tracks: [] };
    }

    return {
      id: pl.id,
      name: pl.name,
      tracks: pl.items.map((it) => ({
        id: it.track.id,
        title: it.track.title,
        coverUrl: it.track.coverUrl,
        audioUrl: it.track.audioUrl,
        duration: it.track.duration,
        genre: it.track.genre,
        artist: it.track.artist
          ? { id: it.track.artist.id, name: it.track.artist.name }
          : null,
      })),
    };
  }

  // ============ THÊM / XOÁ TRACK ============

  // POST /playlists/:id/tracks
  @Post('playlists/:id/tracks')
  addTrack(
    @Param('id') playlistId: string,
    @Body('trackId') trackId: string,
  ) {
    return this.playlistsService.addTrack(playlistId, trackId);
  }

  // DELETE /playlists/:id/tracks/:trackId
  @Delete('playlists/:id/tracks/:trackId')
  removeTrack(
    @Param('id') playlistId: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlistsService.removeTrack(playlistId, trackId);
  }

  // ============ XOÁ PLAYLIST ============

  // DELETE /playlists/:id
  @Delete('playlists/:id')
  deletePlaylist(@Param('id') id: string) {
    return this.playlistsService.deletePlaylist(id);
  }

  // ============ PLAYLISTS CHO TRANG CHỦ ============

  // GET /playlists/home
  @Get('playlists/home')
  getHomePlaylists() {
    return this.playlistsService.getHomePlaylists();
  }

  // GET /playlists/system
  @Get('playlists/system')
  getSystemPlaylists() {
    return this.playlistsService.getSystemPlaylists();
  }
}
