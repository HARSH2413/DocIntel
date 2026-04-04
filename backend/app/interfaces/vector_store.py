from abc import ABC, abstractmethod
from typing import List, Dict, Any

class IVectorStore(ABC):
    @abstractmethod
    def save_documents(self, records: List[Dict[str, Any]]) -> int:
        pass

    @abstractmethod
    def search_similar(self, query_vector: list[float], query_text: str, tenant_id: str, limit: int = 5) -> list[dict]:
        pass

    # 🛡️ THE NEW RULES
    @abstractmethod
    def document_exists(self, filename: str, tenant_id: str) -> bool:
        """Checks if a document is already in the database."""
        pass

    @abstractmethod
    def delete_document(self, filename: str, tenant_id: str) -> bool:
        """Deletes all chunks of a specific document."""
        pass