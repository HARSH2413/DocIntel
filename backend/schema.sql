-- =====================================================================
-- DocIntel — complete database schema (single file)
-- =====================================================================
-- Target: Supabase (PostgreSQL 15+ with the pgvector extension).
-- Run once in the Supabase SQL Editor.
--
-- This file is the merged end state of the former schema_phase1b,
-- schema_phase1c_domain and schema_phase1e_dense files and the
-- 20261010–20261013 migrations. Every statement is idempotent, so it is
-- safe to re-run, and it also brings a database created from the older
-- files up to date (section 9 removes objects those files created that
-- the application no longer uses).
--
-- Embeddings are 768-dimensional (BAAI/bge-base-en-v1.5). A database still
-- holding 1024-dimensional vectors (bge-large) must be emptied and
-- re-ingested before the column type can change; that step is
-- intentionally NOT automated here because it deletes data:
--     TRUNCATE public.document_chunks;
--     ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE vector(768);
-- =====================================================================


-- =====================================================================
-- 1. Extensions
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4() defaults
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector embeddings


-- =====================================================================
-- 2. Boxes — private, per-user document collections
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.boxes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 100),
    description TEXT,
    domain      TEXT CHECK (domain IN (
                    'finance', 'legal', 'human_resources', 'engineering', 'sales',
                    'marketing', 'operations', 'compliance', 'general'
                )),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade path for boxes created before the domain column existed.
ALTER TABLE public.boxes
    ADD COLUMN IF NOT EXISTS domain TEXT CHECK (domain IN (
        'finance', 'legal', 'human_resources', 'engineering', 'sales',
        'marketing', 'operations', 'compliance', 'general'
    ));

-- One box name per user, ignoring case and surrounding spaces.
CREATE UNIQUE INDEX IF NOT EXISTS idx_boxes_user_name_lower
    ON public.boxes (user_id, lower(btrim(name)));


-- =====================================================================
-- 3. Documents — one row per uploaded file
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_id        UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
    filename      TEXT NOT NULL,
    file_hash     TEXT NOT NULL,                 -- SHA-256 of the file content
    mime_type     TEXT,
    status        TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,                          -- user-safe failure reason shown in the UI
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_document_hash_per_box UNIQUE (box_id, file_hash)
);

-- Box-scoped lookups of completed documents (dense search, keyword index build).
CREATE INDEX IF NOT EXISTS idx_documents_box_status
    ON public.documents (box_id, status);


-- =====================================================================
-- 4. Document chunks — embedded, searchable pieces of each document
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    box_id        UUID,                          -- denormalised copy of documents.box_id, written by ingestion
    content       TEXT NOT NULL,
    embedding     vector(768),                   -- BAAI/bge-base-en-v1.5
    chunk_index   INTEGER NOT NULL CHECK (chunk_index >= 0),
    page_start    INTEGER,
    page_end      INTEGER,
    section_title TEXT,
    metadata      JSONB DEFAULT '{}'::jsonb,     -- parent_id, context_header, section_path, ...
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_chunk_per_doc UNIQUE (document_id, chunk_index)
);

-- Upgrade path: older schema files did not create box_id, but ingestion writes it.
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS box_id UUID;

-- Neighbour-chunk lookups by (document_id, chunk_index).
-- Note: duplicates the index behind unique_chunk_per_doc; kept to match the deployed schema.
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index
    ON public.document_chunks (document_id, chunk_index);

-- Approximate nearest-neighbour index.
-- Note: match_documents_dense_box (section 7) ranks a box's chunks exactly and does not
-- use this index; kept to match the deployed schema.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
    ON public.document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);


-- =====================================================================
-- 5. Chat sessions and messages
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_id     UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content    TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
    ON public.chat_messages (session_id);


-- =====================================================================
-- 6. Row-Level Security
-- =====================================================================
-- The backend connects with the service role (which bypasses RLS) and enforces
-- box ownership itself. RLS protects the tables from direct access with the
-- public anon key: every row is reachable only through boxes the caller owns.

ALTER TABLE public.boxes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages   ENABLE ROW LEVEL SECURITY;

-- 6.1 Boxes
DROP POLICY IF EXISTS "boxes_select_policy" ON public.boxes;
CREATE POLICY "boxes_select_policy" ON public.boxes FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "boxes_insert_policy" ON public.boxes;
CREATE POLICY "boxes_insert_policy" ON public.boxes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "boxes_update_policy" ON public.boxes;
CREATE POLICY "boxes_update_policy" ON public.boxes FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "boxes_delete_policy" ON public.boxes;
CREATE POLICY "boxes_delete_policy" ON public.boxes FOR DELETE USING (user_id = auth.uid());

