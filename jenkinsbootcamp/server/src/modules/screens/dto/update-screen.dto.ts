import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateScreenDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  playlistId?: string;

  @IsEnum(['ONLINE', 'OFFLINE', 'ERROR'])
  @IsOptional()
  status?: 'ONLINE' | 'OFFLINE' | 'ERROR';

  // Location fields
  @IsString()
  @IsOptional()
  venueName?: string;

  @IsString()
  @IsOptional()
  venueType?: string;

  @IsString()
  @IsOptional()
  cluster?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
