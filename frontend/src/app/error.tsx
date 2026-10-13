'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { StatusPage, statusLinkStyles } from '@/components/ui/StatusPage';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="min-h-dvh flex flex-col bg-slate-50">
      <StatusPage
        title="Something went wrong"
        description={<>An unexpected error stopped this page from loading. Try again, and if it keeps happening, come back in a few minutes.{error.digest && <><br /><span className="text-xs text-slate-400">Reference: {error.digest}</span></>}</>}
        actions={
          <>
            <button type="button" onClick={reset} className={statusLinkStyles.primary}>Try again</button>
            <Link href="/boxes" className={statusLinkStyles.secondary}>Go to your boxes</Link>
          </>
        }
      />
    </main>
  );
}
