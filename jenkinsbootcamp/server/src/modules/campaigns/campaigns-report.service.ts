import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CampaignsReportService {
  constructor(private prisma: PrismaService) {}

  async getCampaignReport(campaignId: string) {
    // 1. Fetch campaign with playlist + items
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        playlist: { include: { items: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // 2. Resolve which screens ran this campaign from the snapshot
    const snapshot = campaign.screenSnapshots as Record<string, string | null> | null;
    const screenIds = snapshot ? Object.keys(snapshot) : [];

    // 3. Fetch screen details for those screens
    const screens = screenIds.length > 0
      ? await this.prisma.screen.findMany({
          where: { id: { in: screenIds } },
          select: { id: true, name: true, venueName: true, cluster: true, area: true },
        })
      : [];

    // 4. Fetch all START logs for this campaign window
    const playbackLogs = campaign.playlistId && screenIds.length > 0
      ? await this.prisma.playbackLog.findMany({
          where: {
            screenId: { in: screenIds },
            playlistId: campaign.playlistId,
            eventType: 'START',
            timestamp: { gte: campaign.startDate, lte: campaign.endDate },
          },
          orderBy: { timestamp: 'asc' },
        })
      : [];

    // 5. Total impressions
    const totalImpressions = playbackLogs.length;

    // 6. Per-screen breakdown
    const perScreen = screens.map(screen => {
      const screenLogs = playbackLogs.filter(l => l.screenId === screen.id);
      return {
        screenId: screen.id,
        screenName: screen.name ?? 'Unnamed',
        venueName: screen.venueName ?? null,
        cluster: screen.cluster ?? null,
        area: screen.area ?? null,
        impressions: screenLogs.length,
      };
    }).sort((a, b) => b.impressions - a.impressions);

    // 7. Per-item breakdown (which ad played the most)
    const itemMap: Record<string, { url: string; type: string; count: number }> = {};
    if (campaign.playlist?.items) {
      for (const item of campaign.playlist.items) {
        itemMap[item.id] = { url: item.url, type: item.type, count: 0 };
      }
    }
    for (const log of playbackLogs) {
      if (log.playlistItemId && itemMap[log.playlistItemId]) {
        itemMap[log.playlistItemId].count++;
      }
    }
    const perItem = Object.entries(itemMap).map(([id, data]) => ({
      itemId: id,
      url: data.url,
      type: data.type,
      impressions: data.count,
    })).sort((a, b) => b.impressions - a.impressions);

    // 8. Daily breakdown (impressions per day)
    const dailyMap: Record<string, number> = {};
    for (const log of playbackLogs) {
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, impressions: count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        playlistName: campaign.playlist?.name ?? null,
        adCount: campaign.playlist?.items?.length ?? 0,
        targetClusters: campaign.targetClusters,
        targetScreenIds: campaign.targetScreenIds,
      },
      summary: {
        totalImpressions,
        totalScreens: screens.length,
        daysRan: daily.length,
        avgPerDay: daily.length > 0 ? Math.round(totalImpressions / daily.length) : 0,
        avgPerScreen: screens.length > 0 ? Math.round(totalImpressions / screens.length) : 0,
      },
      perScreen,
      perItem,
      daily,
    };
  }
}
