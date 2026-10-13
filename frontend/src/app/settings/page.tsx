import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ShellLayout from '@/components/layout/ShellLayout';
import SettingsView from './SettingsView';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/settings');
  }

  return (
    <ShellLayout userEmail={user.email || undefined} userName={user.user_metadata?.full_name || undefined}>
      <SettingsView userEmail={user.email || ''} userName={user.user_metadata?.full_name || ''} />
    </ShellLayout>
  );
}
