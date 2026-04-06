import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from './campaigns.service';

/**
 * Runs every 60 seconds. Checks:
 *   - SCHEDULED campaigns whose startDate has passed → activate
 *   - ACTIVE campaigns whose endDate has passed → complete
 *
 * No external packages needed — pure setInterval.
 */
@Injectable()
export class CampaignSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
  ) {}

  onModuleInit() {
    this.logger.log('Campaign scheduler started (runs every 60s)');
    // Run immediately on startup, then every 60 seconds
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 60_000);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('Campaign scheduler stopped');
    }
  }

  private async tick() {
    try {
      const now = new Date();

      // ── 1. Activate campaigns that should be running ──────────────────────────
      const toActivate = await this.prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          startDate: { lte: now },
          endDate: { gt: now },
        },
        select: { id: true, name: true },
      });

      for (const c of toActivate) {
        this.logger.log(`Auto-activating campaign: "${c.name}"`);
        await this.campaignsService.activate(c.id);
      }

      // ── 2. Complete campaigns that have passed their end date ─────────────────
      const toComplete = await this.prisma.campaign.findMany({
        where: {
          status: { in: ['ACTIVE', 'PAUSED'] },
          endDate: { lte: now },
        },
        select: { id: true, name: true },
      });

      for (const c of toComplete) {
        this.logger.log(`Auto-completing campaign: "${c.name}"`);
        await this.campaignsService.deactivate(c.id, 'COMPLETED');
      }

      // ── 3. Mark campaigns CANCELLED if they never ran and are past end date ───
      await this.prisma.campaign.updateMany({
        where: {
          status: 'SCHEDULED',
          endDate: { lte: now },
        },
        data: { status: 'COMPLETED' },
      });

      if (toActivate.length > 0 || toComplete.length > 0) {
        this.logger.log(
          `Scheduler tick: activated ${toActivate.length}, completed ${toComplete.length}`,
        );
      }
    } catch (err) {
      this.logger.error('Scheduler tick error:', err);
    }
  }
}
