// DocIntel brand: a document page with a folded corner and an insight spark —
// "document intelligence". Drawn on a 32-unit grid so it stays crisp from favicon
// size up. Keep in sync with app/icon.svg and app/apple-icon.tsx.

export const BRAND_INDIGO = '#4F46E5';
const FOLD_TINT = '#C7D2FE';

export const LOGO_PATHS = {
  page: 'M10 7.5A1.5 1.5 0 0 1 11.5 6H18.6L23.5 10.9V24.5A1.5 1.5 0 0 1 22 26H11.5A1.5 1.5 0 0 1 10 24.5Z',
  fold: 'M18.6 6L23.5 10.9H20.1A1.5 1.5 0 0 1 18.6 9.4Z',
  spark: 'M16.75 13.5c.42 2.33 1.67 3.58 4 4-2.33.42-3.58 1.67-4 4-.42-2.33-1.67-3.58-4-4 2.33-.42 3.58-1.67 4-4Z',
};

interface LogoMarkProps {
  className?: string;
  /** Accessible name; omit when the mark sits next to visible "DocIntel" text. */
  title?: string;
}

export function LogoMark({ className = 'h-8 w-8', title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill={BRAND_INDIGO} />
      <path d={LOGO_PATHS.page} fill="#FFFFFF" />
      <path d={LOGO_PATHS.fold} fill={FOLD_TINT} />
      <path d={LOGO_PATHS.spark} fill={BRAND_INDIGO} />
    </svg>
  );
}

const SIZES = {
  sm: { mark: 'h-6 w-6', text: 'text-sm' },
  md: { mark: 'h-8 w-8', text: 'text-base' },
  lg: { mark: 'h-10 w-10', text: 'text-xl' },
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Hide the wordmark (e.g. collapsed sidebar); the mark then carries the name. */
  markOnly?: boolean;
}

export function Logo({ size = 'md', className = '', markOnly = false }: LogoProps) {
  const s = SIZES[size];
  if (markOnly) return <LogoMark className={s.mark} title="DocIntel" />;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={s.mark} />
      <span className={`font-headline font-semibold tracking-tight text-slate-900 ${s.text}`}>
        Doc<span className="text-indigo-600">Intel</span>
      </span>
    </span>
  );
}
