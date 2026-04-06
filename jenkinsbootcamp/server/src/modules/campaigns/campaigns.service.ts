import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketGateway } from '../../socket/socket.gateway';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveTargetScreenIds(
    targetScreenIds: string[],
    targetClusters: string[],
  ): Promise<string[]> {
    const byId = new Set<string>(targetScreenIds);
    if (targetClusters.length > 0) {
      const clusterScreens = await this.prisma.screen.findMany({
        where: { cluster: { in: targetClusters } },
        select: { id: true },
      });
      clusterScreens.forEach((s) => byId.add(s.id));
    }
    return Array.from(byId);
  }

  private async getLockedScreenIds(excludeCampaignId?: string): Promise<Set<string>> {
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        ...(excludeCampaignId ? { id: { not: excludeCampaignId } } : {}),
      },
      select: { screenSnapshots: true },
    });
    const locked = new Set<string>();
    for (const c of activeCampaigns) {
      if (c.screenSnapshots && typeof c.screenSnapshots === 'object') {
        Object.keys(c.screenSnapshots as object).forEach((id) => locked.add(id));
      }
    }
    return locked;
  }

  // ─── ACTIVATE ────────────────────────────────────────────────────────────────

  async activate(campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || !campaign.playlistId) {
      this.logger.warn(`Cannot activate campaign ${campaignId} — no playlist set`);
      await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE', screenSnapshots: {} } });
      return;
    }

    const allTargetIds = await this.resolveTargetScreenIds(
      campaign.targetScreenIds as string[],
      campaign.targetClusters as string[],
    );

    if (allTargetIds.length === 0) {
      this.logger.warn(`Campaign ${campaignId} has no target screens`);
      await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE', screenSnapshots: {} } });
      return;
    }

    const locked = await this.getLockedScreenIds();
    const availableIds = allTargetIds.filter((id) => !locked.has(id));

    const screens = await this.prisma.screen.findMany({
      where: { id: { in: availableIds } },
      select: { id: true, playlistId: true },
    });

    const snapshot: Record<string, string | null> = {};
    for (const s of screens) {
      snapshot[s.id] = s.playlistId ?? null;
    }

    for (const screen of screens) {
      await this.prisma.screen.update({
        where: { id: screen.id },
        data: { playlistId: campaign.playlistId },
      });
      await this.socketGateway.pushPlaylistUpdate(screen.id);
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE', screenSnapshots: snapshot },
    });

    this.logger.log(`Campaign "${campaign.name}" ACTIVATED → ${screens.length} screens`);
  }

  // ─── DEACTIVATE ──────────────────────────────────────────────────────────────

  async deactivate(campaignId: string, finalStatus: string = 'COMPLETED'): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;

    const snapshot = campaign.screenSnapshots as Record<string, string | null> | null;
    if (snapshot) {
      for (const [screenId, previousPlaylistId] of Object.entries(snapshot)) {
        await this.prisma.screen.update({
          where: { id: screenId },
          data: { playlistId: previousPlaylistId ?? null },
        });
        await this.socketGateway.pushPlaylistUpdate(screenId);
      }
    }

    await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: finalStatus as any } });
    this.logger.log(`Campaign "${campaign.name}" → ${finalStatus}, restored ${Object.keys(snapshot ?? {}).length} screens`);
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll() {
    const campaigns = await this.prisma.campaign.findMany({
      include: { playlist: { include: { items: { orderBy: { order: 'asc' } } } } },
      orderBy: { startDate: 'asc' },
    });

    return Promise.all(
      campaigns.map(async (campaign) => {
        const snapshot = campaign.screenSnapshots as Record<string, string | null> | null;
        const screenIds = snapshot ? Object.keys(snapshot) : [];
        let impressions = 0;
        if (screenIds.length > 0 && campaign.playlistId) {
          impressions = await this.prisma.playbackLog.count({
            where: {
              screenId: { in: screenIds },
              playlistId: campaign.playlistId,
              eventType: 'START',
              timestamp: { gte: campaign.startDate, lte: campaign.endDate },
            },
          });
        }
        return { ...campaign, impressions };
      }),
    );
  }

  async create(data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    playlistId?: string;
    targetClusters?: string[];
    targetScreenIds?: string[];
    createdBy?: string;
  }) {
    return this.prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        playlistId: data.playlistId || null,
        createdBy: data.createdBy || null,
        status: 'SCHEDULED',
        targetClusters: data.targetClusters ?? [],
        targetScreenIds: data.targetScreenIds ?? [],
      },
      include: { playlist: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    playlistId?: string;
    targetClusters?: string[];
    targetScreenIds?: string[];
  }) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (data.status === 'ACTIVE' && campaign.status === 'PAUSED') {
      await this.activate(id);
      return this.prisma.campaign.findUnique({ where: { id }, include: { playlist: true } });
    }

    if (data.status === 'PAUSED' && campaign.status === 'ACTIVE') {
      await this.deactivate(id, 'PAUSED');
      return this.prisma.campaign.findUnique({ where: { id }, include: { playlist: true } });
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.playlistId !== undefined && { playlistId: data.playlistId || null }),
        ...(data.targetClusters !== undefined && { targetClusters: data.targetClusters }),
        ...(data.targetScreenIds !== undefined && { targetScreenIds: data.targetScreenIds }),
      },
      include: { playlist: true },
    });
  }

  async remove(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'ACTIVE') await this.deactivate(id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}
