import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ShellLayout from '@/components/layout/ShellLayout';
import KnowledgeBaseComingSoon from './KnowledgeBaseComingSoon';

export const metadata = { title: 'Knowledge base' };

export default async function KnowledgeBasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/knowledge-base');
  }

  return (
    <ShellLayout userEmail={user.email || undefined} userName={user.user_metadata?.full_name || undefined}>
      <KnowledgeBaseComingSoon />
    </ShellLayout>
  );
}
