-- ====================================================================
-- Migration: Security hardening
-- ====================================================================
-- Run after 20261011_drop_unused_objects.sql. Every statement is idempotent.

-- 1. Lock the dense-search RPC to the backend.
--    Supabase grants EXECUTE on new public functions to anon and authenticated
--    explicitly, so the earlier "REVOKE ... FROM PUBLIC" left it callable by
--    anyone holding the public anon key (RLS was the only thing stopping it).
REVOKE EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) TO service_role;

--    Future functions in public are no longer auto-executable by browser roles.
--    The frontend calls no RPCs; grant explicitly if one is ever meant to be public.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 2. Users may write their own chat rows directly through PostgREST with their JWT.
--    Only 'user'/'assistant' rows are legitimate; a self-inserted 'system' row would
--    otherwise be replayed to the LLM as a system instruction. (The backend uses the
--    service role and is unaffected; it also filters history to these two roles.)
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages FOR INSERT WITH CHECK (
    role IN ('user', 'assistant')
    AND session_id IN (SELECT id FROM public.chat_sessions WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "chat_messages_update_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_update_policy" ON public.chat_messages FOR UPDATE USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
) WITH CHECK (
    role IN ('user', 'assistant')
    AND session_id IN (SELECT id FROM public.chat_sessions WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);
