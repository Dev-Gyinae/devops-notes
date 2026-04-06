import { IsObject, IsOptional } from 'class-validator';

export class RequestPairingDto {
  @IsObject()
  @IsOptional()
  deviceInfo?: {
    userAgent?: string;
    screenResolution?: string;
    platform?: string;
  };
}