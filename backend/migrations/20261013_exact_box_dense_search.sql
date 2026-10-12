-- ====================================================================
-- Migration: Exact per-box dense search
-- ====================================================================
-- Run after 20261012_security_hardening.sql. Safe to re-run.
--
-- Problem: the old function ordered ALL chunks by distance and filtered to the box
-- afterwards. Once the HNSW index is used, Postgres takes the ~ef_search (default 40)
-- nearest chunks across every user's boxes and only then applies the box filter, so a
-- box surrounded by larger boxes gets few or zero vector hits.
--
-- Fix: select the box's completed chunks first (MATERIALIZED stops the planner from
-- pushing ORDER BY/LIMIT back into the global HNSW scan), then rank them exactly.
-- A box holds at most MAX_DOCUMENTS_PER_BOX documents, so this exact scan stays cheap,
-- and results are now exact rather than approximate. The argument type is the plain
-- `vector`, so the function no longer hard-codes 768 dimensions.

CREATE OR REPLACE FUNCTION public.match_documents_dense_box(
    query_embedding vector,
    match_box_id uuid,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    embedding_score float,
    chunk_index int,
    page_start int,
    page_end int,
    section_title text,
    metadata jsonb,
    filename text
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

-- Supporting index for the box filter (documents → chunks join already uses
-- unique_chunk_per_doc / idx_document_chunks_chunk_index on document_id).
CREATE INDEX IF NOT EXISTS idx_documents_box_status ON public.documents (box_id, status);

-- Keep it backend-only. (Postgres ignores vector(768) vs vector in signatures, so this
-- replaces the existing function; privileges are re-asserted to be explicit.)
REVOKE EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents_dense_box(vector, uuid, int) TO service_role;
