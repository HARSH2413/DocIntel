import { ImageResponse } from 'next/og';
import { BRAND_INDIGO, LOGO_PATHS } from '@/components/brand/Logo';

// iOS home-screen icon. iOS rounds the corners itself, so the tile is square.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill={BRAND_INDIGO} />
        <path d={LOGO_PATHS.page} fill="#FFFFFF" />
        <path d={LOGO_PATHS.fold} fill="#C7D2FE" />
        <path d={LOGO_PATHS.spark} fill={BRAND_INDIGO} />
      </svg>
    ),
    size,
  );
}
