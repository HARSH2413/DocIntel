import os
import shutil
import threading
import time
from typing import List, Dict, Any
import bm25s
from py_rust_stemmers import SnowballStemmer
from app.interfaces.lexical_store import ILexicalStore
from app.core.logger import logger

# PostgREST caps rows per response (Supabase default: 1000). Pages are requested
# until one comes back empty, so a lower server cap can't silently truncate either.
_PAGE_SIZE = 1000
_CHUNK_COLUMNS = (
    "id, document_id, chunk_index, content, page_start, page_end, section_title, metadata, "
    "documents!inner(box_id, status, filename)"
)


def _tokenize(texts):
    """Lowercase, drop English stopwords, and stem, so 'policies' matches 'policy'.
    The index and every query must go through this same function."""
    stemmer = SnowballStemmer("english")
    return bm25s.tokenize(texts, stopwords="english", stemmer=stemmer.stem_words, show_progress=False)


class BM25SAdapter(ILexicalStore):
    """Per-box BM25 indexes held in memory and rebuilt from Supabase on demand.

    Indexes are not persisted: a disk copy duplicated every chunk's text in plain
    files and could go stale across restarts or workers. Instead each index records
    a fingerprint of the box's completed chunks and is re-checked against the DB at
    most every `freshness_seconds`, so changes made by another process (another
    worker, the re-ingest script) are picked up without relying on invalidation.
    """

    def __init__(self, data_dir: str = ".data/bm25", freshness_seconds: int = 30):
        self.freshness_seconds = freshness_seconds
        self.indexes: Dict[str, bm25s.BM25] = {}
        self.metadata_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.fingerprints: Dict[str, str] = {}
        self.checked_at: Dict[str, float] = {}
        self.locks: Dict[str, threading.Lock] = {}
        self.global_lock = threading.Lock()
        # Older versions wrote plaintext chunk copies here; remove them.
        if os.path.isdir(data_dir):
            shutil.rmtree(data_dir, ignore_errors=True)
            logger.info(f"Removed legacy on-disk BM25 indexes at {data_dir}")
        logger.info("BM25SAdapter initialized (in-memory indexes)")

    def _get_box_lock(self, box_id: str) -> threading.Lock:
        with self.global_lock:
            if box_id not in self.locks:
                self.locks[box_id] = threading.Lock()
            return self.locks[box_id]

    def search(self, query: str, box_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        with self._get_box_lock(box_id):
            index = self.indexes.get(box_id)
            metadata = self.metadata_cache.get(box_id, [])
            if index is None or not metadata:
                return []

            actual_limit = min(limit, len(metadata))
            results, scores = index.retrieve(_tokenize(query), k=actual_limit, show_progress=False)

            output = []
            for doc_idx, score in zip(results[0], scores[0]):
                if float(score) > 0.0:
                    doc_meta = dict(metadata[int(doc_idx)])
                    doc_meta["lexical_score"] = float(score)
                    output.append(doc_meta)
            return output

    def ensure_box_index(self, box_id: str, db_adapter) -> None:
        with self._get_box_lock(box_id):
            now = time.monotonic()
            has_index = box_id in self.indexes
            if has_index and now - self.checked_at.get(box_id, 0.0) < self.freshness_seconds:
                return

            try:
                fingerprint = self._db_fingerprint(box_id, db_adapter)
            except Exception as e:
                if has_index:
                    logger.warning(f"BM25 freshness check failed for box={box_id}; keeping current index: {e}")
                    self.checked_at[box_id] = now
                    return
                raise

            if has_index and self.fingerprints.get(box_id) == fingerprint:
                self.checked_at[box_id] = now
                return

            logger.info(f"{'Rebuilding stale' if has_index else 'Building'} BM25 index for box={box_id}")
            # The fingerprint is taken before reading chunks, so anything written
            # during the build shows up as a mismatch on the next check.
            self._build_index(box_id, db_adapter)
            self.fingerprints[box_id] = fingerprint
            self.checked_at[box_id] = now

    @staticmethod
    def _db_fingerprint(box_id: str, db_adapter) -> str:
        """Cheap change detector: completed-chunk count + newest chunk timestamp."""
        response = (
            db_adapter.client.table("document_chunks")
            .select("created_at, documents!inner(box_id, status)", count="exact")
            .eq("documents.box_id", box_id)
            .eq("documents.status", "completed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        newest = response.data[0].get("created_at", "") if response.data else ""
        return f"{response.count or 0}:{newest}"

    @staticmethod
    def _fetch_all_chunks(box_id: str, db_adapter) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        start = 0
        while True:
            page = (
                db_adapter.client.table("document_chunks")
                .select(_CHUNK_COLUMNS)
                .eq("documents.box_id", box_id)
                .eq("documents.status", "completed")
                .order("id")
                .range(start, start + _PAGE_SIZE - 1)
                .execute()
            ).data or []
            if not page:
                return rows
            rows.extend(page)
            start += len(page)

    def _build_index(self, box_id: str, db_adapter) -> None:
        data = self._fetch_all_chunks(box_id, db_adapter)
        if not data:
            logger.info(f"No completed chunks found for box={box_id}")
            self.indexes[box_id] = bm25s.BM25(k1=1.2, b=0.75)
            self.metadata_cache[box_id] = []
            return

        corpus_texts = []
        metadata_list = []
        for row in data:
            doc_info = row.get("documents", {})
            filename = doc_info.get("filename", "") if isinstance(doc_info, dict) else ""
            section = row.get("section_title") or ""
            content = row.get("content") or ""
            corpus_texts.append(f"{section} {content}".strip())
            metadata_list.append({
                "id": row.get("id"),
                "document_id": row.get("document_id"),
                "chunk_index": row.get("chunk_index"),
                "filename": filename,
                "page_start": row.get("page_start"),
                "page_end": row.get("page_end"),
                "section_title": row.get("section_title"),
                "content": content,
                "metadata": row.get("metadata", {}),
            })

        index = bm25s.BM25(k1=1.2, b=0.75)
        index.index(_tokenize(corpus_texts), show_progress=False)
        self.indexes[box_id] = index
        self.metadata_cache[box_id] = metadata_list
        logger.info(f"Built BM25 index for box={box_id} with {len(metadata_list)} chunks")

    def invalidate_box(self, box_id: str) -> None:
        with self._get_box_lock(box_id):
            self.indexes.pop(box_id, None)
            self.metadata_cache.pop(box_id, None)
            self.fingerprints.pop(box_id, None)
            self.checked_at.pop(box_id, None)
            logger.info(f"Invalidated BM25 index for box={box_id}")
