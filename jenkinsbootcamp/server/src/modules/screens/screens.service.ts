import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class ScreensService {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  async findAll() {
    return this.prisma.screen.findMany({
      include: { playlist: { include: { items: { orderBy: { order: 'asc' } } } } },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const screen = await this.prisma.screen.findUnique({
      where: { id },
      include: { playlist: { include: { items: { orderBy: { order: 'asc' } } } } },
    });
    if (!screen) throw new NotFoundException('Screen not found');
    return screen;
  }

  async update(id: string, data: {
    name?: string;
    playlistId?: string;
    venueName?: string;
    venueType?: string;
    cluster?: string;
    area?: string;
    address?: string;
  }) {
    const screen = await this.prisma.screen.update({
      where: { id },
      data,
      include: { playlist: { include: { items: { orderBy: { order: 'asc' } } } } },
    });

    if (data.playlistId !== undefined) {
      await this.socketGateway.pushPlaylistUpdate(id);
    }

    return screen;
  }

  async remove(id: string) {
    return this.prisma.screen.delete({ where: { id } });
  }
}