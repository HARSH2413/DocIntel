"use client";

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowUpRight, FileText, FolderPlus, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { domainInfo } from '@/lib/boxDomains';
import { CREATE_BOX_EVENT, type Box } from '@/lib/types';
import { timeAgo, useNow } from '@/lib/useClientState';
import CreateBoxDialog from '@/components/boxes/CreateBoxDialog';
import { ConfirmDialog } from '@/components/ui/Dialog';

function greetingFor(hour: number) {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const noopSubscribe = () => () => {};

export default function BoxesClient({ userName = '' }: { userName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useNow();
  // The greeting depends on the viewer's clock, so it is only computed in the browser.
  const greeting = useSyncExternalStore(noopSubscribe, () => greetingFor(new Date().getHours()), () => '');

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('new') === '1');
  const [pendingDelete, setPendingDelete] = useState<Box | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: Box[] }>('/api/v1/boxes/')
      .then(res => { if (!cancelled) { setBoxes(res.data || []); setLoadError(null); } })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load your boxes.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    // ?new=1 (from the sidebar on another page) is consumed once; drop it so a refresh doesn't reopen the dialog.
    if (searchParams.get('new') === '1') window.history.replaceState(null, '', '/boxes');
    const open = () => setCreateOpen(true);
    window.addEventListener(CREATE_BOX_EVENT, open);
    return () => window.removeEventListener(CREATE_BOX_EVENT, open);
  }, [searchParams]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey(k => k + 1);
  };

  // Errors propagate to ConfirmDialog, which shows them inside the dialog.
  const deleteBox = async (box: Box) => {
    await apiFetch(`/api/v1/boxes/${box.id}`, { method: 'DELETE' });
    setBoxes(prev => prev.filter(b => b.id !== box.id));
  };

  const q = query.trim().toLowerCase();
  const visible = boxes
    .filter(b => !q || b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-10 py-8 md:py-12 max-w-5xl w-full mx-auto">
      <section className="mb-8 md:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 font-headline mb-2 min-h-8">
          {greeting ? `${greeting}${userName ? `, ${userName}` : ''}` : 'Welcome back'}
        </h1>
        <p className="text-sm text-slate-500">Open a box to ask questions about its documents, or create a new one.</p>
      </section>

      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <label htmlFor="dashboard-search" className="sr-only">Search boxes</label>
          <input
            id="dashboard-search"
            type="search"
            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 focus:outline-none transition-all shadow-sm"
            placeholder="Search boxes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shrink-0 shadow-sm"
        >
          <Plus size={16} aria-hidden="true" />
          Create box
        </button>
      </section>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{q ? 'Search results' : 'Recent boxes'}</h2>
        {boxes.length > 0 && (
          <Link href="/boxes/all" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading boxes">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-xl bg-white border border-slate-200 p-5 animate-pulse">
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-3" />
              <div className="h-3 w-full bg-slate-100 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-center text-center p-12 border border-red-200 rounded-xl bg-red-50/50">
          <AlertCircle size={24} className="text-red-500 mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900">Couldn’t load your boxes</p>
          <p className="text-sm text-slate-500 mt-1">{loadError}</p>
          <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700">
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center p-12 md:p-16 border-2 border-dashed border-slate-200 rounded-xl bg-white">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FolderPlus size={22} aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-800 mb-1 font-headline">
            {boxes.length ? 'No boxes match your search' : 'Create your first box'}
          </p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {boxes.length ? 'Try a different name or clear the search.' : 'Add documents to a box, then ask questions and get answers with cited sources.'}
          </p>
          {!boxes.length && (
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm">
              <Plus size={16} aria-hidden="true" /> Create box
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.slice(0, q ? undefined : 6).map(box => {
            const domain = domainInfo(box.domain);
            return (
              <li key={box.id} className="group relative h-40 p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm focus-within:border-indigo-300 transition-all flex flex-col justify-between">
                <div className="min-w-0 pr-8">
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight line-clamp-1 font-headline group-hover:text-indigo-700 transition-colors">
                    {/* Stretched link: the whole card is clickable, the delete button stays a separate control. */}
                    <Link href={`/boxes/${box.id}`} className="after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-indigo-600">
                      {box.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-1">
                    {box.description || (domain ? `${domain.label} documents` : 'No description')}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-400" aria-hidden="true" />
                    {box.document_count ?? 0} {box.document_count === 1 ? 'document' : 'documents'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    {timeAgo(box.updated_at || box.created_at, now) || ' '}
                    <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity" aria-hidden="true" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(box)}
                  aria-label={`Delete ${box.name}`}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CreateBoxDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(box) => {
          setCreateOpen(false);
          setBoxes(prev => [box, ...prev]);
          router.push(`/boxes/${box.id}`);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this box?"
        description={pendingDelete && <>“{pendingDelete.name}”, its documents and its conversations will be permanently deleted.</>}
        confirmLabel="Delete box"
        destructive
        onConfirm={() => (pendingDelete ? deleteBox(pendingDelete) : undefined)}
      />
    </div>
  );
}
