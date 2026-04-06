import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private screenSockets: Map<string, string> = new Map();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    for (const [screenId, socketId] of this.screenSockets.entries()) {
      if (socketId === client.id) {
        this.screenSockets.delete(screenId);
        try {
          await this.prisma.screen.update({
            where: { id: screenId },
            data: { status: 'OFFLINE' },
          });
          this.logger.log(`Screen ${screenId} went OFFLINE`);
        } catch (error) {
          this.logger.error('Error updating screen status on disconnect', error);
        }
        break;
      }
    }
  }

  @SubscribeMessage('screen:join')
  async handleScreenJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { screenId?: string; pairingCode?: string },
  ) {
    try {
      let screenId = data.screenId;

      if (!screenId && data.pairingCode) {
        const pairingCode = await this.prisma.pairingCode.findUnique({
          where: { code: data.pairingCode },
          include: { screen: true },
        });

        if (pairingCode?.screen) {
          screenId = pairingCode.screen.id;
        } else {
          client.emit('error', { message: 'Screen not paired yet' });
          return;
        }
      }

      if (!screenId) {
        client.emit('error', { message: 'Screen ID required' });
        return;
      }

      const screen = await this.prisma.screen.findUnique({
        where: { id: screenId },
        include: {
          playlist: {
            include: {
              items: { orderBy: { order: 'asc' } },
            },
          },
        },
      });

      if (!screen) {
        client.emit('error', { message: 'Screen not found' });
        return;
      }

      client.join(`screen:${screenId}`);
      this.screenSockets.set(screenId, client.id);

      await this.prisma.screen.update({
        where: { id: screenId },
        data: { status: 'ONLINE', lastSeenAt: new Date() },
      });

      // Log ONLINE uptime event only if previously OFFLINE
      try {
        const lastUptime = await this.prisma.uptimeEvent.findFirst({
          where: { screenId },
          orderBy: { timestamp: 'desc' },
        });
        if (!lastUptime || lastUptime.event === 'OFFLINE') {
          await this.prisma.uptimeEvent.create({ data: { screenId, event: 'ONLINE' } });
        }
      } catch {}

      this.logger.log(`Screen ${screenId} joined and is ONLINE`);

      client.emit('screen:joined', { screenId, status: 'connected' });

      // FIX: send 'id' not 'playlistId' — the display Playlist type expects { id, name, items }
      if (screen.playlist) {
        client.emit('playlist:update', {
          id: screen.playlist.id,
          name: screen.playlist.name,
          items: screen.playlist.items,
        });
      }
    } catch (error) {
      this.logger.error('Error in screen:join', error);
      client.emit('error', { message: 'Failed to join' });
    }
  }

  @SubscribeMessage('screen:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { screenId: string; timestamp: string; metadata?: any },
  ) {
    try {
      this.logger.log(`💓 Heartbeat from screen ${data.screenId}`);

      const updateData: any = {
        lastSeenAt: new Date(),
        status: 'ONLINE',
      };

      if (data.metadata && Object.keys(data.metadata).length > 0) {
        updateData.deviceInfo = {
          ...data.metadata,
          lastHeartbeat: data.timestamp,
        };
      }

      await this.prisma.screen.update({
        where: { id: data.screenId },
        data: updateData,
      });

      this.logger.log(`✅ Screen ${data.screenId} heartbeat saved`);
    } catch (error) {
      this.logger.error('Error in screen:heartbeat', error);
    }
  }

  @SubscribeMessage('screen:playback_log')
  async handlePlaybackLog(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      screenId: string;
      playlistItemId?: string;
      eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';
      timestamp: string;
    },
  ) {
    try {
      const screen = await this.prisma.screen.findUnique({
        where: { id: data.screenId },
      });

      await this.prisma.playbackLog.create({
        data: {
          screenId: data.screenId,
          playlistId: screen?.playlistId,
          playlistItemId: data.playlistItemId,
          eventType: data.eventType,
          timestamp: new Date(data.timestamp),
        },
      });

      // On START, stamp nowPlaying into deviceInfo so the control panel
      // can show what's currently playing without a new DB column
      if (data.eventType === 'START' && data.playlistItemId) {
        const existing = (screen?.deviceInfo as any) ?? {};
        await this.prisma.screen.update({
          where: { id: data.screenId },
          data: {
            deviceInfo: {
              ...existing,
              nowPlaying: {
                playlistItemId: data.playlistItemId,
                since: data.timestamp,
              },
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('Error in screen:playback_log', error);
    }
  }

  async pushPlaylistUpdate(screenId: string) {
    try {
      const screen = await this.prisma.screen.findUnique({
        where: { id: screenId },
        include: {
          playlist: {
            include: { items: { orderBy: { order: 'asc' } } },
          },
        },
      });

      if (screen?.playlist) {
        // FIX: send 'id' not 'playlistId'
        this.server.to(`screen:${screenId}`).emit('playlist:update', {
          id: screen.playlist.id,
          name: screen.playlist.name,
          items: screen.playlist.items,
        });
        this.logger.log(`Pushed playlist update to screen ${screenId}`);
      }
    } catch (error) {
      this.logger.error('Error pushing playlist update', error);
    }
  }

  async pushPlaylistUpdateToAll(playlistId: string) {
    try {
      const screens = await this.prisma.screen.findMany({
        where: { playlistId },
      });

      const playlist = await this.prisma.playlist.findUnique({
        where: { id: playlistId },
        include: { items: { orderBy: { order: 'asc' } } },
      });

      if (playlist) {
        for (const screen of screens) {
          // FIX: send 'id' not 'playlistId'
          this.server.to(`screen:${screen.id}`).emit('playlist:update', {
            id: playlist.id,
            name: playlist.name,
            items: playlist.items,
          });
        }
        this.logger.log(`Pushed playlist update to ${screens.length} screens`);
      }
    } catch (error) {
      this.logger.error('Error pushing playlist update to all', error);
    }
  }
}
