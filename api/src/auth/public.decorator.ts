// api/src/auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Dùng cho các route không cần JWT.
 *
 * Ví dụ:
 *   @Public()
 *   @Get('tracks')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
