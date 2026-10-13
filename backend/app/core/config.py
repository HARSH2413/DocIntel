"""
Centralized, type-safe configuration.

To swap models for production, just edit your .env:
    LLM_MODEL_NAME=llama-3.3-70b-versatile
    EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
    RATE_LIMIT=200/minute
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── External Service Keys ──
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    GROQ_API_KEY: str

    # ── Model Configuration (swap via .env) ──
    LLM_MODEL_NAME: str = "llama-3.1-8b-instant"
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-base-en-v1.5"

    # ── Resilience ──
    REQUEST_TIMEOUT: int = 120         # seconds for external API calls (large file downloads need time)
    LLM_MAX_RETRIES: int = 3           # retry attempts on Groq failures
    DB_MAX_RETRIES: int = 3            # retry attempts on Supabase failures

    # ── Rate Limiting (per authenticated user) ──
    RATE_LIMIT_CHAT: str = "20/minute"
    RATE_LIMIT_UPLOAD: str = "10/minute"
    RATE_LIMIT_WRITE: str = "30/minute"   # box/session create, rename, delete

    # ── Security ──
    # Keep the default safe for local development. Add deployed frontend URLs in .env.
    CORS_ORIGINS: str = "http://localhost:3000"
    # Swagger UI / OpenAPI schema. Off by default so production does not publish the API map.
    ENABLE_API_DOCS: bool = False

    # Upload guardrails. These can be increased in .env when needed.
    MAX_UPLOAD_SIZE_MB: int = 25
    MAX_UNCOMPRESSED_UPLOAD_MB: int = 200  # DOCX/XLSX are zip archives; caps zip-bomb expansion
    MAX_CONCURRENT_INGESTIONS: int = 2     # CPU-heavy embedding jobs running at once
    MAX_PENDING_INGESTIONS: int = 10       # uploads accepted but not yet finished; beyond this → 429

    # ── Abuse quotas ──
    MAX_BOXES_PER_USER: int = 50
    MAX_DOCUMENTS_PER_BOX: int = 200
    MAX_QUESTION_CHARS: int = 4000

    # ── RAG Retrieval & Accuracy ──
    RERANKER_MODEL_NAME: str = "Xenova/ms-marco-MiniLM-L-12-v2"
    RETRIEVAL_TOP_K: int = 20          # faster default; can override in .env for max-accuracy mode
    RERANKER_TOP_K: int = 5            # faster default; can override in .env
    MIN_RELEVANCE_SCORE: float = 0.15  # Documented threshold for usable evidence
    MIN_RELEVANCE_SCORE_LOW: float = 0.05  # Absolute floor to prevent garbage matches
    # A question must meet this score before the assistant is allowed to answer.
    # We calibrate this slightly lower than MIN_RELEVANCE_SCORE so we don't accidentally block valid answers.
    ANSWER_MIN_RELEVANCE_SCORE: float = 0.12
    
    # ── Chat & Responses ──
    # Worded as "not retrieved", not "not in the documents": retrieval reads only the top-ranked
    # sections, so it can never confirm that something is absent from a document.
    FALLBACK_PHRASE: str = "I couldn't find relevant passages for this in the retrieved sections of your documents."
    LLM_MAX_OUTPUT_TOKENS: int = 2048  # room for structured answers (headings, tables) without truncation
    ENABLE_QUERY_REWRITE: bool = False  # LLM-based query rewriting for multi-turn
    ENABLE_NEIGHBOR_CONTEXT: bool = True  # sibling-only expansion for hierarchical chunks
    ENABLE_RERANK_DEBUG_LOGGING: bool = False # Logs dropped chunks and raw scores per query

    # ── Retrieval internals ──
    # Without a reranker score, relevance falls back to cosine similarity, which lives on a
    # different scale (BGE: unrelated text ≈ 0.4-0.5, relevant ≈ 0.7-0.9). Cosine at or below
    # this floor maps to 0 so the same relevance thresholds apply to both signals.
    EMBEDDING_SCORE_FLOOR: float = 0.5
    MAX_EXPAND_DOCS: int = 5               # top hits that get neighbor-chunk expansion
    MAX_NEIGHBOR_CHARS: int = 1500         # cap on each neighbor chunk pulled in
    LEXICAL_INDEX_FRESHNESS_SECONDS: int = 30  # how often a box's BM25 index is checked against the DB
    # Acronym expansions appended to keyword queries (JSON object in .env to override).
    LEXICAL_SYNONYMS: dict[str, str] = {
        "gst": "Goods and Services Tax",
        "pf": "Provident Fund EPF",
        "epf": "Provident Fund PF",
        "pto": "Paid Time Off",
        "hr": "Human Resources",
        "nda": "Non-Disclosure Agreement",
        "kpi": "Key Performance Indicator",
        "roi": "Return on Investment",
    }

    # ── Ingestion ──
    # Character-based splitter settings.  1,400 chars is roughly 300-350
    # English tokens; the 200-char overlap is intentionally much lower than
    # the previous 30% overlap to reduce duplicate embeddings on CPU laptops.
    CHUNK_SIZE: int = 1400
    CHUNK_OVERLAP: int = 200
    INGESTION_BATCH_SIZE: int = 10     # keep small to avoid OOM with large embedding models
    # A document still 'processing' after this long is treated as abandoned (server
    # restart mid-ingestion) and marked failed so it can be uploaded again.
    STALE_PROCESSING_MINUTES: int = 60

    # ── Citation Firewall ──
    CITATION_ENFORCEMENT_MODE: str = "soft"  # 'strict' or 'soft'
    CITATION_SUPPORT_THRESHOLD: float = 0.3  # Cross-encoder threshold for sentence-level support

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # don't crash on unknown .env vars


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton — settings are loaded once and reused."""
    return Settings()


# Convenience alias so existing imports still work
settings = get_settings()
