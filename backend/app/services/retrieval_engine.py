from typing import List, Dict, Any, Tuple
from app.interfaces.vector_store import IVectorStore
from app.interfaces.lexical_store import ILexicalStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.reranker import IReranker
from app.core.config import settings
from app.core.logger import logger
from app.core.cache import global_query_cache
from app.core.retrieval_health import retrieval_health

Ranked = List[Dict[str, Any]]


class RetrievalEngine:
    def __init__(
        self,
        db: IVectorStore,
        lexical_store: ILexicalStore,
        embedder: IEmbedder,
        reranker: IReranker,
        retrieval_top_k: int = 20,
        reranker_top_k: int = 5,
    ):
        self.db = db
        self.lexical_store = lexical_store
        self.embedder = embedder
        self.reranker = reranker
        self.retrieval_top_k = retrieval_top_k
        self.reranker_top_k = reranker_top_k
        self.cache = global_query_cache
        self.rrf_k = 60

    def retrieve_documents(self, search_query: str, box_id: str) -> Ranked:
        """Single-query hybrid retrieval: dense + BM25 → RRF → rerank, cached per box."""
        cached = self.cache.get_query_result(search_query, box_id)
        if cached is not None:
            logger.info("Cache hit for query results")
            return cached

        dense_lists, lexical_lists, searches_ok = self._search_all([search_query], box_id)
        docs = self._rrf_fuse(dense_lists + lexical_lists, self.retrieval_top_k)
        docs, rerank_ok = self._rerank(search_query, docs)

        # Only cache complete results. A degraded result (dense, keyword or rerank
        # failure) would otherwise keep serving worse answers for the whole cache TTL
        # after the underlying problem has cleared.
        if searches_ok and rerank_ok:
            self.cache.set_query_result(search_query, box_id, docs)
        return docs

    def retrieve_documents_multi(self, queries: List[str], box_id: str, reranker_query: str) -> Ranked:
        """Rescue pass: run several phrasings and fuse every ranked list with RRF.

        Reciprocal ranks are summed over each query's own dense and keyword lists, so
        chunks that several phrasings agree on rise to the top, and raw BM25 scores from
        different queries (which are not on a common scale) are never compared.
        """
        dense_lists, lexical_lists, _ = self._search_all(queries, box_id)
        docs = self._rrf_fuse(dense_lists + lexical_lists, self.retrieval_top_k)
        docs, _ = self._rerank(reranker_query, docs)
        return docs

    def _search_all(self, queries: List[str], box_id: str) -> Tuple[List[Ranked], List[Ranked], bool]:
        """One ranked dense list and one ranked keyword list per query, plus whether both succeeded."""
        ok = True

        dense_lists: List[Ranked] = []
        try:
            vectors = self.embedder.embed_queries(queries)  # one batched model call
            for vector in vectors:
                dense_lists.append(self.db.search_dense(query_vector=vector, box_id=box_id, limit=self.retrieval_top_k))
            retrieval_health.dense_succeeded()
        except Exception as e:
            ok = False
            retrieval_health.dense_failed(str(e))
            logger.error(f"Dense search failed: {e}")

        lexical_lists: List[Ranked] = []
        try:
            self.lexical_store.ensure_box_index(box_id, self.db)
            for q in queries:
                lexical_lists.append(self.lexical_store.search(
                    query=self._expand_lexical_variants(q), box_id=box_id, limit=self.retrieval_top_k))
        except Exception as e:
            ok = False
            logger.error(f"Lexical search failed: {e}")

        return dense_lists, lexical_lists, ok

    def _rerank(self, query: str, docs: Ranked) -> Tuple[Ranked, bool]:
        """Cross-encoder rerank to reranker_top_k. Returns (docs, succeeded)."""
        if not docs or self.reranker is None:
            return docs, True
        try:
            ranked = self.reranker.rerank(query=query, documents=docs, top_k=self.reranker_top_k)
        except Exception as e:
            logger.warning(f"Re-ranking failed: {e}")
            return docs[:self.reranker_top_k], False

        if settings.ENABLE_RERANK_DEBUG_LOGGING:
            logger.info(f"[RERANK DEBUG] Query: '{query}'")
            for i, d in enumerate(ranked):
                logger.info(f"  [{i}] Score: {d.get('rerank_score', 0):.4f} | Chunk: {d.get('content', '')[:60]}...")
        return ranked, True

    def _rrf_merge(self, dense: Ranked, lexical: Ranked, limit: int) -> Ranked:
        return self._rrf_fuse([dense, lexical], limit)

    def _rrf_fuse(self, ranked_lists: List[Ranked], limit: int) -> Ranked:
        """Reciprocal Rank Fusion over any number of ranked lists.

        Each appearance of a chunk adds 1/(k + rank). Inputs are copied, never mutated
        (some come from shared caches). A chunk that only matched by keyword keeps no
        embedding_score at all, rather than a fabricated 0.0 that downstream relevance
        checks would read as "measured as irrelevant".
        """
        scores: Dict[tuple, float] = {}
        docs: Dict[tuple, Dict[str, Any]] = {}
        for ranked in ranked_lists:
            for rank, doc in enumerate(ranked):
                key = (doc.get("document_id"), doc.get("chunk_index"))
                scores[key] = scores.get(key, 0.0) + 1.0 / (self.rrf_k + rank + 1)
                if key in docs:
                    self._absorb(docs[key], doc)
                else:
                    docs[key] = dict(doc)

        for key, doc in docs.items():
            doc["rrf_score"] = scores[key]

        # Deterministic order: RRF desc, then dense score desc, then document/chunk asc.
        ordered = sorted(docs.values(), key=lambda d: (str(d.get("document_id") or ""), d.get("chunk_index") or 0))
        ordered.sort(key=lambda d: (d["rrf_score"], d.get("embedding_score") or 0.0), reverse=True)
        return ordered[:limit]

    @staticmethod
    def _absorb(kept: Dict[str, Any], doc: Dict[str, Any]) -> None:
        """Same chunk seen in another list or query: keep the best score of each kind
        and fill fields only the other source had (e.g. filename from BM25)."""
        for field in ("embedding_score", "lexical_score"):
            value = doc.get(field)
            if value is not None and (kept.get(field) is None or value > kept[field]):
                kept[field] = value
        for field, value in doc.items():
            if kept.get(field) is None and value is not None:
                kept[field] = value

    def _expand_lexical_variants(self, text: str) -> str:
        """Append configured acronym expansions (LEXICAL_SYNONYMS) to a keyword query."""
        synonyms = settings.LEXICAL_SYNONYMS
        expanded_words = []
        for word in text.split():
            expanded_words.append(word)
            expansion = synonyms.get(word.lower().strip(",.?!()[]{}\"'"))
            if expansion:
                expanded_words.append(expansion)
        return " ".join(expanded_words)
