import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';

export class CreatePlaylistItemDto {
  @IsEnum(['IMAGE', 'VIDEO', 'HTML'])
  type: 'IMAGE' | 'VIDEO' | 'HTML';

  @IsString()
  url: string;

  @IsInt()
  @Min(1)
  duration: number; // seconds

  @IsInt()
  @IsOptional()
  order?: number;

  @IsOptional()
  metadata?: any;
}
