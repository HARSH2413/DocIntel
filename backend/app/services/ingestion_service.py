import fitz  # PyMuPDF
import docx
import io
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.interfaces.vector_store import IVectorStore
from app.interfaces.embedder import IEmbedder

class IngestionService:
    def __init__(self, db: IVectorStore, embedder: IEmbedder):
        self.db = db
        self.embedder = embedder
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=500)

    def process_file(self, file_bytes: bytes, filename: str, tenant_id: str) -> int:
        # 🛡️ THE SHIELD: Reject duplicates instantly
        if self.db.document_exists(filename, tenant_id):
            raise FileExistsError(f"Document '{filename}' already exists. Please delete it first to update.")

        # 1. Extract Text
        raw_text = self._extract_text(file_bytes, filename)
        
        # 2. Chunk Text
        chunks = self.text_splitter.split_text(raw_text)
        
        # 3. Embed Text
        embeddings = self.embedder.embed_text(chunks)
        
        # 4. Prepare & Save
        records = [{
            "tenant_id": tenant_id,
            "filename": filename,
            "content": chunk,
            "embedding": embeddings[i]
        } for i, chunk in enumerate(chunks)]
            
        return self.db.save_documents(records)

    def delete_file(self, filename: str, tenant_id: str) -> bool:
        # 🧹 THE ERASER
        return self.db.delete_document(filename, tenant_id)

    def _extract_text(self, file_bytes: bytes, filename: str) -> str:
        # ... (Keep your existing _extract_text code exactly the same here) ...
        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf"):
            text = ""
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text("text") + "\n"
            doc.close()
            return text
        elif filename_lower.endswith(".docx"):
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        elif filename_lower.endswith(".txt"):
            return file_bytes.decode('utf-8')
        else:
            raise ValueError(f"Unsupported file type: {filename}. Please use PDF, DOCX, or TXT.")
    
    def list_files(self, tenant_id: str) -> List[str]:
        # Uses the DB adapter to get the list
        return self.db.get_all_documents(tenant_id)