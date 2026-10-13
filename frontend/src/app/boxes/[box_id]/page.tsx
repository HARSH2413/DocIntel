import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { API_URL } from '@/lib/config'
import { StatusPage, statusLinkStyles } from '@/components/ui/StatusPage'
import ChatDashboard from '@/app/workspace/chat/ChatDashboard'

export default async function BoxChatPage({ params }: { params: Promise<{ box_id: string }> }) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  const { box_id: boxId } = await params;

  if (!session || !session.access_token) {
      redirect(`/login?next=${encodeURIComponent(`/boxes/${boxId}`)}`)
  }

  // Fetch the box using the backend API
  let box: { name: string } | null = null;
  let statusCode: number | null = null;

  try {
      const res = await fetch(`${API_URL}/api/v1/boxes/${boxId}`, {
          headers: {
              'Authorization': `Bearer ${session.access_token}`
          },
          cache: 'no-store'
      });

      statusCode = res.status;

      if (res.ok) {
          const json = await res.json();
          box = json.data;
      } else {
          console.error(`Box fetch failed: ${res.status} ${res.statusText} - ${await res.text()}`);
      }
  } catch (err) {
      console.error("Network Error fetching box:", err);
  }

  if (!box) {
      // 403 and 404 look the same on purpose: don't reveal whether someone else's box exists.
      const missing = statusCode === 404 || statusCode === 403
      return (
        <StatusPage
          eyebrow={missing ? undefined : 'Connection problem'}
          title={missing ? 'Box not found' : 'Couldn’t load this box'}
          description={missing
            ? 'This box doesn’t exist, was deleted, or belongs to another account.'
            : 'The server didn’t respond as expected. Check your connection and try again in a moment.'}
          actions={
            <>
              {!missing && <Link href={`/boxes/${boxId}`} className={statusLinkStyles.primary}>Try again</Link>}
              <Link href="/boxes/all" className={missing ? statusLinkStyles.primary : statusLinkStyles.secondary}>Go to my boxes</Link>
            </>
          }
        />
      )
  }

  return (
    <ChatDashboard boxId={boxId} boxName={box.name} />
  )
}
