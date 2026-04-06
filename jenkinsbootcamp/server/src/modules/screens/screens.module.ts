import { Module } from '@nestjs/common';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SocketModule } from '../../socket/socket.module';

@Module({
  imports: [PrismaModule, SocketModule],
  controllers: [ScreensController],
  providers: [ScreensService],
  exports: [ScreensService],
})
export class ScreensModule {}