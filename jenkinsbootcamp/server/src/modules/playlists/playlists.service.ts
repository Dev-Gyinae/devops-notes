import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class PlaylistsService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  async findAll() {
    return this.prisma.playlist.findMany({
      include: {
        items: { orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        items: { orderBy: { order: 'asc' } },
        screens: true,
      },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    return playlist;
  }

  async create(data: { name: string; description?: string }) {
    return this.prisma.playlist.create({
      data: { name: data.name, description: data.description },
      include: { items: true },
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    const playlist = await this.prisma.playlist.update({
      where: { id },
      data,
      include: {
        items: { orderBy: { order: 'asc' } },
        screens: true,
      },
    });

    // Push live update to all screens using this playlist
    await this.socketGateway.pushPlaylistUpdateToAll(id);

    return playlist;
  }

  async delete(id: string) {
    return this.prisma.playlist.delete({ where: { id } });
  }

  async addItem(playlistId: string, data: { type: string; url: string; duration: number }) {
    const lastItem = await this.prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' },
    });

    const item = await this.prisma.playlistItem.create({
      data: {
        playlistId,
        type: data.type as any,
        url: data.url,
        duration: data.duration,
        order: (lastItem?.order ?? -1) + 1,
      },
    });

    // Push live update to all screens using this playlist
    await this.socketGateway.pushPlaylistUpdateToAll(playlistId);

    return item;
  }

  async removeItem(playlistId: string, itemId: string) {
    await this.prisma.playlistItem.delete({
      where: { id: itemId, playlistId },
    });

    // Push live update
    await this.socketGateway.pushPlaylistUpdateToAll(playlistId);
  }

  async updateItem(
    playlistId: string,
    itemId: string,
    data: { url?: string; duration?: number; order?: number; metadata?: any },
  ) {
    const item = await this.prisma.playlistItem.update({
      where: { id: itemId, playlistId },
      data,
    });

    // Push live update
    await this.socketGateway.pushPlaylistUpdateToAll(playlistId);

    return item;
  }

  async reorderItems(playlistId: string, itemIds: string[]) {
    // Update each item's order based on its position in the provided array
    await Promise.all(
      itemIds.map((id, index) =>
        this.prisma.playlistItem.update({
          where: { id, playlistId },
          data: { order: index },
        }),
      ),
    );

    // Push live update to screens
    await this.socketGateway.pushPlaylistUpdateToAll(playlistId);

    return { success: true };
  }
}