'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ text, loadingText, disabled = false }: { text: string, loadingText: string, disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg mt-2 transition-colors flex items-center justify-center gap-2 shadow-sm"
    >
      {pending ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        text
      )}
    </button>
  )
}
