from abc import ABC, abstractmethod
from typing import List

class IEmbedder(ABC):
    @abstractmethod
    def embed_text(self, text_chunks: List[str]) -> List[List[float]]:
        """
        Converts document passages into vectors (used at ingestion time).
        """
        pass

    @abstractmethod
    def embed_queries(self, queries: List[str]) -> List[List[float]]:
        """
        Converts search queries into vectors. Models may encode queries differently
        from passages (e.g. BGE's retrieval instruction), so retrieval must use this.
        """
        pass