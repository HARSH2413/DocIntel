from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class IVectorStore(ABC):
    """
    Interface for database and vector operations.
    Despite the name 'IVectorStore', this interface currently serves as the 
    primary data access layer (Repository) for:
    - Document management (upload, metadata, deletion)
    - Vector search (hybrid RRF search, neighboring chunks)
    - Chat session management (history, conversations, metadata)
    """
    @abstractmethod
    def create_document(self, document: Dict[str, Any]) -> str:
        """Creates a parent document and returns its ID."""
        pass

    @abstractmethod
    def update_document_status(self, document_id: str, status: str, error_message: Optional[str] = None) -> None:
        """Updates the status and optional error message of a document."""
        pass
        
    @abstractmethod
    def save_document_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Saves a batch of chunks for a document."""
        pass

    @abstractmethod
    def search_dense(self, query_vector: list[float], box_id: str, limit: int = 20) -> list[dict]:
        """
        Executes a dense search (vector similarity using pgvector).
        Returns list of dicts containing chunk data and retrieval scores (embedding_score).
        """
        pass

    @abstractmethod
    def delete_document(self, document_id: str, box_id: str) -> bool:
        """Deletes a document and its chunks via cascading delete."""
        pass

    @abstractmethod
    def delete_chunks_by_document(self, document_id: str) -> None:
        """Deletes all chunks belonging to a specific document without deleting the document itself."""
        pass

    @abstractmethod
    def count_document_chunks(self, document_id: str) -> int:
        """Number of chunks stored for a document, used to verify ingestion completeness."""
        pass

    @abstractmethod
    def fail_stale_processing_documents(self, older_than_minutes: int, error_message: str, box_id: Optional[str] = None) -> int:
        """Marks documents stuck in 'processing' longer than the cutoff as failed. Returns how many."""
        pass

    @abstractmethod
    def count_documents(self, box_id: str) -> int:
        """Number of documents in a box, used for upload quotas."""
        pass

    @abstractmethod
    def get_document_metadata(self, box_id: str) -> List[Dict[str, Any]]:
        """Returns one record per document for the library UI."""
        pass
        
    @abstractmethod
    def get_multi_neighboring_chunks(self, requests: list[dict], limit: int = 5) -> dict[str, list[dict]]:
        """Bulk fetches neighboring chunks for multiple documents to avoid N+1 queries."""
        pass

    # ── Chat Session Operations ──

    @abstractmethod
    def create_chat_session(self, box_id: str, title: str = "New Conversation") -> str:
        pass

    @abstractmethod
    def list_chat_sessions(self, box_id: str, limit: int = 50) -> list:
        pass

    @abstractmethod
    def rename_chat_session(self, session_id: str, box_id: str, title: str) -> bool:
        pass

    @abstractmethod
    def delete_chat_session(self, session_id: str, box_id: str) -> bool:
        pass

    @abstractmethod
    def get_chat_history(self, session_id: str, box_id: str) -> list:
        pass

    @abstractmethod
    def session_belongs_to_box(self, session_id: str, box_id: str) -> bool:
        pass

    @abstractmethod
    def save_chat_message(self, session_id: str, role: str, content: str):
        pass