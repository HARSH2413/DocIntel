'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '../auth/actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { AuthShell, FormNotice, authInputClass } from '@/components/auth/AuthShell'
import { authMessage } from '@/lib/authMessages'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string, success?: string, next?: string }>
}) {
  const params = React.use(searchParams)
  const [showPassword, setShowPassword] = useState(false)
  const error = authMessage(params?.error)
  const success = authMessage(params?.success)

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your DocIntel account"
      footer={<>Don&apos;t have an account?{' '}<Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold">Create one</Link></>}
    >
      <form action={login} className="flex flex-col gap-4">
        {/* Where to return after sign-in; validated server-side to same-site paths only. */}
        <input type="hidden" name="next" value={params?.next ?? ''} />

        {error && <FormNotice tone="error">{error}</FormNotice>}
        {success && <FormNotice tone="success">{success}</FormNotice>}

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-700 font-semibold" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            className={authInputClass}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            required
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-700 font-semibold" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              className={`${authInputClass} pr-12`}
              placeholder="Your password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <SubmitButton text="Log in" loadingText="Logging in…" />
      </form>
    </AuthShell>
  )
}
