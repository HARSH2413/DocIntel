from typing import List
from fastembed import TextEmbedding
from app.interfaces.embedder import IEmbedder

class FastEmbedAdapter(IEmbedder):
    def __init__(self):
        # We use this specific model because it perfectly outputs 384 dimensions
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

    def embed_text(self, text_chunks: List[str]) -> List[List[float]]:
        # FastEmbed generates numpy arrays, we convert them to standard Python lists for Postgres
        embeddings = list(self.model.embed(text_chunks))
        return [embedding.tolist() for embedding in embeddings]