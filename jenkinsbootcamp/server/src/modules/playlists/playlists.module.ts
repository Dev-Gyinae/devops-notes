import { Module } from '@nestjs/common';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../../socket/socket.module';

@Module({
  imports: [PrismaModule, SocketModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}