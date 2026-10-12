"""Regression tests for retrieval-engine flaws: cache concurrency, rescue-pass fusion,
degraded results not being cached, citation labels on merged neighbors, score
calibration, and query/passage embedding handling."""
import threading
from unittest.mock import MagicMock

import pytest

from app.core.cache import QueryResultCache, SimpleCache
from app.core.config import settings
from app.core.retrieval_health import RetrievalHealth
from app.infrastructure.fastembed_adapter import BGE_QUERY_INSTRUCTION, FastEmbedAdapter
from app.services.evidence_engine import EvidenceEngine
from app.services.retrieval_engine import RetrievalEngine


# ── 1. Caches are safe under concurrent access ──

def test_cache_survives_concurrent_eviction():
    cache = QueryResultCache(max_size=200, ttl=3600)
    errors = []

    def hammer(tid):
        try:
            for i in range(4000):
                cache.set_query_result(f"q{tid}-{i}", "box", [i])
                cache.get_query_result(f"q{tid}-{i - 5}", "box")
                if i % 500 == 0:
                    cache.invalidate_box("box")
        except Exception as e:  # noqa: BLE001
            errors.append(repr(e))

    threads = [threading.Thread(target=hammer, args=(t,)) for t in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert errors == []
    assert len(cache.cache) <= 200


def test_cache_evicts_least_recently_used():
    cache = SimpleCache(max_size=2, ttl=3600)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")          # 'a' is now most recently used
    cache.set("c", 3)       # evicts 'b'
    assert cache.get("a") == 1
    assert cache.get("b") is None
    assert cache.get("c") == 3


# ── Engine helpers ──

def _engine(reranker=None):
    engine = RetrievalEngine(db=MagicMock(), lexical_store=MagicMock(), embedder=MagicMock(), reranker=reranker,
                             retrieval_top_k=10, reranker_top_k=5)
    engine.cache = QueryResultCache(max_size=100, ttl=3600)  # isolated from the global cache
    engine.embedder.embed_queries.side_effect = lambda qs: [[0.0] for _ in qs]
    engine.lexical_store.search.return_value = []
    return engine


# ── 5. Degraded results are not cached ──

def test_dense_failure_result_is_not_cached():
    engine = _engine()
    engine.db.search_dense.side_effect = RuntimeError("supabase timeout")
    engine.lexical_store.search.return_value = [{"document_id": "d", "chunk_index": 1, "lexical_score": 3.0}]

    first = engine.retrieve_documents("q", "box")
    assert first and first[0]["document_id"] == "d"
    assert engine.cache.get_query_result("q", "box") is None

    engine.db.search_dense.side_effect = None
    engine.db.search_dense.return_value = [{"document_id": "dense", "chunk_index": 1, "embedding_score": 0.9}]
    second = engine.retrieve_documents("q", "box")
    assert {d["document_id"] for d in second} == {"d", "dense"}


def test_rerank_failure_result_is_not_cached():
    reranker = MagicMock()
    reranker.rerank.side_effect = RuntimeError("onnx error")
    engine = _engine(reranker)
    engine.db.search_dense.return_value = [{"document_id": "d", "chunk_index": 1, "embedding_score": 0.9}]
    engine.retrieve_documents("q", "box")
    assert engine.cache.get_query_result("q", "box") is None


def test_healthy_result_is_cached():
    engine = _engine()
    engine.db.search_dense.return_value = [{"document_id": "d", "chunk_index": 1, "embedding_score": 0.9}]
    engine.retrieve_documents("q", "box")
    assert engine.cache.get_query_result("q", "box") is not None


# ── 6. Rescue fusion rewards agreement across phrasings ──

def test_multi_query_consensus_outranks_single_marginal_hit():
    engine = _engine()
    per_query = iter([
        [{"document_id": "dA", "chunk_index": 1, "embedding_score": 0.80},
         {"document_id": "dB", "chunk_index": 1, "embedding_score": 0.81}],
        [{"document_id": "dA", "chunk_index": 1, "embedding_score": 0.79}],
        [{"document_id": "dA", "chunk_index": 1, "embedding_score": 0.78}],
    ])
    engine.db.search_dense.side_effect = lambda **kw: next(per_query)
    out = engine.retrieve_documents_multi(["v1", "v2", "v3"], "box", reranker_query="v1")
    assert out[0]["document_id"] == "dA"
    assert out[0]["embedding_score"] == 0.80  # best score across phrasings is kept


def test_queries_are_embedded_in_one_batch():
    engine = _engine()
    engine.db.search_dense.return_value = []
    engine.retrieve_documents_multi(["a", "b", "c", "d"], "box", reranker_query="a")
    engine.embedder.embed_queries.assert_called_once_with(["a", "b", "c", "d"])


def test_fusion_does_not_mutate_inputs_or_invent_dense_scores():
    engine = _engine()
    lexical_only = {"document_id": "lex", "chunk_index": 2, "lexical_score": 5.0}
    merged = engine._rrf_merge([], [lexical_only], limit=5)
    assert "embedding_score" not in merged[0]
    assert "rrf_score" not in lexical_only


# ── 10. Dense failures are surfaced ──

def test_retrieval_health_reports_degraded_and_recovery():
    health = RetrievalHealth()
    assert health.status() == "unknown"
    health.dense_failed("boom")
    assert health.status() == "degraded"
    health.dense_succeeded()
    assert health.status() == "ok"
    health.config_problem("dimension mismatch")
    health.dense_succeeded()
    assert health.status() == "degraded"  # config problems are sticky


# ── 3. Merged neighbor blocks keep their source labels ──

def test_neighbor_merge_keeps_filename_section_and_page_range():
    db = MagicMock()
    hit = {"document_id": "doc", "chunk_index": 5, "content": "hit text", "filename": "Handbook.pdf",
           "section_title": "Leave", "page_start": 4, "page_end": 4, "rerank_score": 0.9,
           "metadata": {"parent_id": "p1"}}
    db.get_multi_neighboring_chunks.return_value = {"doc": [
        {"document_id": "doc", "chunk_index": 4, "content": "before", "page_start": 3, "page_end": 3,
         "section_title": None, "metadata": {"parent_id": "p1"}},
        {"document_id": "doc", "chunk_index": 6, "content": "after", "page_start": 5, "page_end": 5,
         "section_title": "Leave", "metadata": {"parent_id": "p1"}},
    ]}
    engine = EvidenceEngine(db=db, min_relevance_score=0.15, min_relevance_score_low=0.05)
    merged = engine.filter_and_expand([hit])
    assert len(merged) == 1
    block = merged[0]
    assert block["filename"] == "Handbook.pdf"
    assert block["section_title"] == "Leave"
    assert (block["page_start"], block["page_end"]) == (3, 5)
    assert block["content"] == "before\n\nhit text\n\nafter"


# ── 8. One relevance scale for reranker and cosine scores ──

def test_cosine_is_rescaled_to_reranker_scale():
    engine = EvidenceEngine(db=MagicMock())
    floor = settings.EMBEDDING_SCORE_FLOOR
    assert engine.get_doc_relevance_score({"rerank_score": 0.42, "embedding_score": 0.99}) == 0.42
    assert engine.get_doc_relevance_score({"embedding_score": floor - 0.05}) == 0.0   # unrelated-text cosine
    assert engine.get_doc_relevance_score({"embedding_score": 1.0}) == pytest.approx(1.0)
    assert engine.get_doc_relevance_score({"lexical_score": 9.0}) == 0.0


# ── Query/passage embeddings ──

def test_bge_queries_get_instruction_and_passages_do_not(monkeypatch):
    adapter = FastEmbedAdapter.__new__(FastEmbedAdapter)
    seen = []

    class FakeModel:
        def embed(self, texts):
            seen.extend(texts)
            for _ in texts:
                yield MagicMock(tolist=lambda: [0.1])

    adapter.model = FakeModel()
    adapter.cache = SimpleCache(max_size=10, ttl=60)
    adapter.cache.get_embedding = adapter.cache.get
    adapter.cache.set_embedding = adapter.cache.set
    adapter.query_prefix = BGE_QUERY_INSTRUCTION

    adapter.embed_queries(["what is the leave policy?"])
    adapter.embed_text(["passage text"])
    adapter.embed_queries(["what is the leave policy?"])  # served from cache, no model call

    assert seen == [BGE_QUERY_INSTRUCTION + "what is the leave policy?", "passage text"]
