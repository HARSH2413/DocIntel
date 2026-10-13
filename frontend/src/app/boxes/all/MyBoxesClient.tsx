"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, FileText, Folder, LayoutGrid, List, MessageSquare, MoreVertical, Plus, RefreshCw, Search, Star, Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { domainInfo } from '@/lib/boxDomains';
import { CREATE_BOX_EVENT, type Box } from '@/lib/types';
import { timeAgo, useLocalStorage, useNow } from '@/lib/useClientState';
import CreateBoxDialog from '@/components/boxes/CreateBoxDialog';
import { ConfirmDialog } from '@/components/ui/Dialog';

type Filter = 'all' | 'recent' | 'favorites';
const RECENT_DAYS = 7;

function DomainIcon({ domain, size = 20 }: { domain?: string | null; size?: number }) {
  const Icon = domainInfo(domain)?.icon ?? Folder;
  return <Icon size={size} aria-hidden="true" />;
}

function BoxMenu({ box, favorite, onToggleFavorite, onDelete }: {
  box: Box; favorite: boolean; onToggleFavorite: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = `box-menu-${box.id}`;

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      e.preventDefault();
      items[next]?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'w-full flex items-center gap-2 px-3 py-2 text-left focus:outline-none focus:bg-slate-50';

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`More actions for ${box.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={`${box.name} actions`} className="absolute right-0 top-9 z-20 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-sm">
          <button type="button" role="menuitem" onClick={() => { onToggleFavorite(); setOpen(false); }} className={`${item} text-slate-700 hover:bg-slate-50`}>
            <Star size={14} className={favorite ? 'fill-amber-400 text-amber-400' : ''} aria-hidden="true" />
            {favorite ? 'Remove from favorites' : 'Add to favorites'}
          </button>
          <Link role="menuitem" href={`/boxes/${box.id}`} className={`${item} text-slate-700 hover:bg-slate-50`}>
            <FileText size={14} aria-hidden="true" /> Manage documents
          </Link>
          <div className="my-1 border-t border-slate-100" role="separator" />
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete(); }} className={`${item} text-red-600 hover:bg-red-50 focus:bg-red-50`}>
            <Trash2 size={14} aria-hidden="true" /> Delete box
          </button>
        </div>
      )}
    </div>
  );
}

function FavoriteButton({ box, favorite, onToggle }: { box: Box; favorite: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${box.name} from favorites` : `Add ${box.name} to favorites`}
      className="p-1.5 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-50 transition-colors"
    >
      <Star size={16} className={favorite ? 'fill-amber-400 text-amber-400' : ''} aria-hidden="true" />
    </button>
  );
}

