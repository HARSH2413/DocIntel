'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Loader2, Upload, Search, FileText, FileType2, Trash2,
  ChevronLeft, ChevronRight, MessageSquare,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/Dialog';

export interface DocumentRecord {
  id: string;
  filename: string;
  file_hash?: string;
  created_at?: string;
  status?: 'processing' | 'indexed' | 'failed' | 'completed';
  error_message?: string;
}

/** Optimistic rows added while a file uploads use this id prefix until the list refreshes. */
export const PENDING_DOCUMENT_PREFIX = 'pending-';

const PAGE_SIZE = 10;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status?: DocumentRecord['status'] }) {
  const styles = status === 'processing'
    ? { box: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500 animate-pulse', label: 'Processing' }
    : status === 'failed'
      ? { box: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-500', label: 'Failed' }
      : { box: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500', label: 'Ready' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${styles.box}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      {styles.label}
    </span>
  );
}

export function KnowledgeBaseView({
  boxName,
  documents,
  isUploading,
  onUploadClick,
  onDeleteFile,
  onFilesSelected,
  onOpenChat,
}: {
  boxName?: string;
  documents: DocumentRecord[];
  isUploading: boolean;
  onUploadClick: () => void;
  /** Rejects with a user-facing Error when the delete fails. */
  onDeleteFile: (documentId: string) => Promise<void>;
  onFilesSelected: (files: FileList | File[]) => void;
  onOpenChat?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);

  const filtered = documents
    .filter((d) => d.filename.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const fileType = (filename: string) => filename.split('.').pop()?.toUpperCase() || 'FILE';
  const startIdx = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, filtered.length);
  const usableCount = documents.filter(d => d.status !== 'failed').length;
  const processingCount = documents.filter(d => d.status === 'processing').length;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto bg-slate-50">
      <header className="flex justify-between items-center gap-3 h-14 px-4 sm:px-6 w-full bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-2 text-sm text-slate-500 font-medium min-w-0">
            <li className="shrink-0"><Link href="/boxes/all" className="hover:text-slate-900 transition-colors">My boxes</Link></li>
            <li aria-hidden="true" className="text-slate-300">/</li>
            <li className="min-w-0"><span className="block text-slate-900 font-semibold truncate" aria-current="page">{boxName}</span></li>
          </ol>
        </nav>
        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span>Ask questions</span>
          </button>
        )}
      </header>

      <div className="flex-1 px-4 py-6 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
            <p className="text-sm text-slate-500 mt-1">Upload files to this box, then ask questions and get answers with cited sources.</p>
          </div>
          {processingCount > 0 && (
            <p className="flex items-center gap-2 text-xs text-amber-800" role="status">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Processing {processingCount} document{processingCount === 1 ? '' : 's'}…
            </p>
          )}
        </div>

        {onOpenChat && (
          <section className="relative overflow-hidden rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-md shadow-indigo-200/60">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0" aria-hidden="true">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline text-base font-semibold text-white">Ask questions about your documents</h2>
                <p className="text-sm text-indigo-100 mt-0.5">
                  {usableCount > 0
                    ? `Answers come from the ${usableCount} document${usableCount === 1 ? '' : 's'} in this box, with links to the passages they cite.`
                    : 'Upload a document first, then ask about it here.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-indigo-700 text-sm font-semibold shadow-sm hover:bg-indigo-50 transition-colors focus-visible:outline-white shrink-0"
            >
              Start a conversation
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </section>
        )}

        <section
          aria-label="Upload documents"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) onFilesSelected(e.dataTransfer.files);
          }}
          className={`rounded-xl bg-white border border-dashed px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-colors ${dragging ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-300 hover:border-indigo-300'}`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0" aria-hidden="true">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Drag files here, or choose files to upload</p>
              <p className="text-xs text-slate-500">PDF, DOCX, TXT, CSV or XLSX · up to 25 MB each</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isUploading}
            aria-busy={isUploading}
            className="shrink-0 flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold transition-colors hover:bg-indigo-700 shadow-sm disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
            {isUploading ? 'Uploading…' : 'Choose files'}
          </button>
        </section>

        <section aria-labelledby="documents-table-heading" className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <h2 id="documents-table-heading" className="sr-only">Documents in this box</h2>
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" aria-hidden="true" />
              <label htmlFor="document-filter" className="sr-only">Filter documents by name</label>
              <input
                id="document-filter"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-colors"
                placeholder="Filter by name"
                type="search"
              />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              {documents.length} document{documents.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 text-xs font-medium">
                  <th scope="col" className="py-3 px-4 sm:px-5">Name</th>
                  <th scope="col" className="py-3 px-4 w-24 hidden sm:table-cell">Type</th>
                  <th scope="col" className="py-3 px-4 w-32 hidden md:table-cell">Added</th>
                  <th scope="col" className="py-3 px-4 w-32">Status</th>
                  <th scope="col" className="py-3 px-4 sm:px-5 w-16"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center text-slate-500">
                      {documents.length === 0 ? 'No documents yet. Upload a file to get started.' : 'No documents match your filter.'}
                    </td>
                  </tr>
                ) : pageItems.map((doc) => {
                  const type = fileType(doc.filename);
                  const pending = doc.id.startsWith(PENDING_DOCUMENT_PREFIX);
                  return (
                    <tr key={doc.id || doc.filename} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 sm:px-5">
                        <div className="flex items-center gap-3 min-w-0">
                          {type === 'PDF'
                            ? <FileType2 className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />
                            : <FileText className="w-5 h-5 text-indigo-600 shrink-0" aria-hidden="true" />}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-56 sm:max-w-xs md:max-w-md" title={doc.filename}>
                              {doc.filename}
                            </p>
                            {doc.status === 'failed' && doc.error_message && (
                              <p className="text-xs text-rose-700 mt-0.5">{doc.error_message}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium font-mono">{type}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 hidden md:table-cell">{formatDate(doc.created_at)}</td>
                      <td className="py-3 px-4"><StatusBadge status={doc.status} /></td>
                      <td className="py-3 px-4 sm:px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingDelete(doc)}
                          disabled={pending}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          aria-label={`Delete ${doc.filename}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <nav aria-label="Documents pagination" className="px-4 sm:px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
              <span>Showing {startIdx}–{endIdx} of {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="px-2 text-slate-700 font-medium" aria-current="page">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete document?"
        description={<>“{pendingDelete?.filename}” and its indexed text will be removed from this box. Answers will no longer cite it. This can’t be undone.</>}
        confirmLabel="Delete document"
        destructive
        onConfirm={() => onDeleteFile(pendingDelete!.id)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
