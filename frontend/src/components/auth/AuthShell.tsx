import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Hide "Back to home" for signed-in flows such as onboarding. */
  showBackLink?: boolean;
}

export function AuthShell({ title, subtitle, children, footer, showBackLink = true }: AuthShellProps) {
  return (
    <div className="min-h-dvh bg-[#f8fafc] flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between gap-4">
        <Link href="/" aria-label="DocIntel home" className="rounded-lg">
          <Logo />
        </Link>
        {showBackLink && (
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded px-1">
            <span aria-hidden="true">←</span> Back to home
          </Link>
        )}
      </header>
      <main id="main-content" className="flex-1 flex items-start sm:items-center justify-center px-4 pb-16 pt-4 sm:pt-0">
        <div className="w-full max-w-md bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 font-headline tracking-tight">{title}</h1>
            {subtitle && <p className="text-slate-500 text-sm mt-1.5">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function FormNotice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles = tone === 'error'
    ? 'text-red-700 bg-red-50 border-red-200'
    : 'text-emerald-800 bg-emerald-50 border-emerald-200';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`text-sm p-3 rounded-lg text-center border ${styles}`}>
      {children}
    </div>
  );
}

export const authInputClass =
  'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all text-sm shadow-sm';
