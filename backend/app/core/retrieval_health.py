"""
Process-wide signal for whether vector (dense) search is working.

Retrieval quietly falls back to keyword-only results when dense search fails, which
keeps chat answering but hides real breakage (e.g. an embedding model whose vector
size doesn't match the database column). This records that state so it is logged
loudly once and reported by the health endpoint.
"""
import threading
import time
from typing import Optional

from app.core.logger import logger


class RetrievalHealth:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._dense_ok: Optional[bool] = None       # None until the first search
        self._last_failure_at: Optional[float] = None
        self._config_problem: Optional[str] = None   # sticky; set by the startup check

    def dense_succeeded(self) -> None:
        with self._lock:
            if self._dense_ok is False:
                logger.info("Dense search recovered")
            self._dense_ok = True

    def dense_failed(self, reason: str) -> None:
        with self._lock:
            if self._dense_ok is not False:
                logger.error(f"DEGRADED RETRIEVAL: dense search failing, answering from keyword search only ({reason})")
            self._dense_ok = False
            self._last_failure_at = time.time()

    def config_problem(self, reason: str) -> None:
        with self._lock:
            self._config_problem = reason
        logger.error(f"DEGRADED RETRIEVAL: {reason}")

    def status(self) -> str:
        with self._lock:
            if self._config_problem or self._dense_ok is False:
                return "degraded"
            return "ok" if self._dense_ok else "unknown"


retrieval_health = RetrievalHealth()
