'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '../auth/actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { AuthShell, FormNotice, authInputClass } from '@/components/auth/AuthShell'
import { authMessage, MIN_PASSWORD_LENGTH } from '@/lib/authMessages'

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string, success?: string }>
}) {
  const params = React.use(searchParams)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const hasBoth = password.length > 0 && confirmPassword.length > 0
  const mismatch = hasBoth && password !== confirmPassword
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH
  const error = authMessage(params?.error)
  const success = authMessage(params?.success)

  const borderFor = (invalid: boolean) =>
    invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''

  return (
    <AuthShell
      title="Create your account"
      subtitle="Ask questions about your documents and get cited answers"
      footer={<>Already have an account?{' '}<Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">Log in</Link></>}
    >
      {success ? (
        <FormNotice tone="success">{success}</FormNotice>
      ) : (
        <form action={signup} onSubmit={e => { if (mismatch || tooShort) e.preventDefault() }} className="flex flex-col gap-4">
          {error && <FormNotice tone="error">{error}</FormNotice>}

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700 font-semibold" htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" className={authInputClass} placeholder="Jane Doe" type="text" autoComplete="name" maxLength={100} required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700 font-semibold" htmlFor="email">Email</label>
            <input id="email" name="email" className={authInputClass} placeholder="you@example.com" type="email" autoComplete="email" required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700 font-semibold" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                className={`${authInputClass} pr-12 ${borderFor(tooShort)}`}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                type={showPassword ? 'text' : 'password'}
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-describedby="password-hint"
                aria-invalid={tooShort || undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            <p id="password-hint" className={`text-xs ${tooShort ? 'text-red-600' : 'text-slate-500'}`}>
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-700 font-semibold" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              className={`${authInputClass} ${borderFor(mismatch)}`}
              placeholder="Repeat your password"
              type={showPassword ? 'text' : 'password'}
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              aria-describedby="confirm-hint"
              aria-invalid={mismatch || undefined}
              required
            />
            <p id="confirm-hint" aria-live="polite" className={`text-xs min-h-4 ${mismatch ? 'text-red-600' : 'text-emerald-700'}`}>
              {mismatch ? 'Passwords don’t match.' : hasBoth ? 'Passwords match.' : ''}
            </p>
          </div>

          <SubmitButton text="Create account" loadingText="Creating account…" disabled={mismatch || tooShort} />
        </form>
      )}
    </AuthShell>
  )
}
