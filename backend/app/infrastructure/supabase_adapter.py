"""
Supabase Adapter — all DB operations with retry resilience.

Wraps every call with tenacity retries so transient network errors
(connection resets, timeouts) don't crash the entire request.
"""
import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions
from postgrest.exceptions import APIError
from tenacity import retry, stop_after_attempt, wait_random_exponential, retry_if_exception
from app.interfaces.vector_store import IVectorStore
from app.core.logger import logger
from app.core.config import settings

# Define a tuple of exceptions that are safe to retry.
# Retrying on all `Exception` types can be dangerous, as it might hide
# permanent errors (like auth issues or bad SQL) and lead to repeated,
# failing requests. We should only retry on transient network-related issues.
RETRYABLE_EXCEPTIONS = (
    httpx.ConnectError,
    httpx.ReadTimeout,
    httpx.ConnectTimeout,
    httpx.RemoteProtocolError,  # "Server disconnected": Supabase closed a pooled connection
    httpx.ReadError,            # connection reset while reading (WinError 10054 on Windows)
    httpx.WriteError,           # connection dropped before the request was fully sent
)

def is_transient_error(e: BaseException) -> bool:
    if isinstance(e, RETRYABLE_EXCEPTIONS):
        return True
    
    if isinstance(e, APIError):
        msg = str(getattr(e, 'message', '')).lower()
        code = str(getattr(e, 'code', '')).lower()
        
        # 429 Rate Limit
        if "rate limit" in msg or "too many requests" in msg or code == "429":
            return True
            
        # 5xx Server Errors
        if any(err in msg for err in ["502", "503", "504", "bad gateway", "service unavailable", "timeout"]):
            return True
            
        if code in ("500", "502", "503", "504"):
            return True

    return False

