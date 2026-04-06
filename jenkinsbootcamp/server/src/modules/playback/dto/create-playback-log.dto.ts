import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreatePlaybackLogDto {
  @IsString()
  screenId: string;

  @IsString()
  @IsOptional()
  playlistItemId?: string;

  @IsEnum(['START', 'COMPLETE', 'ERROR', 'SKIP'])
  eventType: 'START' | 'COMPLETE' | 'ERROR' | 'SKIP';

  @IsString()
  @IsOptional()
  timestamp?: string;

  @IsOptional()
  metadata?: any;
}