-- ====================================================================
-- Migration: Drop database objects the application no longer uses
-- ====================================================================
-- Lexical search runs in-process (BM25S) and dense search uses
-- match_documents_dense_box, so the Postgres full-text pipeline and the
-- hybrid RPC are dead weight (the tsvector trigger also costs time on every
-- chunk insert). Document summaries and the chunk-swap helper were never wired up.
-- Every statement is idempotent so this is safe on any earlier schema state.

-- 1. Hybrid search RPC (both historical vector sizes)
DROP FUNCTION IF EXISTS public.match_documents_hybrid_box(vector(1024), text, uuid, int);
DROP FUNCTION IF EXISTS public.match_documents_hybrid_box(vector(768), text, uuid, int);

-- 2. Full-text search pipeline on document_chunks
DROP TRIGGER IF EXISTS tsvector_update ON public.document_chunks;
DROP FUNCTION IF EXISTS public.document_chunks_tsvector_trigger();
DROP INDEX IF EXISTS public.idx_document_chunks_tsvector;
ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS content_tsvector;

-- 3. Chunk-swap helper (was also callable by any authenticated user via PostgREST)
DROP FUNCTION IF EXISTS public.swap_document_chunks(uuid, uuid);

-- 4. Never-populated document summary column
ALTER TABLE public.documents DROP COLUMN IF EXISTS summary;
