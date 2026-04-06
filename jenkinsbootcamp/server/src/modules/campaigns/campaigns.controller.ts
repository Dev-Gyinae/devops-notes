import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsReportService } from './campaigns-report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly campaignsReportService: CampaignsReportService,
  ) {}

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Post()
  create(
    @Body() body: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      playlistId?: string;
      targetClusters?: string[];
      targetScreenIds?: string[];
    },
    @CurrentUser() user: any,
  ) {
    return this.campaignsService.create({ ...body, createdBy: user?.sub });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      playlistId?: string;
      targetClusters?: string[];
      targetScreenIds?: string[];
    },
  ) {
    return this.campaignsService.update(id, body);
  }

  @Get(':id/report')
  getReport(@Param('id') id: string) {
    return this.campaignsReportService.getCampaignReport(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
