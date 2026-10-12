"""
FastEmbed Adapter — config-driven model selection.

"""
from typing import List
from fastembed import TextEmbedding
from app.interfaces.embedder import IEmbedder
from app.core.logger import logger
from app.core.cache import global_embedding_cache


# BGE English v1.5 models are trained for short-query → passage retrieval with this
# instruction on the query side only (passages are embedded as-is).
BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "


class FastEmbedAdapter(IEmbedder):
    def __init__(self, model_name: str = "BAAI/bge-base-en-v1.5"):
        self.model = TextEmbedding(model_name=model_name)
        self.model_name = model_name
        self.cache = global_embedding_cache
        name = model_name.lower()
        self.query_prefix = BGE_QUERY_INSTRUCTION if name.startswith("baai/bge-") and "-en" in name else ""
        logger.info(f"FastEmbed adapter initialized | model={model_name}")

    @property
    def dimension(self) -> int:
        return len(next(iter(self.model.embed(["dimension probe"]))))

    def embed_text(self, text_chunks: List[str]) -> List[List[float]]:
        # Passages are embedded once at ingestion and never repeat, so caching them
        # would only evict the query embeddings that actually get reused.
        return [emb.tolist() for emb in self.model.embed(text_chunks)]

    def embed_queries(self, queries: List[str]) -> List[List[float]]:
        """Embed queries in one batch, reusing cached vectors for repeated questions."""
        texts = [self.query_prefix + q for q in queries]
        results: List[List[float] | None] = [self.cache.get_embedding(t) for t in texts]
        missing = [i for i, r in enumerate(results) if r is None]
        if missing:
            fresh = self.model.embed([texts[i] for i in missing])
            for i, emb in zip(missing, fresh):
                results[i] = emb.tolist()
                self.cache.set_embedding(texts[i], results[i])
        return results  # type: ignore[return-value]