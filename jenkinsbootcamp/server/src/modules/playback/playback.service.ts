import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaybackService {
  constructor(private prisma: PrismaService) {}

  async logEvent(data: {
    screenId: string;
    playlistId?: string;
    playlistItemId?: string;
    eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';
  }) {
    return this.prisma.playbackLog.create({
      data: {
        screenId: data.screenId,
        playlistId: data.playlistId,
        playlistItemId: data.playlistItemId,
        eventType: data.eventType,
        timestamp: new Date(),
      },
    });
  }

  async getPlatformAnalytics(startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      totalScreens,
      onlineScreens,
      totalPlaylists,
      activePlaylists,
      totalPlaybackEvents,
      recentScreens,
      recentPlaylists,
    ] = await Promise.all([
      this.prisma.screen.count(),
      this.prisma.screen.count({ where: { status: 'ONLINE' } }),
      this.prisma.playlist.count(),
      this.prisma.playlist.count({ where: { isActive: true } }),
      this.prisma.playbackLog.count({
        where: dateFilter ? { timestamp: dateFilter } : undefined,
      }),
      this.prisma.screen.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 10 }),
      this.prisma.playlist.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { items: { orderBy: { order: 'asc' } } },
      }),
    ]);

    return {
      totalScreens,
      onlineScreens,
      totalPlaylists,
      activePlaylists,
      totalPlaybackEvents,
      recentScreens,
      recentPlaylists,
    };
  }

  async getScreenAnalytics(screenId: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const logs = await this.prisma.playbackLog.findMany({
      where: {
        screenId,
        ...(dateFilter ? { timestamp: dateFilter } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
      include: { playlistItem: { select: { url: true, type: true, duration: true } } },
    });

    const eventBreakdown: Record<string, number> = {};
    const itemBreakdown: Record<string, { url: string; type: string; count: number }> = {};

    for (const log of logs) {
      eventBreakdown[log.eventType] = (eventBreakdown[log.eventType] || 0) + 1;
      if (log.eventType === 'START' && log.playlistItemId) {
        if (!itemBreakdown[log.playlistItemId]) {
          itemBreakdown[log.playlistItemId] = {
            url: log.playlistItem?.url ?? 'Unknown',
            type: log.playlistItem?.type ?? 'Unknown',
            count: 0,
          };
        }
        itemBreakdown[log.playlistItemId].count++;
      }
    }

    // Daily breakdown for chart
    const dailyMap: Record<string, number> = {};
    for (const log of logs) {
      if (log.eventType === 'START') {
        const day = new Date(log.timestamp).toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
    }
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      screenId,
      totalEvents: logs.length,
      eventBreakdown,
      itemBreakdown: Object.entries(itemBreakdown)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.count - a.count),
      daily,
      recentLogs: logs.slice(0, 20),
    };
  }

  async getUptimeStats(screenId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const events = await this.prisma.uptimeEvent.findMany({
      where: {
        screenId,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate total online duration
    let onlineMs = 0;
    let lastOnline: Date | null = null;

    for (const ev of events) {
      if (ev.event === 'ONLINE') {
        lastOnline = ev.timestamp;
      } else if (ev.event === 'OFFLINE' && lastOnline) {
        onlineMs += ev.timestamp.getTime() - lastOnline.getTime();
        lastOnline = null;
      }
    }
    // If still online at end of window
    if (lastOnline) {
      onlineMs += end.getTime() - lastOnline.getTime();
    }

    const totalMs = end.getTime() - start.getTime();
    const uptimePct = totalMs > 0 ? Math.round((onlineMs / totalMs) * 100) : 0;

    return {
      screenId,
      uptimePercent: Math.min(uptimePct, 100),
      onlineHours: Math.round(onlineMs / 3600000 * 10) / 10,
      totalHours: Math.round(totalMs / 3600000 * 10) / 10,
      eventCount: events.length,
    };
  }

  async getNetworkUptimeStats(startDate?: string, endDate?: string) {
    const screens = await this.prisma.screen.findMany({ select: { id: true, name: true } });
    const stats = await Promise.all(
      screens.map(s => this.getUptimeStats(s.id, startDate, endDate).then(u => ({ ...u, name: s.name })))
    );
    const avgUptime = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + s.uptimePercent, 0) / stats.length)
      : 0;
    return { screens: stats, avgUptime };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return null;
    const filter: any = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return filter;
  }
}
