import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

const STYLES: Record<Toast['type'], string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-slate-950',
};

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertCircle } as const;

/**
 * The live region is always rendered (even when empty) so screen readers register it
 * before the first toast arrives; otherwise the first message is often not announced.
 */
export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:top-6 z-100 flex flex-col items-stretch sm:items-end gap-3 pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in sm:max-w-sm ${STYLES[toast.type]}`}
          >
            <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-m-1 p-1 rounded opacity-80 hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
