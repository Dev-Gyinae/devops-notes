import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdatePlaylistItemDto {
  @IsEnum(['IMAGE', 'VIDEO', 'HTML'])
  @IsOptional()
  type?: 'IMAGE' | 'VIDEO' | 'HTML';

  @IsString()
  @IsOptional()
  url?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsOptional()
  metadata?: any;
}
