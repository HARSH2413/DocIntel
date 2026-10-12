from app.core.config import settings
from app.infrastructure.supabase_adapter import SupabaseAdapter
from app.infrastructure.fastembed_adapter import FastEmbedAdapter
from app.infrastructure.reranker_adapter import RerankerAdapter
from app.services.retrieval_engine import RetrievalEngine

db = SupabaseAdapter(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
emb = FastEmbedAdapter(settings.EMBEDDING_MODEL_NAME)
rerank = RerankerAdapter(settings.RERANKER_MODEL_NAME)
engine = RetrievalEngine(db, db, emb, rerank, retrieval_top_k=50, reranker_top_k=10)

query = "give me all fundamental rights"
box_id = "38d5966f-f8da-4cd7-9e83-406b08e31f73"

docs = engine.retrieve_documents(query, box_id)
print(f"Retrieved docs count: {len(docs)}")
for i, d in enumerate(docs):
    score = d.get("rerank_score", 0)
    content = d.get("content", "").replace("\n", " ")[:150]
    print(f"[{i+1}] score={score:.3f} | {content}")
