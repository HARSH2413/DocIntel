"""
Caching Layer for Embeddings and Query Results
Reduce repeated queries by 90%+ with a simple in-memory cache
"""

import hashlib
import threading
import time
from collections import OrderedDict
from typing import Optional, Any


class SimpleCache:
    """Thread-safe in-memory LRU cache with a per-entry TTL.

    Requests run concurrently in FastAPI's threadpool and ingestion runs in
    background threads, so every access goes through one lock. The OrderedDict
    keeps entries in recency order, making eviction O(1) instead of a full scan.
    """

    def __init__(self, max_size: int = 10000, ttl: int = 3600):
        """
        Args:
            max_size: Max number of cached items before eviction
            ttl: Time to live in seconds (default 1 hour)
        """
        self.cache: "OrderedDict[str, tuple[Any, float]]" = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        self.hits = 0
        self.misses = 0
        self._lock = threading.Lock()

    def _key(self, text: str) -> str:
        """Create hash key from text."""
        return hashlib.md5(text.encode()).hexdigest()

    def get(self, text: str) -> Optional[Any]:
        """Get from cache with TTL check."""
        key = self._key(text)
        with self._lock:
            entry = self.cache.get(key)
            if entry is None:
                self.misses += 1
                return None
            value, timestamp = entry
            if time.time() - timestamp > self.ttl:
                del self.cache[key]
                self.misses += 1
                return None
            self.cache.move_to_end(key)
            self.hits += 1
            return value

    def set(self, text: str, value: Any) -> None:
        """Set in cache, evicting the least recently used entry when full."""
        key = self._key(text)
        with self._lock:
            self.cache[key] = (value, time.time())
            self.cache.move_to_end(key)
            while len(self.cache) > self.max_size:
                self.cache.popitem(last=False)

    def clear(self) -> None:
        """Clear all cache."""
        with self._lock:
            self.cache.clear()

    def stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            total = self.hits + self.misses
            hit_rate = (self.hits / total * 100) if total > 0 else 0
            return {
                "size": len(self.cache),
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": f"{hit_rate:.1f}%",
            }


class QueryResultCache(SimpleCache):
    """Cache for full query results (search results, reranking)."""

    def _key(self, text: str) -> str:
        # "box_id:query" -> "box_id:<md5(query)>" so entries stay groupable per box.
        box_id, _, query = text.partition(":")
        return f"{box_id}:{hashlib.md5(query.encode()).hexdigest()}"

    def get_query_result(self, query: str, box_id: str) -> Optional[list]:
        """Get cached search results."""
        key = f"{box_id}:{query}"
        return super().get(key)

    def set_query_result(self, query: str, box_id: str, results: list) -> None:
        """Cache search results."""
        key = f"{box_id}:{query}"
        super().set(key, results)
        
    def invalidate_box(self, box_id: str) -> None:
        """Invalidate all cached queries for a specific box."""
        prefix = f"{box_id}:"
        with self._lock:
            for k in [k for k in self.cache if k.startswith(prefix)]:
                del self.cache[k]


class EmbeddingCache(SimpleCache):
    """Cache for embeddings (text → vector)."""

    def get_embedding(self, text: str) -> Optional[list]:
        """Get cached embedding."""
        return super().get(text)

    def set_embedding(self, text: str, embedding: list) -> None:
        """Cache embedding."""
        super().set(text, embedding)


# Global cache instances
global_embedding_cache = EmbeddingCache(max_size=10000, ttl=86400)
global_query_cache = QueryResultCache(max_size=5000, ttl=3600)
