import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { customAlphabet } from 'nanoid';
import { RequestPairingDto } from './dto/request-pairing.dto';
import { ConfirmPairingDto } from './dto/confirm-pairing.dto';

// Generate pairing codes (no ambiguous characters: 0, O, 1, I)
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class PairingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new pairing code (called from display-web)
   */
  async requestPairingCode(requestDto: RequestPairingDto) {
    const code = nanoid(); // e.g., "A7F3K2"
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const pairingCode = await this.prisma.pairingCode.create({
      data: {
        code,
        status: 'PENDING',
        expiresAt,
      },
    });

    return {
      id: pairingCode.id,
      code: pairingCode.code,
      expiresAt: pairingCode.expiresAt,
      status: pairingCode.status,
    };
  }

  /**
   * Confirm pairing code and create screen (called from control-web)
   */
  async confirmPairing(confirmDto: ConfirmPairingDto) {
    // Find the pairing code
    const pairingCode = await this.prisma.pairingCode.findUnique({
      where: { code: confirmDto.code },
    });

    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    // Check if expired
    if (new Date() > pairingCode.expiresAt) {
      await this.prisma.pairingCode.update({
        where: { id: pairingCode.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Pairing code has expired');
    }

    // Check if already used
    if (pairingCode.status === 'CONFIRMED') {
      throw new BadRequestException('Pairing code already used');
    }

    // Verify playlist exists
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: confirmDto.playlistId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    // Create screen
    const screen = await this.prisma.screen.create({
      data: {
        name: confirmDto.screenName || `Screen ${confirmDto.code}`,
        status: 'OFFLINE',
        playlistId: confirmDto.playlistId,
        pairedAt: new Date(),
      },
    });

    // Update pairing code
    await this.prisma.pairingCode.update({
      where: { id: pairingCode.id },
      data: {
        status: 'CONFIRMED',
        screenId: screen.id,
      },
    });

    return {
      screen: {
        id: screen.id,
        name: screen.name,
        status: screen.status,
        playlistId: screen.playlistId,
        pairedAt: screen.pairedAt,
      },
      pairingCode: {
        id: pairingCode.id,
        code: pairingCode.code,
        status: 'CONFIRMED',
      },
    };
  }

  /**
   * Check pairing status (polled by display-web)
   */
  async checkPairingStatus(code: string) {
    const pairingCode = await this.prisma.pairingCode.findUnique({
      where: { code },
      include: {
        screen: {
          include: {
            playlist: true,
          },
        },
      },
    });

    if (!pairingCode) {
      throw new NotFoundException('Pairing code not found');
    }

    // Check if expired
    if (new Date() > pairingCode.expiresAt && pairingCode.status === 'PENDING') {
      await this.prisma.pairingCode.update({
        where: { id: pairingCode.id },
        data: { status: 'EXPIRED' },
      });
      return {
        code: pairingCode.code,
        status: 'EXPIRED',
        screen: null,
      };
    }

    return {
      code: pairingCode.code,
      status: pairingCode.status,
      screen: pairingCode.screen
        ? {
            id: pairingCode.screen.id,
            name: pairingCode.screen.name,
            playlistId: pairingCode.screen.playlistId,
          }
        : null,
    };
  }

  /**
   * Clean up expired pairing codes (run periodically)
   */
  async cleanupExpiredCodes() {
    const result = await this.prisma.pairingCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: 'PENDING',
      },
    });

    return { deleted: result.count };
  }
}