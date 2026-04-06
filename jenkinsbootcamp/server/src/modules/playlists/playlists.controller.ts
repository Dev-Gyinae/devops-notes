import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { CreatePlaylistItemDto } from './dto/create-playlist-item.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) { }

  @Post()
  create(@Body() createDto: CreatePlaylistDto) {
    return this.playlistsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.playlistsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playlistsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePlaylistDto) {
    return this.playlistsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playlistsService.delete(id);
  }

  // Playlist Items
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() createDto: CreatePlaylistItemDto) {
    return this.playlistsService.addItem(id, createDto);
  }

  @Patch(':playlistId/items/:itemId')
  updateItem(
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdatePlaylistItemDto,
  ) {
    return this.playlistsService.updateItem(playlistId, itemId, updateDto);
  }

  @Delete(':playlistId/items/:itemId')
  removeItem(
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.playlistsService.removeItem(playlistId, itemId);
  }

  @Post(':id/items/reorder')
  reorderItems(
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.playlistsService.reorderItems(id, body.itemIds);
  }
}