-- 6.2 Documents
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
CREATE POLICY "documents_insert_policy" ON public.documents FOR INSERT WITH CHECK (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
CREATE POLICY "documents_update_policy" ON public.documents FOR UPDATE USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy" ON public.documents FOR DELETE USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

-- 6.3 Document chunks
DROP POLICY IF EXISTS "document_chunks_select_policy" ON public.document_chunks;
CREATE POLICY "document_chunks_select_policy" ON public.document_chunks FOR SELECT USING (
    document_id IN (SELECT id FROM public.documents WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "document_chunks_insert_policy" ON public.document_chunks;
CREATE POLICY "document_chunks_insert_policy" ON public.document_chunks FOR INSERT WITH CHECK (
    document_id IN (SELECT id FROM public.documents WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "document_chunks_update_policy" ON public.document_chunks;
CREATE POLICY "document_chunks_update_policy" ON public.document_chunks FOR UPDATE USING (
    document_id IN (SELECT id FROM public.documents WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "document_chunks_delete_policy" ON public.document_chunks;
CREATE POLICY "document_chunks_delete_policy" ON public.document_chunks FOR DELETE USING (
    document_id IN (SELECT id FROM public.documents WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

-- 6.4 Chat sessions
DROP POLICY IF EXISTS "chat_sessions_select_policy" ON public.chat_sessions;
CREATE POLICY "chat_sessions_select_policy" ON public.chat_sessions FOR SELECT USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "chat_sessions_insert_policy" ON public.chat_sessions;
CREATE POLICY "chat_sessions_insert_policy" ON public.chat_sessions FOR INSERT WITH CHECK (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "chat_sessions_update_policy" ON public.chat_sessions;
CREATE POLICY "chat_sessions_update_policy" ON public.chat_sessions FOR UPDATE USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "chat_sessions_delete_policy" ON public.chat_sessions;
CREATE POLICY "chat_sessions_delete_policy" ON public.chat_sessions FOR DELETE USING (
    box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid())
);

-- 6.5 Chat messages
-- Only 'user'/'assistant' rows may be written with a user JWT: a self-inserted
-- 'system' row would otherwise be replayed to the LLM as a system instruction.
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_select_policy" ON public.chat_messages FOR SELECT USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);

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

DROP POLICY IF EXISTS "chat_messages_delete_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_policy" ON public.chat_messages FOR DELETE USING (
    session_id IN (SELECT id FROM public.chat_sessions WHERE box_id IN (SELECT id FROM public.boxes WHERE user_id = auth.uid()))
);


-- =====================================================================
-- 7. Dense search RPC — exact cosine ranking within one box
-- =====================================================================
-- The box's completed chunks are selected first; MATERIALIZED stops the planner
-- from pushing ORDER BY/LIMIT into a global HNSW scan, which would take the
-- ~40 nearest chunks across ALL boxes and only then filter, starving small boxes.
-- A box holds at most MAX_DOCUMENTS_PER_BOX documents, so the exact scan stays cheap.
-- The argument is plain `vector`, so the function is not tied to one dimension.

-- Drop any existing version first (Postgres ignores the vector size in function
-- signatures, so this also covers the old vector(1024)/vector(768) variants) so the
-- return type can be redefined; privileges are re-applied in section 8.
DROP FUNCTION IF EXISTS public.match_documents_dense_box(vector, uuid, int);

CREATE OR REPLACE FUNCTION public.match_documents_dense_box(
    query_embedding vector,
    match_box_id    uuid,
    match_count     int DEFAULT 5
)
RETURNS TABLE (
    id              uuid,
    document_id     uuid,
    content         text,
    embedding_score float,
    chunk_index     int,
    page_start      int,
    page_end        int,
    section_title   text,
    metadata        jsonb,
    filename        text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    WITH box_chunks AS MATERIALIZED (
        SELECT
            dc.id,
            dc.document_id,
            dc.content,
            dc.embedding <=> query_embedding AS distance,
            dc.chunk_index,
            dc.page_start,
            dc.page_end,
            dc.section_title,
            dc.metadata,
            d.filename
        FROM public.document_chunks dc
        JOIN public.documents d ON d.id = dc.document_id
        WHERE d.box_id = match_box_id
          AND d.status = 'completed'
          AND dc.embedding IS NOT NULL
    )
    SELECT
        id,
        document_id,
        content,
        (1 - distance)::float AS embedding_score,
        chunk_index,
        page_start,
        page_end,
        section_title,
        metadata,
        filename
    FROM box_chunks
    ORDER BY distance ASC
    LIMIT match_count;
$$;


-- =====================================================================
-- 8. Function privileges — backend only
-- =====================================================================
-- Supabase grants EXECUTE on new public functions to anon and authenticated;
-- revoke it so only the backend's service role can run the search RPC.
REVOKE EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) TO service_role;

-- Future functions in public are not callable by browser roles unless granted explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;


-- =====================================================================
-- 9. Cleanup of objects from earlier schema versions (no-ops on a fresh database)
-- =====================================================================
-- Keyword search runs in-process (BM25) and dense search uses
-- match_documents_dense_box, so these are no longer used by the application.

-- Hybrid search RPC (both historical vector sizes)
DROP FUNCTION IF EXISTS public.match_documents_hybrid_box(vector(1024), text, uuid, int);
DROP FUNCTION IF EXISTS public.match_documents_hybrid_box(vector(768), text, uuid, int);

-- Postgres full-text pipeline on document_chunks
DROP TRIGGER  IF EXISTS tsvector_update ON public.document_chunks;
DROP FUNCTION IF EXISTS public.document_chunks_tsvector_trigger();
DROP INDEX    IF EXISTS public.idx_document_chunks_tsvector;
ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS content_tsvector;

-- Chunk-swap helper (was callable by any authenticated user)
DROP FUNCTION IF EXISTS public.swap_document_chunks(uuid, uuid);

-- Never-populated document summary column
ALTER TABLE public.documents DROP COLUMN IF EXISTS summary;
