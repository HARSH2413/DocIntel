Enterprise-style, tenant-aware Retrieval-Augmented Generation (RAG) knowledge assistant built with Next.js, FastAPI, Supabase/pgvector, Groq, and local embedding/reranking models.

ActionRAG lets users build a searchable knowledge base from documents and Google Drive content, then ask natural-language questions and receive grounded answers with source citations.

✨ Highlights

🤖 Grounded Q&A — answers are generated from retrieved knowledge-base content instead of relying only on the LLM's internal knowledge.

🔎 Hybrid retrieval — combines semantic/vector retrieval with text-based search through Supabase/PostgreSQL.

🎯 Local reranking — retrieved chunks are reranked with Xenova/ms-marco-MiniLM-L-12-v2.

📚 Document ingestion — upload PDF, DOCX, TXT, CSV, XLS/XLSX and process files in the background.

☁️ Google Drive integration — recursively sync folders and subfolders, including Google Docs, Sheets and Slides.

🧠 Conversation memory — chat sessions and message history are persisted in Supabase.

🧾 Citations — responses can include the source filename, retrieved content and relevance scores.

🛡️ Duplicate protection — uploaded files are SHA-256 fingerprinted to prevent duplicate ingestion.

⚡ Performance-focused — local embeddings/reranking, configurable retrieval depth, caching infrastructure and retry handling.

🚦 Rate limiting & resilience — API rate limits plus retry/backoff handling for transient Groq/Supabase failures.

🎛️ Config-driven RAG — expensive features such as HyDE, multi-query retrieval, neighbor context and follow-up generation can be enabled/disabled through environment variables.

🏗️ Architecture

┌──────────────────────────────┐
│       Next.js Frontend       │
│  Chat • Knowledge Base • UI  │
└──────────────┬───────────────┘
               │ REST / JSON
               ▼
┌──────────────────────────────┐
│        FastAPI Backend       │
│                              │
│  Chat API                    │
│  Document Upload             │
│  Document Management         │
│  Google Drive Sync           │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌───────────────┐
│ Supabase    │  │ Local Models  │
│ PostgreSQL  │  │               │
│ + pgvector  │  │ FastEmbed     │
│             │  │ Reranker      │
│ Documents   │  └───────────────┘
│ Chat history│
└──────┬──────┘
       │
       │ Retrieved context
       ▼
┌──────────────────────────────┐
│          Groq LLM            │
│  Configurable Llama model    │
└──────────────────────────────┘

Optional:
Google Drive ──► ingestion pipeline ──► Supabase

RAG pipeline

Document
   │
   ▼
File validation + SHA-256 deduplication
   │
   ▼
Text extraction
   │
   ▼
Chunking
   │
   ▼
Local embeddings
   │
   ▼
Supabase / pgvector
   │
   │
User question
   ▼
Optional query rewriting
   │
   ▼
Hybrid retrieval
   │
   ▼
Local cross-encoder reranking
   │
   ▼
Relevant context
   │
   ▼
Groq LLM
   │
   ▼
Grounded answer + citations

🧰 Tech Stack

Frontend

Technology

Purpose

Next.js 16

React application framework

React 19

UI

TypeScript

Type-safe frontend development

Tailwind CSS 4

Styling

React Markdown

Markdown answer rendering

React PDF

PDF-related UI

Lucide React

Icons

Axios / Fetch

API communication

Backend

Technology

Purpose

Python

Backend language

FastAPI

REST API

Pydantic Settings

Configuration management

SlowAPI

Rate limiting

Uvicorn

ASGI server

Tenacity

Retry/backoff handling

FastEmbed

Local text embeddings

PyMuPDF

PDF processing

python-docx

DOCX processing

openpyxl

Spreadsheet processing

AI / Data

Technology

Purpose

Groq

LLM inference

Llama

Configurable generation model

FastEmbed

Local embeddings

BGE

Embedding model

MS MARCO MiniLM

Local reranking

Supabase

PostgreSQL backend

pgvector

Vector similarity search

Integrations

Google Drive API

Google Workspace export APIs

Supabase PostgreSQL / RPC

Optional Redis-compatible caching

📁 Project Structure

