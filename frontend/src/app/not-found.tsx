import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPage, statusLinkStyles } from '@/components/ui/StatusPage';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main-content" className="min-h-dvh flex flex-col bg-slate-50">
      <StatusPage
        eyebrow="404"
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        actions={
          <>
            <Link href="/boxes" className={statusLinkStyles.primary}>Go to your boxes</Link>
            <Link href="/" className={statusLinkStyles.secondary}>Home</Link>
          </>
        }
      />
    </main>
  );
}
