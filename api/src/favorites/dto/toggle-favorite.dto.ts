// api/src/favorites/dto/toggle-favorite.dto.ts
import { IsString } from 'class-validator';

export class ToggleFavoriteDto {
  @IsString()
  trackId: string;
}
