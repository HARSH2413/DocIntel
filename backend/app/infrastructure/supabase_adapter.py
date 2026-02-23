from typing import List, Dict, Any
from supabase import create_client, Client
from app.interfaces.vector_store import IVectorStore
from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

class SupabaseAdapter(IVectorStore):
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("Missing Supabase credentials in .env")
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    def save_documents(self, records: List[Dict[str, Any]]) -> int:
        response = self.client.table("documents").insert(records).execute()
        return len(response.data)

    def search_similar(self, query_vector: List[float], tenant_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        response = self.client.rpc(
            "match_documents",
            {
                "query_embedding": query_vector,
                "match_threshold": 0.5,
                "match_count": limit,
                "filter_tenant_id": tenant_id
            }
        ).execute()
        return response.data

    # 🛡️ THE NEW ERASER AND SHIELD METHODS
    def document_exists(self, filename: str, tenant_id: str) -> bool:
        response = self.client.table("documents").select("id").eq("tenant_id", tenant_id).eq("filename", filename).limit(1).execute()
        return len(response.data) > 0

    def delete_document(self, filename: str, tenant_id: str) -> bool:
        response = self.client.table("documents").delete().eq("tenant_id", tenant_id).eq("filename", filename).execute()
        # If we deleted at least 1 chunk, it was a success
        return len(response.data) > 0
    
    def get_all_documents(self, tenant_id: str) -> List[str]:
        """Fetches a list of all unique filenames for a tenant."""
        response = self.client.table("documents").select("filename").eq("tenant_id", tenant_id).execute()
        # Extract unique filenames using a Python set
        unique_files = list(set([row["filename"] for row in response.data]))
        return unique_files
    

    # ==========================================
    # 🧠 STATEFUL MEMORY METHODS (ActionRAG V1)
    # ==========================================

    def create_chat_session(self, tenant_id: str, title: str = "New Conversation") -> str:
        """Creates a new blank chat room and returns the session_id."""
        response = self.client.table("chat_sessions").insert({
            "tenant_id": tenant_id,
            "title": title
        }).execute()
        return response.data[0]["id"]

    def get_chat_history(self, session_id: str) -> list:
        """Fetches the entire conversation history in chronological order."""
        response = self.client.table("chat_messages") \
            .select("role, content") \
            .eq("session_id", session_id) \
            .order("created_at") \
            .execute()
        return response.data

    def save_chat_message(self, session_id: str, role: str, content: str):
        """Saves a single message (either 'user' or 'assistant') to the database."""
        self.client.table("chat_messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content
        }).execute()