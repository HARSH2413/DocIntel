'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { BOX_DOMAINS } from '@/lib/boxDomains';
import type { Box } from '@/lib/types';
import { Dialog, buttonStyles } from '@/components/ui/Dialog';

const NAME_MAX = 100;        // BoxCreate.name max_length
const DESCRIPTION_MAX = 1000; // BoxCreate.description max_length

const fieldClass =
  'w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-all';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (box: Box) => void;
}

export default function CreateBoxDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const close = () => {
    if (submitting) return;
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = { name: name.trim(), domain };
      if (description.trim()) body.description = description.trim();
      const res = await apiFetch<{ data: Box }>('/api/v1/boxes/', { method: 'POST', body: JSON.stringify(body) });
      setName('');
      setDescription('');
      setDomain('general');
      onCreated(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the box. Please try again.');
      nameRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a box"
      description="A box is a private workspace: upload documents to it, then ask questions about them."
      initialFocusRef={nameRef}
      dismissible={!submitting}
      footer={
        <>
          <button type="button" onClick={close} disabled={submitting} className={buttonStyles.secondary}>Cancel</button>
          <button type="submit" form="create-box-form" disabled={submitting || !name.trim()} className={buttonStyles.primary}>
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Creating…' : 'Create box'}
          </button>
        </>
      }
    >
      <form id="create-box-form" onSubmit={submit} className="space-y-5" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="box-name" className="text-sm font-medium text-slate-900">
              Name <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <span className="text-xs text-slate-400 tabular-nums" aria-hidden="true">{name.length}/{NAME_MAX}</span>
          </div>
          <input
            ref={nameRef}
            id="box-name"
            className={fieldClass}
            placeholder="e.g. Q4 acquisition due diligence"
            maxLength={NAME_MAX}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            aria-required="true"
            aria-invalid={error ? true : undefined}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="box-domain" className="text-sm font-medium text-slate-900">Category</label>
          <select id="box-domain" className={fieldClass} value={domain} onChange={e => setDomain(e.target.value)} aria-describedby="box-domain-hint">
            {BOX_DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <p id="box-domain-hint" className="text-xs text-slate-500">Helps you organise and find your boxes.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="box-description" className="text-sm font-medium text-slate-900">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="box-description"
            className={`${fieldClass} resize-none`}
            placeholder="What kind of documents will this box hold?"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Only you can see this box, its documents and its conversations.
        </p>
      </form>
    </Dialog>
  );
}