class SupabaseAdapter(IVectorStore):
    def __init__(self, url: str, service_key: str, max_retries: int = 3):
        if not url or not service_key:
            raise ValueError("Missing Supabase credentials — set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        # HTTP/1.1 instead of the SDK's default HTTP/2. A sync HTTP/2 client funnels every
        # request thread through one shared connection, so when Supabase closes it while idle,
        # every in-flight request fails at once with "Server disconnected". With HTTP/1.1 each
        # request gets its own pooled connection, and httpx checks it is alive before reuse.
        http_client = httpx.Client(
            http2=False,
            timeout=settings.REQUEST_TIMEOUT,
            follow_redirects=True,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
        self.client: Client = create_client(url, service_key, options=SyncClientOptions(httpx_client=http_client))
        self.max_retries = max_retries
        logger.info("Supabase adapter initialized")

    # ── Document Operations ──


    # ── Box Document Operations (Phase 1B) ──
    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase create_document retry (attempt {rs.attempt_number})"),
    )
    def create_document(self, document: Dict[str, Any]) -> str:
        """Creates a parent document and returns its ID."""
        doc_response = self.client.table("documents").insert(document).execute()
        if not doc_response.data:
            raise RuntimeError("Failed to create document record.")
        return doc_response.data[0]["id"]

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase update_document_status retry (attempt {rs.attempt_number})"),
    )
    def update_document_status(self, document_id: str, status: str, error_message: Optional[str] = None) -> None:
        """Updates the processing status of a document."""
        update_data = {"status": status}
        if error_message is not None:
            update_data["error_message"] = error_message
        self.client.table("documents").update(update_data).eq("id", document_id).execute()

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase save_document_chunks retry (attempt {rs.attempt_number})"),
    )
    def save_document_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """Saves a batch of chunks for a document idempotently."""
        response = self.client.table("document_chunks").upsert(
            chunks,
            on_conflict="document_id,chunk_index"
        ).execute()
        return len(response.data)

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase search_dense retry (attempt {rs.attempt_number})"),
    )
    def search_dense(self, query_vector: list[float], box_id: str, limit: int = 20) -> list[dict]:
        """Runs the Dense Search RPC in Supabase (Box scoped)."""
        response = self.client.rpc(
            "match_documents_dense_box",
            {
                "query_embedding": query_vector,
                "match_box_id": box_id,
                "match_count": limit,
            },
        ).execute()
        logger.info(f"Dense search returned {len(response.data)} docs for box={box_id}")
        return response.data

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase delete_document retry (attempt {rs.attempt_number})"),
    )
    def delete_document(self, document_id: str, box_id: str) -> bool:
        response = (
            self.client.table("documents")
            .delete()
            .eq("box_id", box_id)
            .eq("id", document_id)
            .execute()
        )
        return len(response.data) > 0

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase delete_chunks_by_document retry (attempt {rs.attempt_number})"),
    )
    def delete_chunks_by_document(self, document_id: str) -> None:
        """Deletes all chunks belonging to a specific document without deleting the document itself."""
        self.client.table("document_chunks").delete().eq("document_id", document_id).execute()

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase count_document_chunks retry (attempt {rs.attempt_number})"),
    )
    def count_document_chunks(self, document_id: str) -> int:
        """Number of chunks stored for a document, used to verify ingestion completeness."""
        response = (
            self.client.table("document_chunks")
            .select("id", count="exact", head=True)
            .eq("document_id", document_id)
            .execute()
        )
        return response.count or 0

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase fail_stale_processing_documents retry (attempt {rs.attempt_number})"),
    )
    def fail_stale_processing_documents(self, older_than_minutes: int, error_message: str, box_id: Optional[str] = None) -> int:
        """Marks documents stuck in 'processing' longer than the cutoff as failed. Returns how many."""
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=older_than_minutes)).isoformat()
        query = (
            self.client.table("documents")
            .update({"status": "failed", "error_message": error_message})
            .eq("status", "processing")
            .lt("created_at", cutoff)
        )
        if box_id:
            query = query.eq("box_id", box_id)
        response = query.execute()
        return len(response.data or [])

    def stored_embedding_dimension(self) -> Optional[int]:
        """Length of one stored chunk vector, or None if nothing has been embedded yet."""
        response = self.client.table("document_chunks").select("embedding").limit(1).execute()
        if not response.data or response.data[0].get("embedding") is None:
            return None
        vector = response.data[0]["embedding"]
        if isinstance(vector, str):  # pgvector is serialized as "[0.1,0.2,...]"
            vector = vector.strip("[]").split(",")
        return len(vector)

    def count_documents(self, box_id: str) -> int:
        """Number of documents in a box (any status), for the per-box quota."""
        response = (
            self.client.table("documents")
            .select("id", count="exact", head=True)
            .eq("box_id", box_id)
            .execute()
        )
        return response.count or 0

    def get_document_metadata(self, box_id: str) -> List[Dict[str, Any]]:
        """Returns one record per document for the library UI."""
        response = (
            self.client.table("documents")
            .select("id, filename, file_hash, created_at, status, error_message")
            .eq("box_id", box_id)
            .order("created_at", desc=True)
            .execute()
        )
        documents = []
        for row in response.data:
            documents.append({
                "id": row.get("id"),
                "filename": row.get("filename"),
                "file_hash": row.get("file_hash"),
                "created_at": row.get("created_at"),
                "status": row.get("status", "completed"), # Fallback to completed for older docs
                "error_message": row.get("error_message"),
            })
        return documents

    # ── Chat Session Operations ──

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase create_chat_session retry (attempt {rs.attempt_number})"),
    )
    def create_chat_session(self, box_id: str, title: str = "New Conversation") -> str:
        """Creates a new blank chat room and returns the session_id."""
        response = self.client.table("chat_sessions").insert({
            "box_id": box_id,
            "title": title,
        }).execute()
        return response.data[0]["id"]

    def list_chat_sessions(self, box_id: str, limit: int = 50) -> list:
        """Lists the most recent conversations for one box."""
        response = self.client.table("chat_sessions").select("id, title, created_at").eq("box_id", box_id).order("created_at", desc=True).limit(limit).execute()
        return response.data

    def rename_chat_session(self, session_id: str, box_id: str, title: str) -> bool:
        response = self.client.table("chat_sessions").update({"title": title}).eq("id", session_id).eq("box_id", box_id).execute()
        return bool(response.data)

    def delete_chat_session(self, session_id: str, box_id: str) -> bool:
        """Deletes a conversation; chat_messages must cascade at the database level."""
        response = self.client.table("chat_sessions").delete().eq("id", session_id).eq("box_id", box_id).execute()
        return bool(response.data)

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase get_chat_history retry (attempt {rs.attempt_number})"),
    )
    def get_chat_history(self, session_id: str, box_id: str) -> list:
        """Fetches history only when the session belongs to the requested box."""
        session = (
            self.client.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("box_id", box_id)
            .limit(1)
            .execute()
        )
        if not session.data:
            return []
        response = (
            self.client.table("chat_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .in_("role", ["user", "assistant"])
            .order("created_at")
            .execute()
        )
        return response.data

    def session_belongs_to_box(self, session_id: str, box_id: str) -> bool:
        """Checks ownership before a request can read from or write to a chat session."""
        response = (
            self.client.table("chat_sessions")
            .select("id")
            .eq("id", session_id)
            .eq("box_id", box_id)
            .limit(1)
            .execute()
        )
        return bool(response.data)

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase save_chat_message retry (attempt {rs.attempt_number})"),
    )
    def save_chat_message(self, session_id: str, role: str, content: str):
        """Saves a single message (either 'user' or 'assistant') to the database."""
        self.client.table("chat_messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
        }).execute()

    # ── Neighbor Context (Parent-Child Retrieval) ──

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase get_multi_neighboring_chunks retry (attempt {rs.attempt_number})"),
    )
    def get_multi_neighboring_chunks(self, requests: list[dict], limit: int = 5) -> dict[str, list[dict]]:
        """
        Bulk fetches neighboring chunks for multiple documents in batches to avoid N+1 queries.
        Returns a dict mapping document_id to a list of its neighboring chunks.
        """
        if not requests:
            return {}

        results = {}
        half_limit = limit // 2
        
        # Process in batches of 10 to avoid URL length limits on GET requests
        batch_size = 10
        for i in range(0, len(requests), batch_size):
            batch = requests[i:i+batch_size]
            or_conditions = []
            
            for req in batch:
                doc_id = req["document_id"]
                c_idx = req["chunk_index"]
                min_idx = max(0, c_idx - half_limit)
                max_idx = c_idx + half_limit
                or_conditions.append(f"and(document_id.eq.{doc_id},chunk_index.gte.{min_idx},chunk_index.lte.{max_idx})")
                
            or_str = ",".join(or_conditions)
            
            response = (
                self.client.table("document_chunks")
                .select("id, document_id, content, chunk_index, page_start, page_end, section_title, metadata")
                .or_(or_str)
                .order("chunk_index")
                .execute()
            )
            
            for row in response.data:
                doc_id = row["document_id"]
                if doc_id not in results:
                    results[doc_id] = []
                results[doc_id].append(row)
                
        return results

    # ── Auth Checks (run on every request, so they must survive dropped connections) ──

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase get_auth_user retry (attempt {rs.attempt_number})"),
    )
    def get_auth_user(self, token: str):
        """Validates a user JWT with Supabase Auth and returns the user response."""
        return self.client.auth.get_user(token)

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase get_box_for_user retry (attempt {rs.attempt_number})"),
    )
    def get_box_for_user(self, box_id: str, user_id: str) -> Optional[dict]:
        """The box if this user owns it, else None."""
        response = self.client.table("boxes").select("*").eq("id", box_id).eq("user_id", user_id).execute()
        return response.data[0] if response.data else None

    # ── Box Operations (Phase 1A) ──

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase create_box retry (attempt {rs.attempt_number})"),
    )
    def create_box(self, name: str, user_id: str, description: Optional[str] = None, domain: Optional[str] = None) -> dict:
        payload = {
            "name": name,
            "user_id": user_id,
            "description": description
        }
        if domain:
            payload["domain"] = domain
        response = self.client.table("boxes").insert(payload).execute()
        return response.data[0] if response.data else {}  # type: ignore

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase list_boxes retry (attempt {rs.attempt_number})"),
    )
    def count_boxes(self, user_id: str) -> int:
        """Number of boxes a user owns, for the per-user quota."""
        response = (
            self.client.table("boxes")
            .select("id", count="exact", head=True)
            .eq("user_id", user_id)
            .execute()
        )
        return response.count or 0

    def list_boxes(self, user_id: str) -> list[dict]:
        # Uses Supabase relations to get a count of all documents (including processing/failed)
        response = self.client.table("boxes").select("*, documents(count)").eq("user_id", user_id).order("created_at", desc=True).execute()
        boxes = []
        for box in response.data:
            doc_info = box.pop("documents", [])
            box["document_count"] = doc_info[0]["count"] if doc_info and "count" in doc_info[0] else 0
            boxes.append(box)
        return boxes

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase get_box retry (attempt {rs.attempt_number})"),
    )
    def get_box(self, box_id: str, user_id: str) -> Optional[dict]:
        # Uses Supabase relations to get a count of all documents (including processing/failed)
        response = self.client.table("boxes").select("*, documents(count)").eq("id", box_id).eq("user_id", user_id).execute()
        if not response.data:
            return None
        box = response.data[0]
        doc_info = box.pop("documents", [])
        box["document_count"] = doc_info[0]["count"] if doc_info and "count" in doc_info[0] else 0
        return box

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase update_box retry (attempt {rs.attempt_number})"),
    )
    def update_box(self, box_id: str, user_id: str, data: dict) -> Optional[dict]:
        response = self.client.table("boxes").update(data).eq("id", box_id).eq("user_id", user_id).execute()
        return response.data[0] if response.data else None  # type: ignore

    @retry(
        stop=stop_after_attempt(settings.DB_MAX_RETRIES),
        wait=wait_random_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(is_transient_error),
        before_sleep=lambda rs: logger.warning(f"Supabase delete_box retry (attempt {rs.attempt_number})"),
    )
    def delete_box(self, box_id: str, user_id: str) -> bool:
        response = self.client.table("boxes").delete().eq("id", box_id).eq("user_id", user_id).execute()
        return bool(response.data)
