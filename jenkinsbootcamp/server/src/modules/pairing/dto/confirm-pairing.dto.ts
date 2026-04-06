import { IsString, Length, IsOptional } from 'class-validator';

export class ConfirmPairingDto {
  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  playlistId: string;

  @IsString()
  @IsOptional()
  screenName?: string;
}