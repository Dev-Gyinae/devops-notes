import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PairingModule } from './modules/pairing/pairing.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { ScreensModule } from './modules/screens/screens.module';
import { PlaybackModule } from './modules/playback/playback.module';
import { UploadModule } from './modules/upload/upload.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SocketModule } from './socket/socket.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PairingModule,
    PlaylistsModule,
    ScreensModule,
    PlaybackModule,
    UploadModule,
    CampaignsModule,
    SocketModule,
  ],
})
export class AppModule {}