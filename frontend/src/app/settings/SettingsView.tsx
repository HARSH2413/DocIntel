"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, Lock, ShieldCheck, Trash2, User } from 'lucide-react';
import { updateProfile } from '@/app/auth/actions';

const inputClass =
  'w-full max-w-md bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 transition-colors';

// What the platform does for every account. These are fixed behaviours, so they are
// described as facts rather than shown as toggles the user cannot actually change.
const DATA_HANDLING = [
  {
    icon: FileCheck2,
    title: 'Answers cite their sources',
    body: 'Every answer links back to the passages it was drawn from. If your documents don’t cover a question, DocIntel says so instead of guessing.',
  },
  {
    icon: Trash2,
    title: 'Original files are not kept',
    body: 'Uploaded files are deleted once their text has been extracted and indexed. Deleting a document removes its indexed text too.',
  },
  {
    icon: Lock,
    title: 'Boxes are private and isolated',
    body: 'Only your account can open your boxes, and questions in one box never search documents in another.',
  },
];

export default function SettingsView({ userEmail, userName }: { userEmail: string; userName: string }) {
  const router = useRouter();
  const [name, setName] = useState(userName);
  const [savedName, setSavedName] = useState(userName);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = name.trim();
  const unchanged = trimmed === savedName.trim();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus(null);
    startTransition(async () => {
      const result = await updateProfile(formData);
      setStatus(result);
      if (result.ok) {
        setSavedName(trimmed);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-10 py-8 md:py-12 max-w-3xl w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 font-headline mb-2">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account and see how your documents are handled.</p>
      </div>

      <section aria-labelledby="account-heading" className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center" aria-hidden="true">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 id="account-heading" className="text-base font-semibold text-slate-900 font-headline">Account</h2>
            <p className="text-xs text-slate-500">Your personal account information.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="settings-name" className="text-sm font-semibold text-slate-900 block mb-1.5">Display name</label>
            <input
              id="settings-name"
              name="fullName"
              className={inputClass}
              value={name}
              onChange={e => { setName(e.target.value); setStatus(null); }}
              placeholder="Your name"
              autoComplete="name"
              maxLength={100}
              required
              aria-invalid={status && !status.ok ? true : undefined}
              aria-describedby={status ? 'settings-name-status' : undefined}
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="text-sm font-semibold text-slate-900 block mb-1.5">Email</label>
            <input
              id="settings-email"
              className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-600"
              value={userEmail}
              readOnly
              aria-describedby="settings-email-hint"
            />
            <p id="settings-email-hint" className="text-xs text-slate-500 mt-1.5">Your sign-in email can’t be changed here.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending || unchanged || !trimmed}
              aria-busy={pending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />}
              {pending ? 'Saving…' : 'Save changes'}
            </button>
            <p
              id="settings-name-status"
              role={status && !status.ok ? 'alert' : 'status'}
              className={`text-sm ${status?.ok ? 'text-emerald-700' : 'text-red-600'}`}
            >
              {status?.message}
            </p>
          </div>
        </form>
      </section>

      <section aria-labelledby="data-heading" className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center" aria-hidden="true">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 id="data-heading" className="text-base font-semibold text-slate-900 font-headline">How your documents are handled</h2>
            <p className="text-xs text-slate-500">These apply to every box in your account.</p>
          </div>
        </div>

        <ul className="space-y-5">
          {DATA_HANDLING.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