export default function MyBoxesClient() {
  const router = useRouter();
  const now = useNow();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useLocalStorage<'grid' | 'list'>('docintel:boxes-view', 'grid');
  const [favorites, setFavorites] = useLocalStorage<string[]>('docintel:favorite-boxes', []);
  const [createOpen, setCreateOpen] = useState(false);
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
    const open = () => setCreateOpen(true);
    window.addEventListener(CREATE_BOX_EVENT, open);
    return () => window.removeEventListener(CREATE_BOX_EVENT, open);
  }, []);

  const retry = () => { setLoading(true); setLoadError(null); setReloadKey(k => k + 1); };

  const toggleFavorite = (id: string) =>
    setFavorites(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));

  const deleteBox = async (box: Box) => {
    await apiFetch(`/api/v1/boxes/${box.id}`, { method: 'DELETE' });
    setBoxes(prev => prev.filter(b => b.id !== box.id));
    setFavorites(prev => prev.filter(f => f !== box.id));
  };

  const q = query.trim().toLowerCase();
  const lastActivity = (b: Box) => new Date(b.updated_at || b.created_at).getTime();
  let visible = boxes.filter(b =>
    !q ||
    b.name.toLowerCase().includes(q) ||
    (b.description || '').toLowerCase().includes(q) ||
    (domainInfo(b.domain)?.label || '').toLowerCase().includes(q)
  );
  if (filter === 'favorites') visible = visible.filter(b => favorites.includes(b.id));
  if (filter === 'recent') {
    const cutoff = now - RECENT_DAYS * 86_400_000;
    visible = visible.filter(b => lastActivity(b) >= cutoff).sort((a, b) => lastActivity(b) - lastActivity(a));
  }

  const favoriteCount = favorites.filter(f => boxes.some(b => b.id === f)).length;
  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: boxes.length },
    { key: 'recent', label: 'Recent' },
    { key: 'favorites', label: 'Favorites', count: favoriteCount },
  ];

  const emptyTitle = q ? 'No boxes match your search'
    : filter === 'favorites' ? 'No favorites yet'
      : filter === 'recent' ? `Nothing in the last ${RECENT_DAYS} days`
        : 'No boxes yet';
  const emptyHint = q ? 'Try a different search term.'
    : filter === 'favorites' ? 'Use the star on a box to pin it here.'
      : filter === 'recent' ? 'Boxes you create or update will appear here.'
        : 'Create a box, add documents, then ask questions about them.';

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-10 py-8 md:py-10 max-w-6xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 font-headline">My boxes</h1>
          <p className="text-sm text-slate-500 mt-1">All your document workspaces.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors shrink-0"
        >
          <Plus size={16} aria-hidden="true" /> New box
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1" role="group" aria-label="Filter boxes">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === f.key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`text-xs tabular-nums ${filter === f.key ? 'text-indigo-500' : 'text-slate-400'}`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <label htmlFor="my-boxes-search" className="sr-only">Search boxes</label>
            <input
              id="my-boxes-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search boxes…"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200 shrink-0" role="group" aria-label="Layout">
            <button type="button" onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Grid view" className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              <LayoutGrid size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="List view" className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
              <List size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading boxes">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-52 rounded-xl bg-white border border-slate-200 p-5 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-100 mb-4" />
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-3" />
              <div className="h-3 w-full bg-slate-100 rounded" />
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
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl bg-white">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
            {filter === 'favorites' ? <Star size={22} aria-hidden="true" /> : <Folder size={22} aria-hidden="true" />}
          </div>
          <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">{emptyHint}</p>
          {filter === 'all' && !q && (
            <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
              <Plus size={14} aria-hidden="true" /> Create box
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map(box => {
            const fav = favorites.includes(box.id);
            const domain = domainInfo(box.domain);
            return (
              <li key={box.id} className="group relative flex flex-col justify-between bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06)] transition-all duration-200 p-5">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <DomainIcon domain={box.domain} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <FavoriteButton box={box} favorite={fav} onToggle={() => toggleFavorite(box.id)} />
                      <BoxMenu box={box} favorite={fav} onToggleFavorite={() => toggleFavorite(box.id)} onDelete={() => setPendingDelete(box)} />
                    </div>
                  </div>
                  <h2 className="text-base font-semibold text-slate-900 tracking-tight line-clamp-1">
                    <Link href={`/boxes/${box.id}`} className="hover:text-indigo-700 transition-colors">{box.name}</Link>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed min-h-11">
                    {box.description || 'No description'}
                  </p>
                  {domain && (
                    <span className="inline-block mt-3 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{domain.label}</span>
                  )}
                </div>
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
                    <FileText size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                    <span>{box.document_count ?? 0} {box.document_count === 1 ? 'doc' : 'docs'}</span>
                    {timeAgo(box.updated_at || box.created_at, now) && <>
                      <span className="text-slate-300" aria-hidden="true">•</span>
                      <span className="truncate">{timeAgo(box.updated_at || box.created_at, now)}</span>
                    </>}
                  </div>
                  <Link href={`/boxes/${box.id}?view=chat`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shrink-0">
                    <MessageSquare size={12} aria-hidden="true" /> Chat
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {visible.map(box => {
            const fav = favorites.includes(box.id);
            const domain = domainInfo(box.domain);
            return (
              <li key={box.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <DomainIcon domain={box.domain} size={18} />
                </div>
                <Link href={`/boxes/${box.id}`} className="flex-1 min-w-0 group">
                  <span className="block text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{box.name}</span>
                  <span className="block text-xs text-slate-500 truncate">{box.description || 'No description'}</span>
                </Link>
                {domain && <span className="hidden md:inline px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 shrink-0">{domain.label}</span>}
                <span className="hidden sm:inline text-xs text-slate-500 w-16 text-right shrink-0 tabular-nums">{box.document_count ?? 0} docs</span>
                <span className="hidden lg:inline text-xs text-slate-400 w-20 text-right shrink-0">{timeAgo(box.updated_at || box.created_at, now)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <FavoriteButton box={box} favorite={fav} onToggle={() => toggleFavorite(box.id)} />
                  <Link href={`/boxes/${box.id}?view=chat`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium">
                    <MessageSquare size={12} aria-hidden="true" /> Chat
                  </Link>
                  <BoxMenu box={box} favorite={fav} onToggleFavorite={() => toggleFavorite(box.id)} onDelete={() => setPendingDelete(box)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !loadError && boxes.length > 0 && (
        <p className="pt-4 text-xs text-slate-500 border-t border-slate-200" aria-live="polite">
          Showing {visible.length} of {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}
        </p>
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
