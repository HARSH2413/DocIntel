import Link from 'next/link';
import { Library } from 'lucide-react';

export default function KnowledgeBaseComingSoon() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        <div className="w-16 h-16 mb-6 rounded-2xl bg-white border border-slate-200 shadow-sm ring-4 ring-indigo-50 flex items-center justify-center text-indigo-600" aria-hidden="true">
          <Library size={30} />
        </div>

        <p className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-4 text-xs font-medium text-indigo-700">
          Coming soon
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-3 font-headline">
          Knowledge base
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-sm">
          Searching across all of your boxes at once isn’t available yet. For now, each box is searched on its own, so ask your question inside the box that holds the relevant documents.
        </p>

        <Link
          href="/boxes/all"
          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Go to my boxes
        </Link>
      </div>
    </div>
  );
}
