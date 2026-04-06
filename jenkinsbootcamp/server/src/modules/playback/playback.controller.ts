import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PlaybackService } from './playback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getPlatformAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.playbackService.getPlatformAnalytics(startDate, endDate);
  }

  @Get('screens/:screenId/analytics')
  @UseGuards(JwtAuthGuard)
  getScreenAnalytics(
    @Param('screenId') screenId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.playbackService.getScreenAnalytics(screenId, startDate, endDate);
  }

  @Get('uptime')
  @UseGuards(JwtAuthGuard)
  getNetworkUptime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.playbackService.getNetworkUptimeStats(startDate, endDate);
  }

  @Get('screens/:screenId/uptime')
  @UseGuards(JwtAuthGuard)
  getScreenUptime(
    @Param('screenId') screenId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.playbackService.getUptimeStats(screenId, startDate, endDate);
  }

  @Post('log')
  logEvent(
    @Body()
    data: {
      screenId: string;
      playlistId?: string;
      playlistItemId?: string;
      eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';
    },
  ) {
    return this.playbackService.logEvent(data);
  }
}