Action.ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat.py
│   │   │   ├── chat_streaming.py
│   │   │   ├── documents.py
│   │   │   ├── drive.py
│   │   │   └── upload.py
│   │   │
│   │   ├── core/
│   │   │   ├── cache.py
│   │   │   ├── config.py
│   │   │   ├── dependencies.py
│   │   │   ├── logger.py
│   │   │   └── rate_limiter.py
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── fastembed_adapter.py
│   │   │   ├── google_drive_adapter.py
│   │   │   ├── groq_adapter.py
│   │   │   ├── reranker_adapter.py
│   │   │   └── supabase_adapter.py
│   │   │
│   │   ├── interfaces/
│   │   │   ├── embedder.py
│   │   │   ├── llm.py
│   │   │   ├── reranker.py
│   │   │   └── vector_store.py
│   │   │
│   │   └── services/
│   │       ├── chat_service.py
│   │       ├── chat_service_optimized.py
│   │       ├── ingestion_service.py
│   │       └── query_rewriter.py
│   │
│   ├── main.py
│   ├── requirements.txt
│   └── supabase_migration_rrf.sql
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   └── StreamingChat.tsx
│   │   └── lib/
│   │       └── config.ts
│   ├── package.json
│   └── next.config.ts
│
├── .env.template
├── deploy-free-tier.sh
├── PERFORMANCE_OPTIMIZATION_GUIDE.md
└── QUICK_START_SPEED.md

🚀 Getting Started

Prerequisites

Make sure you have:

Python 3.10+

Node.js 18+

A Supabase project

A Groq API key

Google Drive credentials only if Drive synchronization is required

1. Clone the repository

git clone https://github.com/HARSH2413/Action.ai.git
cd Action.ai

If the repository is private, make sure your GitHub account has access before cloning.

2. Configure Supabase

Create a Supabase project and configure PostgreSQL/pgvector.

Run the SQL migration included in:

backend/supabase_migration_rrf.sql

The backend expects a documents table and the hybrid-search RPC used by the application.

The Supabase adapter performs hybrid retrieval through:

match_documents_hybrid

3. Configure the backend

Copy the environment template:

cp .env.template .env

Then set at least:

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key

For Google Drive synchronization:

GOOGLE_DRIVE_FOLDER_ID=your-folder-id

Important

Never commit .env, API keys, service-role keys, or Google credentials to Git.

4. Install backend dependencies

cd backend

python -m venv .venv

Windows

.venv\Scripts\activate

macOS / Linux

source .venv/bin/activate

Install dependencies:

pip install -r requirements.txt

5. Start the backend

From the backend directory:

uvicorn main:app --reload --host 0.0.0.0 --port 8000

Backend:

http://localhost:8000

Interactive Swagger documentation:

http://localhost:8000/docs

Health check:

http://localhost:8000/

6. Configure and start the frontend

Open another terminal:

cd frontend
npm install

Configure the frontend API URL in:

frontend/src/lib/config.ts

Then start Next.js:

npm run dev

Open:

http://localhost:3000

For a production build:

npm run build
npm start

📡 API Reference

The backend exposes versioned endpoints under /api/v1.

Chat

Create a session

POST /api/v1/chat/sessions

Example:

{
  "tenant_id": "your-tenant-id",
  "title": "Company Policies"
}

Send a question

POST /api/v1/chat/

Example:

{
  "question": "What is the leave policy?",
  "tenant_id": "your-tenant-id",
  "session_id": "your-session-id"
}

Typical response:

{
  "answer": "The leave policy states ...",
  "key_takeaways": [],
  "related_questions": [],
  "citations": [
    {
      "filename": "leave_policy.pdf",
      "content": "...",
      "similarity": 0.87
    }
  ],
  "session_id": "your-session-id",
  "confidence": "high"
}

Get session history

GET /api/v1/chat/sessions/{session_id}

Documents

Upload a document

POST /api/v1/upload/

Form fields:

file
tenant_id

Files are streamed to disk, hashed with SHA-256 and queued for background ingestion.

Duplicate file content is rejected before another copy is indexed.

List documents

GET /api/v1/documents/?tenant_id=your-tenant-id

Delete a document

DELETE /api/v1/documents/?filename=document.pdf&tenant_id=your-tenant-id

Google Drive

Import a specific file

POST /api/v1/drive/process

Synchronize a configured folder

POST /api/v1/drive/sync

The sync process:

Crawls the configured folder recursively.

Detects supported files.

Exports Google Docs → PDF.

Exports Google Sheets → CSV.

Exports Google Slides → TXT.

Downloads native PDF/DOCX/TXT/CSV/XLS/XLSX files.

Performs hash-based duplicate detection.

Queues files for background ingestion.

Force a complete re-sync using:

force_resync=true

📄 Supported Documents

The ingestion pipeline supports:

PDF

