import type { Metadata } from 'next'
import { createBox } from '../auth/actions'
import { authMessage } from '@/lib/authMessages'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { AuthShell, FormNotice, authInputClass } from '@/components/auth/AuthShell'

export const metadata: Metadata = { title: 'Create your first box' }

export default async function OnboardingPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  const searchParams = await props.searchParams
  const message = authMessage(searchParams?.message)

  return (
    <AuthShell
      title="Create your first box"
      subtitle="A box holds related documents you want to ask questions about."
      showBackLink={false}
    >
      <form action={createBox} className="flex flex-col gap-4">
        {message && <FormNotice tone="error">{message}</FormNotice>}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-700 font-semibold" htmlFor="boxName">Box name</label>
          <input
            id="boxName"
            name="boxName"
            className={authInputClass}
            placeholder="e.g. Q4 acquisition due diligence"
            type="text"
            maxLength={100}
            autoComplete="off"
            required
          />
        </div>
        <SubmitButton text="Continue" loadingText="Creating box…" />
      </form>
    </AuthShell>
  )
}
