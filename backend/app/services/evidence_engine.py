from app.interfaces.vector_store import IVectorStore
from app.core.logger import logger
from app.core.config import settings

class EvidenceEngine:
    def __init__(
        self,
        db: IVectorStore,
        min_relevance_score: float = 0.3,
        min_relevance_score_low: float = 0.1,
        enable_neighbor_context: bool = True,
    ):
        self.db = db
        self.min_relevance_score = min_relevance_score
        self.min_relevance_score_low = min_relevance_score_low
        self.enable_neighbor_context = enable_neighbor_context

    def get_doc_relevance_score(self, doc: dict) -> float:
        """Relevance on the reranker's 0-1 scale, so one set of thresholds fits every source.

        The cross-encoder score is authoritative. Without it (reranker failed), cosine
        similarity is rescaled: raw BGE cosine sits around 0.4-0.5 even for unrelated
        text, so using it directly would pass nearly everything. Keyword-only hits have
        no measured similarity and score 0 here; rrf_score is rank-based, never a relevance.
        """
        rerank = doc.get("rerank_score")
        if rerank is not None:
            return float(rerank)

        cosine = doc.get("embedding_score")
        if cosine is not None:
            floor = settings.EMBEDDING_SCORE_FLOOR
            return max(0.0, (float(cosine) - floor) / (1.0 - floor))

        return 0.0

    def filter_and_expand(self, docs: list[dict]) -> list[dict]:
        filtered = self._dynamic_relevance_filter(docs)
        if self.enable_neighbor_context and filtered:
            filtered = self._expand_with_neighbors(filtered)
        return filtered

    def _dynamic_relevance_filter(self, docs: list) -> list:
        if not docs:
            return docs

        filtered = [
            doc for doc in docs
            if self.get_doc_relevance_score(doc) >= self.min_relevance_score
        ]

        if len(filtered) < 2:
            filtered = [
                doc for doc in docs
                if self.get_doc_relevance_score(doc) >= self.min_relevance_score_low
            ]
            logger.info(
                f"Dynamic threshold: {self.min_relevance_score} → {self.min_relevance_score_low} "
                f"({len(docs)} → {len(filtered)} docs)"
            )
        else:
            filtered_count = len(docs) - len(filtered)
            if filtered_count > 0:
                logger.info(f"Filtered out {filtered_count} low-relevance docs (threshold={self.min_relevance_score})")
                
        if settings.ENABLE_RERANK_DEBUG_LOGGING:
            dropped = [doc for doc in docs if doc not in filtered]
            for i, d in enumerate(dropped):
                logger.info(f"[RERANK DEBUG] Dropped Chunk [{i}] Score: {self.get_doc_relevance_score(d):.4f} | Content: {d.get('content', '')[:60]}...")

        return filtered

    def _expand_with_neighbors(self, docs: list) -> list:
        MAX_EXPAND_DOCS = settings.MAX_EXPAND_DOCS
        MAX_NEIGHBOR_CHARS = settings.MAX_NEIGHBOR_CHARS

        # Only expand top N docs to save tokens and time
        docs_to_expand = sorted(docs, key=lambda d: self.get_doc_relevance_score(d), reverse=True)[:MAX_EXPAND_DOCS]
        expand_set = {(d.get("document_id"), d.get("chunk_index")) for d in docs_to_expand}
        
        # Collect all surviving docs in a map for easy merging
        doc_map = {}
        requested_parent_ids = {}
        filenames = {}
        for d in docs:
            did = d.get("document_id")
            idx = d.get("chunk_index")
            if did and idx is not None:
                doc_map[(did, idx)] = d
                parent_id = (d.get("metadata") or {}).get("parent_id")
                if parent_id:
                    requested_parent_ids.setdefault(did, set()).add(parent_id)
                # Neighbor rows come back without the document's filename; remember it from the hit.
                if d.get("filename"):
                    filenames.setdefault(did, d["filename"])
                
        requests = []
        for did, idx in expand_set:
            requests.append({"document_id": did, "chunk_index": idx})
                
        bulk_neighbors = {}
        if requests:
            try:
                bulk_neighbors = self.db.get_multi_neighboring_chunks(requests, limit=3)
            except Exception as e:
                logger.warning(f"Bulk neighbor expansion failed: {e}")
                
        neighbor_map = {}
        for doc_id, n_list in bulk_neighbors.items():
            for n in n_list:
                neighbor_map[(doc_id, n.get("chunk_index"))] = n
                
        # We now want to merge contiguous chunks into single blocks.
        # First, union all chunks (surviving + neighbors)
        all_chunks = {}
        for (did, idx), d in doc_map.items():
            all_chunks[(did, idx)] = d
            
        for (did, idx), n in neighbor_map.items():
            if (did, idx) not in all_chunks:
                # Hierarchical chunks must only expand into siblings from the
                # same logical parent.  Legacy chunks without parent metadata
                # retain the prior adjacency-only behaviour.
                allowed_parent_ids = requested_parent_ids.get(did)
                neighbor_parent_id = (n.get("metadata") or {}).get("parent_id")
                if allowed_parent_ids and neighbor_parent_id not in allowed_parent_ids:
                    continue
                # Limit neighbor chars
                content = n.get("content", "")
                if len(content) > MAX_NEIGHBOR_CHARS:
                    content = content[:MAX_NEIGHBOR_CHARS] + "..."
                n["content"] = content
                if not n.get("filename") and did in filenames:
                    n["filename"] = filenames[did]
                all_chunks[(did, idx)] = n
                
        # Group by document_id
        from collections import defaultdict
        groups = defaultdict(list)
        for (did, idx), chunk in all_chunks.items():
            groups[did].append(chunk)
            
        merged_docs = []
        for did, group in groups.items():
            # Sort by chunk_index
            group.sort(key=lambda x: x.get("chunk_index", 0))
            
            # Merge contiguous
            current_merged = None
            for chunk in group:
                if not current_merged:
                    current_merged = dict(chunk) # copy
                else:
                    # Check if contiguous
                    current_parent = (current_merged.get("metadata") or {}).get("parent_id")
                    chunk_parent = (chunk.get("metadata") or {}).get("parent_id")
                    same_parent = not current_parent or not chunk_parent or current_parent == chunk_parent
                    if same_parent and chunk.get("chunk_index") == current_merged.get("chunk_index") + 1:
                        current_merged["content"] += "\n\n" + chunk.get("content", "")
                        current_merged["chunk_index"] = chunk.get("chunk_index") # update to last
                        self._merge_labels(current_merged, chunk)
                        # Preserve highest relevance score if merging
                        s1 = self.get_doc_relevance_score(current_merged)
                        s2 = self.get_doc_relevance_score(chunk)
                        if s2 > s1:
                            if "rerank_score" in chunk: current_merged["rerank_score"] = chunk["rerank_score"]
                            if "embedding_score" in chunk: current_merged["embedding_score"] = chunk["embedding_score"]
                    else:
                        merged_docs.append(current_merged)
                        current_merged = dict(chunk)
            if current_merged:
                merged_docs.append(current_merged)
                
        # Add back docs that don't have document_id or chunk_index
        for d in docs:
            if not d.get("document_id") or d.get("chunk_index") is None:
                merged_docs.append(d)
                
        return merged_docs

    @staticmethod
    def _merge_labels(merged: dict, chunk: dict) -> None:
        """When appending a contiguous chunk, widen the page range and fill source labels
        the first chunk lacked (a leading neighbor row has no filename or section)."""
        starts = [p for p in (merged.get("page_start"), chunk.get("page_start")) if p is not None]
        ends = [p for p in (merged.get("page_end"), chunk.get("page_end")) if p is not None]
        if starts:
            merged["page_start"] = min(starts)
        if ends:
            merged["page_end"] = max(ends)
        for field in ("filename", "section_title"):
            if not merged.get(field) and chunk.get(field):
                merged[field] = chunk[field]

    def determine_confidence(self, docs: list[dict]) -> str:
        if not docs:
            return "low"

        scores = [self.get_doc_relevance_score(doc) for doc in docs]
        top_score = max(scores)
        
        # Calculate source diversity using document_id, not filename
        unique_docs = set(doc.get("document_id") for doc in docs if doc.get("document_id"))

        if len(unique_docs) >= 3 and top_score >= 0.5:
            score_spread = max(scores) - min(scores)
            if score_spread > 0.3:
                return "multi_source"

        if top_score >= 0.7:
            return "high"
        elif top_score >= 0.3:
            return "medium"
        else:
            return "low"

    def assign_evidence_ids(self, docs: list[dict]) -> list[dict]:
        """Assigns deterministic unique evidence IDs [E1], [E2], ... per retrieved chunk."""
        for idx, doc in enumerate(docs, 1):
            doc["evidence_id"] = f"[E{idx}]"
        return docs

    def build_context_text(self, docs: list[dict]) -> str:
        """Formats retrieved chunks into clear, distinct evidence blocks."""
        context_parts = []
        for doc in docs:
            evidence_id = doc.get("evidence_id", "[E?]")
            filename = doc.get("filename", "Document")
            
            # Format page numbers
            page_start = doc.get("page_start")
            page_end = doc.get("page_end")
            page_str = ""
            if page_start is not None:
                if page_end is not None and page_end != page_start:
                    page_str = f" | Pages {page_start}-{page_end}"
                else:
                    page_str = f" | Page {page_start}"
                    
            section_title = doc.get("section_title") or ""
            section_str = f" | Section: {section_title}" if section_title else ""
            
            relevance = self.get_doc_relevance_score(doc)
            score_label = f" [relevance: {relevance:.2f}]" if relevance > 0 else ""
            
            content = doc.get("content", "").strip()
            
            context_parts.append(
                f"--- EVIDENCE {evidence_id} ---\n"
                f"Source: {filename}{page_str}{section_str}{score_label}\n"
                f"Content:\n{content}\n"
                f"----------------------"
            )
        return "\n\n".join(context_parts)
