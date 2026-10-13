"use client";

import React from 'react';
import { Check, FileText, Loader2, X } from 'lucide-react';
import { Dialog, buttonStyles } from '@/components/ui/Dialog';

/**
 * uploading  – the file is being sent to the server
 * processing – the server accepted it and is extracting/indexing text in the background
 * ready      – the document list reports it as completed
 * failed     – the upload was rejected or background processing failed
 */
export type UploadFileStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface UploadFileItem {
  filename: string;
  size: number;
  status: UploadFileStatus;
  message?: string;
}

interface UploadProgressModalProps {
  isOpen: boolean;
  boxName: string;
  files: UploadFileItem[];
  onClose: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABEL: Record<UploadFileStatus, string> = {
  uploading: 'Uploading…',
  processing: 'Processing — extracting and indexing text',
  ready: 'Ready',
  failed: 'Failed',
};

function StatusIcon({ status }: { status: UploadFileStatus }) {
  if (status === 'ready') {
    return (
      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
        <Check className="w-4 h-4" aria-hidden="true" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <X className="w-4 h-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
    </span>
  );
}

export default function UploadProgressModal({ isOpen, boxName, files, onClose }: UploadProgressModalProps) {
  const total = files.length;
  const ready = files.filter(f => f.status === 'ready').length;
  const failed = files.filter(f => f.status === 'failed').length;
  const inProgress = total - ready - failed;

  const summary = inProgress > 0
    ? `${ready} of ${total} ready${failed ? `, ${failed} failed` : ''}. ${inProgress} still in progress.`
    : `${ready} of ${total} ready${failed ? `, ${failed} failed` : ''}.`;

  return (
    <Dialog
      open={isOpen && total > 0}
      onClose={onClose}
      size="lg"
      title={`Adding documents to ${boxName}`}
      description="Processing continues in the background, so you can close this window. Status also shows in the documents list."
      footer={
        <button type="button" onClick={onClose} className={inProgress > 0 ? buttonStyles.secondary : buttonStyles.primary}>
          {inProgress > 0 ? 'Continue in background' : 'Done'}
        </button>
      }
    >
      <p className="text-sm font-medium text-slate-700 mb-4" role="status">{summary}</p>
      <ul className="space-y-2.5">
        {files.map(file => (
          <li key={file.filename} className="p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0" aria-hidden="true">
              <FileText className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate" title={file.filename}>{file.filename}</p>
              <p className={`text-xs mt-0.5 ${file.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>
                {formatFileSize(file.size)} · {file.status === 'failed' && file.message ? file.message : STATUS_LABEL[file.status]}
              </p>
            </div>
            <StatusIcon status={file.status} />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
