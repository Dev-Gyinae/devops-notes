import { Controller, Get, Patch, Delete, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ScreensService } from './screens.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateScreenDto } from './dto/update-screen.dto';

@Controller('screens')
export class ScreensController {
  constructor(private readonly screensService: ScreensService) {}

  // ── Public endpoint: display app calls this to verify a Screen ID before restoring ──
  // Only returns id + name — no sensitive data exposed
  @Get('verify/:id')
  async verifyScreen(@Param('id') id: string) {
    const screen = await this.screensService.findOne(id);
    if (!screen) throw new NotFoundException('Screen not found');
    return { id: screen.id, name: screen.name };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.screensService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.screensService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScreenDto) {
    return this.screensService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.screensService.remove(id);
  }
}
