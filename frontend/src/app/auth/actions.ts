'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/authMessages'
import { API_URL } from '@/lib/config'

/** Same-site path to return to after login; anything else (absolute or protocol-relative URLs) is ignored. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/boxes'
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const next = safeNextPath(formData.get('next'))
  const nextQuery = next === '/boxes' ? '' : `&next=${encodeURIComponent(next)}`

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=invalid_credentials${nextQuery}`)
  }

  revalidatePath('/', 'layout')

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
      redirect(next)
  } else {
      redirect(`/login?error=auth_failed${nextQuery}`)
  }
}

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  if (!fullName) return { ok: false, message: 'Enter a display name.' }
  if (fullName.length > 100) return { ok: false, message: 'Display name must be 100 characters or fewer.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
  if (error) return { ok: false, message: 'Could not save your name. Please try again.' }

  revalidatePath('/', 'layout')
  return { ok: true, message: 'Display name saved.' }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const fullName = formData.get('fullName') as string

  // Validate passwords match
  if (password !== confirmPassword) {
    redirect('/signup?error=password_mismatch')
  }

  // Validate password strength (also raise the minimum in Supabase Auth settings)
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    redirect('/signup?error=weak_password')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    // Generic on purpose: provider messages can reveal whether an email is registered.
    redirect('/signup?error=signup_failed')
  }

  // After signup, check if we have an active session
  // If email confirmation is enabled, session will be null until confirmed
  if (data.session) {
    redirect('/boxes')
  } else {
    redirect('/signup?success=check_email')
  }
}



export async function createBox(formData: FormData) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session || !session.access_token) {
      redirect('/login')
  }

  const boxName = String(formData.get('boxName') ?? '').trim()
  if (!boxName) {
      redirect('/onboarding?message=box_failed')
  }

  // redirect() throws, so the request and its outcome are resolved before redirecting.
  let target = '/onboarding?message=box_failed'
  try {
      const res = await fetch(`${API_URL}/api/v1/boxes/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ name: boxName })
      });
      if (res.ok) {
          const json = await res.json();
          target = `/boxes/${json.data.id}`
      } else if (res.status === 409) {
          target = '/onboarding?message=box_exists'
      } else if (res.status === 403) {
          target = '/onboarding?message=box_limit'
      }
  } catch {
      // Network failure: fall through to the generic message.
  }

  redirect(target)
}
