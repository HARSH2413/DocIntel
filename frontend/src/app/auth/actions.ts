'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MIN_PASSWORD_LENGTH } from '@/lib/authMessages'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  revalidatePath('/', 'layout')
  
  // After login, go straight to boxes
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
      redirect('/boxes')
  } else {
      redirect('/login?error=auth_failed')
  }
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

  const boxName = formData.get('boxName') as string

  // Use the backend API to create the box
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const res = await fetch(`${API_URL}/api/v1/boxes/`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name: boxName.trim() })
  });

  if (!res.ok) {
      const code = res.status === 409 ? 'box_exists' : res.status === 403 ? 'box_limit' : 'box_failed';
      redirect(`/onboarding?message=${code}`)
  }

  const json = await res.json();
  const box = json.data;

  redirect(`/boxes/${box.id}`)
}
