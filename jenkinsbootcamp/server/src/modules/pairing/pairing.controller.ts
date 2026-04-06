import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { PairingService } from './pairing.service';
import { RequestPairingDto } from './dto/request-pairing.dto';
import { ConfirmPairingDto } from './dto/confirm-pairing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pairing')
export class PairingController {
  constructor(private readonly pairingService: PairingService) {}

  /**
   * POST /api/pairing/request
   * Generate a new pairing code (called from display-web)
   */
  @Post('request')
  async requestPairingCode(@Body() requestDto: RequestPairingDto) {
    return this.pairingService.requestPairingCode(requestDto);
  }

  /**
   * POST /api/pairing/confirm
   * Confirm pairing and create screen (called from control-web)
   * Requires authentication
   */
  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmPairing(@Body() confirmDto: ConfirmPairingDto) {
    return this.pairingService.confirmPairing(confirmDto);
  }

  /**
   * GET /api/pairing/status/:code
   * Check pairing status (polled by display-web)
   */
  @Get('status/:code')
  async checkStatus(@Param('code') code: string) {
    return this.pairingService.checkPairingStatus(code);
  }

  /**
   * POST /api/pairing/cleanup
   * Clean up expired codes (admin only)
   */
  @Post('cleanup')
  @UseGuards(JwtAuthGuard)
  async cleanup() {
    return this.pairingService.cleanupExpiredCodes();
  }
}