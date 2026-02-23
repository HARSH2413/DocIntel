from app.infrastructure.supabase_adapter import SupabaseAdapter
from app.infrastructure.fastembed_adapter import FastEmbedAdapter
from app.infrastructure.groq_adapter import GroqAdapter
from app.services.chat_service import ChatService
from app.services.ingestion_service import IngestionService

# 1. Instantiate the specific hardware/software tools
db_adapter = SupabaseAdapter()
embedder_adapter = FastEmbedAdapter()
llm_adapter = GroqAdapter()

# 2. Wire them into the Chat Service
def get_chat_service() -> ChatService:
    """
    FastAPI will call this function to get a fully configured ChatService.
    """
    return ChatService(
        db=db_adapter, 
        embedder=embedder_adapter, 
        llm=llm_adapter
    )

# 3. Wire them into the Ingestion Service
def get_ingestion_service() -> IngestionService:
    """
    FastAPI will call this function to get a fully configured IngestionService.
    Notice it doesn't need the LLM adapter, just the database and embedder!
    """
    return IngestionService(
        db=db_adapter, 
        embedder=embedder_adapter
    )