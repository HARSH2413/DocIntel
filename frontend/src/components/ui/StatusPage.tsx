import { LogoMark } from '@/components/brand/Logo';

/** Centered branded message used for not-found, error and access states. */
export function StatusPage({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md flex flex-col items-center">
        <LogoMark className="w-12 h-12 mb-6" />
        {eyebrow && <p className="text-sm font-semibold text-indigo-600 mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-headline mb-2">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </div>
    </div>
  );
}

export const statusLinkStyles = {
  primary: 'inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors',
  secondary: 'inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors',
} as const;