DOCX

TXT

CSV

XLS

XLSX

Google Docs

Google Sheets

Google Slides

Google Workspace files are exported to supported formats before being processed.

🔍 Retrieval & RAG Configuration

ActionRAG is intentionally configurable.

Important settings include:

LLM_MODEL_NAME=llama-3.1-8b-instant
EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
RERANKER_MODEL_NAME=Xenova/ms-marco-MiniLM-L-12-v2

RETRIEVAL_TOP_K=20
RERANKER_TOP_K=5

MIN_RELEVANCE_SCORE=0.3
CHUNK_SIZE=1000
CHUNK_OVERLAP=300

Optional advanced retrieval

ENABLE_QUERY_REWRITE=true
ENABLE_HYDE=false
ENABLE_MULTI_QUERY=false
ENABLE_NEIGHBOR_CONTEXT=false

These features can improve retrieval quality but may increase latency and LLM/API usage.

⚡ Performance

The repository includes dedicated performance documentation:

QUICK_START_SPEED.md

PERFORMANCE_OPTIMIZATION_GUIDE.md

The project is designed around a low-cost deployment model using:

Next.js / Vercel
       ↓
FastAPI
       ↓
Supabase + pgvector
       ↓
Local embeddings + reranker
       ↓
Groq

Performance-sensitive features can be disabled through environment variables instead of modifying application code.

🛡️ Reliability & Safety Features

Hash-based duplicate detection

Files are fingerprinted with SHA-256 before ingestion:

file → SHA-256 → database lookup → ingest only if new

Retry handling

Transient external-service failures are handled with retry/backoff logic for:

Groq

Supabase

Network operations

Rate limiting

Chat endpoints use configurable rate limiting:

RATE_LIMIT_CHAT=20/minute

CORS

Allowed frontend origins are configured through:

CORS_ORIGINS=http://localhost:3000

For production, replace this with the actual frontend origin rather than using *.

🔐 Security Notes

Before deploying this project publicly:

Keep SUPABASE_SERVICE_KEY server-side.

Never expose GROQ_API_KEY to the browser.

Never commit .env.

Never commit google_credentials.json.

Replace the current hardcoded frontend tenant ID with authenticated user/tenant context.

Restrict CORS_ORIGINS to trusted domains.

Add authentication/authorization before using the application as a multi-user production system.

Current implementation note: the frontend currently contains a hardcoded tenant ID. This is suitable for development/testing but should be replaced with an authentication-backed tenant context for production.

🧪 Development

Backend

cd backend
uvicorn main:app --reload

Frontend

cd frontend
npm run dev

Lint

cd frontend
npm run lint

Production frontend build

cd frontend
npm run build

🚢 Deployment

The repository includes deployment guidance for a low-cost/free-tier architecture.

Recommended architecture:

Layer

Suggested Service

Frontend

Vercel

Backend

Railway / Render

Database

Supabase

LLM

Groq

Embeddings

FastEmbed locally

Reranking

Local cross-encoder

File source

Google Drive

See:

QUICK_START_SPEED.md
PERFORMANCE_OPTIMIZATION_GUIDE.md
deploy-free-tier.sh

for additional deployment and optimization details.

🗺️ Roadmap

Potential production improvements:

Authentication and user accounts

Dynamic tenant management

Role-based access control

Streaming responses enabled in the main application flow

Better document preview and source navigation

Background job queue for large ingestion workloads

Redis-backed distributed caching

Automated tests and CI/CD

Observability and metrics

Document-level permissions

Production-grade secret management

🤝 Contributing

Contributions are welcome.

A typical workflow:

git checkout -b feature/your-feature

Make your changes, test them locally, then:

git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature

Open a pull request with:

What changed

Why it changed

How it was tested

Any configuration or migration requirements

📜 License

No license file is currently included in the repository.

If this project is intended to be open source, add an appropriate LICENSE file before publishing it publicly.

👨‍💻 Author

Harsh Malokar

Built as an AI-powered knowledge assistant focused on grounded enterprise Q&A, document retrieval and practical RAG performance.

⭐ Why ActionRAG?

Traditional chatbots answer from a model's learned knowledge.

ActionRAG takes a different approach:

Your documents
      ↓
Structured ingestion
      ↓
Semantic + keyword retrieval
      ↓
Reranking
      ↓
Relevant context
      ↓
LLM
      ↓
Grounded answer
      ↓
Citations

The goal is simple:

Ask questions about your organization's knowledge and get answers grounded in the information you actually provided.
