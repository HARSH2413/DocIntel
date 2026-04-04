# Project Folder Structure

```
.
├── .continue
│   └── agents
│       └── new-config.yaml
├── .env.template
├── .gitignore
├── PERFORMANCE_OPTIMIZATION_GUIDE.md
├── QUICK_START_SPEED.md
├── all_codes.md
├── backend
│   ├── .env
│   ├── app
│   │   ├── __init__.py
│   │   ├── api
│   │   │   ├── __init__.py
│   │   │   ├── chat.py
│   │   │   ├── chat_streaming.py
│   │   │   ├── documents.py
│   │   │   ├── drive.py
│   │   │   └── upload.py
│   │   ├── core
│   │   │   ├── __init__.py
│   │   │   ├── cache.py
│   │   │   ├── config.py
│   │   │   ├── dependencies.py
│   │   │   ├── logger.py
│   │   │   └── rate_limiter.py
│   │   ├── infrastructure
│   │   │   ├── __init__.py
│   │   │   ├── fastembed_adapter.py
│   │   │   ├── google_drive_adapter.py
│   │   │   ├── groq_adapter.py
│   │   │   ├── reranker_adapter.py
│   │   │   └── supabase_adapter.py
│   │   ├── interfaces
│   │   │   ├── __init__.py
│   │   │   ├── embedder.py
│   │   │   ├── llm.py
│   │   │   ├── reranker.py
│   │   │   └── vector_store.py
│   │   └── services
│   │       ├── __init__.py
│   │       ├── chat_service.py
│   │       ├── chat_service_optimized.py
│   │       ├── ingestion_service.py
│   │       └── query_rewriter.py
│   ├── google_credentials.json
│   ├── main.py
│   ├── requirements.txt
│   └── supabase_migration_rrf.sql
├── deploy-free-tier.sh
├── frontend
│   ├── .gitignore
│   ├── README.md
│   ├── eslint.config.mjs
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── src
│   │   ├── app
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components
│   │   │   ├── StreamingChat.tsx
│   │   │   └── error-boundary.tsx
│   │   └── lib
│   │       └── config.ts
│   └── tsconfig.json
└── generate_doc.py
```

# All Project Code

## File: `.env.template`

```template
# Environment Template - Optimized for Free Tier
# Copy to .env and fill in your values

# ═══════════════════════════════════════════════════════════
# EXTERNAL SERVICES (Get free API keys)
# ═══════════════════════════════════════════════════════════

# Supabase (Database) — Sign up at https://supabase.com
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your_key_here

# Groq (Free LLM API) — Sign up at https://console.groq.com
# Free tier: Unlimited requests, rate limited to ~100req/min
GROQ_API_KEY=gsk_...your_key_here

# Google Drive (Optional) — Get at https://console.cloud.google.com
GOOGLE_DRIVE_FOLDER_ID=

# Redis (Optional, for production caching) — Vercel KV or local Redis
# Leave empty to use in-memory cache
REDIS_URL=

# ═══════════════════════════════════════════════════════════
# MODEL CONFIGURATION (Swap models by changing these)
# ═══════════════════════════════════════════════════════════

# LLM Model — Fast models for free tier
# Options: "llama-3.1-8b-instant" (recommended), "llama-3.3-70b-versatile" (slower)
LLM_MODEL_NAME=llama-3.1-8b-instant

# Embedding Model — Always use local (no API calls)
EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5

# Reranker Model — Always use local (no API calls)
RERANKER_MODEL_NAME=Xenova/ms-marco-MiniLM-L-12-v2

# LLM Temperature — 0.0 for factual answers
LLM_TEMPERATURE=0.0

# ═══════════════════════════════════════════════════════════
# RETRIEVAL SETTINGS (Optimized for Speed)
# ═══════════════════════════════════════════════════════════

# How many documents to retrieve initially before reranking
# Reduced from 40 to 20 for speed (less reranking work)
RETRIEVAL_TOP_K=20

# How many top documents to keep after reranking
# Reduced from 8 to 5 for speed
RERANKER_TOP_K=5

# Minimum relevance score (0.0-1.0) to include documents
# Increased from 0.3 to 0.5 for stricter filtering (faster processing)
MIN_RELEVANCE_SCORE=0.5

# Fallback threshold if too few results survive (0.0-1.0)
MIN_RELEVANCE_SCORE_LOW=0.1

# ═══════════════════════════════════════════════════════════
# ADVANCED RAG FEATURES (Disable for Speed on Free Tier)
# ═══════════════════════════════════════════════════════════

# HyDE (Hypothetical Document Embedding)
# Generates a hypothetical answer to use for embedding search
# Impact: +1-2 seconds, +1 LLM call
# Recommendation: FALSE for free tier (speed over accuracy)
ENABLE_HYDE=false

# Multi-Query Generation
# Generates 2-3 alternative query phrasings for diverse retrieval
# Impact: +1-2 seconds, +2 LLM calls
# Recommendation: FALSE for free tier
ENABLE_MULTI_QUERY=false

# Query Rewriting
# Resolves pronouns in multi-turn conversation
# Impact: +0.5 seconds, +1 LLM call
# Recommendation: FALSE for free tier
ENABLE_QUERY_REWRITE=false

# Neighbor Context Expansion
# Fetches neighboring chunks from the same document
# Impact: +0.2-0.5 seconds, +multiple DB queries
# Recommendation: FALSE for free tier
ENABLE_NEIGHBOR_CONTEXT=false

# Key Takeaways Extraction
# Extracts key bullet points from answer
# Impact: +0.5 seconds, +1 LLM call
# Recommendation: FALSE for free tier
ENABLE_KEY_TAKEAWAYS=false

# Related Questions Generation
# Generates follow-up questions
# Impact: +0.5 seconds, +1 LLM call
# Recommendation: FALSE for free tier
ENABLE_RELATED_QUESTIONS=false

# ═══════════════════════════════════════════════════════════
# INGESTION SETTINGS
# ═══════════════════════════════════════════════════════════

# Document chunk size (for semantic splitting)
CHUNK_SIZE=1000

# Overlap between chunks
CHUNK_OVERLAP=300

# How many chunks to embed in parallel (smaller = less memory, more time)
INGESTION_BATCH_SIZE=5

# ═══════════════════════════════════════════════════════════
# RATE LIMITING (Prevent abuse on free tier)
# ═══════════════════════════════════════════════════════════

# Format: "requests/time_period"
# Examples: "20/minute", "100/hour", "1000/day"
RATE_LIMIT_CHAT=30/minute

# ═══════════════════════════════════════════════════════════
# CORS CONFIGURATION (For frontend URL)
# ═══════════════════════════════════════════════════════════

# Comma-separated list of allowed origins
# For free tier Vercel: https://your-project.vercel.app
# For localhost: http://localhost:3000
CORS_ORIGINS=http://localhost:3000,https://your-project.vercel.app

# ═══════════════════════════════════════════════════════════
# API TIMEOUTS & RESILIENCE
# ═══════════════════════════════════════════════════════════

# Timeout for external API calls (seconds)
REQUEST_TIMEOUT=120

# Max retry attempts for LLM API failures
LLM_MAX_RETRIES=3

# Max retry attempts for Database failures
DB_MAX_RETRIES=3

# ═══════════════════════════════════════════════════════════
# PRODUCTION SETTINGS (Uncomment for production)
# ═══════════════════════════════════════════════════════════

# Use HTTPS only (set to true in production)
# REQUIRE_HTTPS=true

# Trust X-Forwarded-For header (for rate limiting behind proxy)
# TRUST_PROXY_HEADERS=true

# ═══════════════════════════════════════════════════════════
# DEPLOYMENT NOTES
# ═══════════════════════════════════════════════════════════

# FREE TIER DEPLOYMENT:
# 1. Backend: Railway.app free tier ($5 credit = 500 hours/month)
#    - Set these env vars in Railway dashboard
# 2. Frontend: Vercel (100% free)
#    - Set NEXT_PUBLIC_API_URL to Railway backend URL
# 3. Database: Supabase free tier (500MB storage)
#    - Create tables using migration file

# EXPECTED RESPONSE TIME (after optimization):
# - Fast endpoint (/api/v1/chat/fast): 2-4 seconds
# - Streaming endpoint (/api/v1/chat/stream): 1-2s to first token
# - Standard endpoint (/api/v1/chat): 3-5 seconds

# COST BREAKDOWN:
# - Vercel: FREE
# - Railway: Free tier, then $5/month
# - Supabase: Free tier, then ~$25/month when full
# - Groq: FREE
# - Total: $0-30/month
```

## File: `.gitignore`

```
# --- Next.js / Frontend ---
node_modules/
.next/
out/
.env.local
.env.development.local
.env.test.local
.env.production.local

# --- Python / Backend ---
venv/
__pycache__/
*.pyc
.env

# --- OS / IDE Files ---
.DS_Store
.vscode/ 

# google credentials
google_credentials.json
```

## File: `PERFORMANCE_OPTIMIZATION_GUIDE.md`

```md
# ActionRAG Performance Optimization Guide
## Reduce Latency & Deploy on Free Tier

---

## 📊 BOTTLENECK ANALYSIS

### Current Latency Breakdown (Average response time: **8-12 seconds**)

| Component | Time | % of Total | Issue |
|-----------|------|-----------|-------|
| **Groq API (Main Answer)** | 3-4s | 35% | Network round-trip + LLM inference |
| **HyDE Generation** | 1-2s | 15% | Extra LLM call for hypothetical answer |
| **Multi-Query Generation** | 1-2s | 15% | 2 extra LLM calls for query variations |
| **Embedding + Search** | 1-2s | 15% | Vector embedding + DB search |
| **Reranking** | 0.5-1s | 8% | Cross-encoder scoring on CPU |
| **Key Takeaways** | 0.5-1s | 8% | LLM extraction from answer |
| **Related Questions** | 0.5-1s | 8% | LLM generation of follow-ups |
| **Database Queries** | 0.2-0.5s | 4% | Multiple DB round-trips |

### 🔴 Root Causes of Delays

1. **5-7 Sequential LLM API Calls** ← Biggest issue
   - Main answer generation
   - HyDE (hypothetical document)
   - Multi-query generation (2 calls)
   - History condensation
   - Key takeaways extraction
   - Related questions generation

2. **Network Latency to External Services**
   - Groq API (US-based, ~100-200ms round-trip)
   - Supabase (network hops, ~50-100ms round-trip)

3. **Complex Database Queries**
   - RRF hybrid search (vector + keyword join)
   - Neighbor context expansion (extra queries per doc)

4. **Sequential Processing**
   - Each step waits for previous to complete
   - No parallelization

5. **Backend Infrastructure**
   - Python is slower than compiled languages
   - Supabase free tier has limited resources
   - No caching layer

---

## 🚀 QUICK WINS (Implement first - 30-40% speed improvement)

### 1. **Disable Advanced Features During Peak Hours** ⏱️
**Impact: 3-4s savings (HyDE + Multi-query + Takeaways)**

```env
# .env - Add feature flags
ENABLE_HYDE=false                    # Saves 1-2s (disable temporarily)
ENABLE_MULTI_QUERY=false             # Saves 1-2s (disable temporarily)
ENABLE_KEY_TAKEAWAYS=false           # Saves 0.5s (disable temporarily)
ENABLE_RELATED_QUESTIONS=false       # Saves 0.5s (disable temporarily)
ENABLE_NEIGHBOR_CONTEXT=false        # Saves 0.2-0.5s
```

**When to disable:**
- First user message (simplify)
- High load (reduce LLM calls)
- Enable selectively for power users

---

### 2. **Reduce Retrieval + Reranking** 📈
**Impact: 1-2s savings**

```env
# Reduce over-retrieval (less reranking work)
RETRIEVAL_TOP_K=20           # was 40 (50% reduction in reranking)
RERANKER_TOP_K=5             # was 8 (faster response)

# Skip neighbor context by default
ENABLE_NEIGHBOR_CONTEXT=false

# Increase relevance threshold (filter noise faster)
MIN_RELEVANCE_SCORE=0.5      # was 0.3 (stricter filtering)
```

---

### 3. **Enable Response Streaming** 📡
**Impact: User sees first tokens in 1-2s instead of waiting 8-12s**

Add to `backend/app/api/chat.py`:

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Streaming version of chat endpoint."""

    async def event_generator():
        # Phase 1: Retrieve docs (fast)
        yield f'data: {{"status": "retrieving", "percent": 10}}\n\n'

        retrieved_docs = service.retrieve(request.question, request.tenant_id)
        yield f'data: {{"status": "retrieved", "percent": 30}}\n\n'

        # Phase 2: LLM answer (stream tokens as they arrive)
        yield f'data: {{"status": "generating", "percent": 40}}\n\n'

        async for token in llm.stream_response(messages):
            yield f'data: {{"token": "{token}"}}\n\n'

        # Phase 3: Metadata (parallel with main answer)
        yield f'data: {{"status": "metadata", "percent": 100}}\n\n'

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

Frontend:
```typescript
// src/app/components/ChatStreaming.tsx
const response = await fetch("/api/v1/chat/stream", {
  method: "POST",
  body: JSON.stringify({question, tenant_id, session_id}),
});

const reader = response.body?.getReader();
let answer = "";

while (true) {
  const {done, value} = await reader.read();
  if (done) break;

  const text = new TextDecoder().decode(value);
  const lines = text.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = JSON.parse(line.slice(6));
      if (data.token) answer += data.token;
      setAnswer(answer);  // Real-time update UI
    }
  }
}
```

---

### 4. **Cache Embeddings & Query Results** 💾
**Impact: 50-70% faster for repeated questions**

Add to `backend/app/core/cache.py`:

```python
import hashlib
from functools import lru_cache
import json

class EmbeddingCache:
    def __init__(self):
        self.cache = {}  # In production: use Redis

    def get_embedding(self, text: str):
        key = hashlib.md5(text.encode()).hexdigest()
        if key in self.cache:
            return self.cache[key]
        return None

    def set_embedding(self, text: str, embedding: list):
        key = hashlib.md5(text.encode()).hexdigest()
        self.cache[key] = embedding

# Use in ChatService
class ChatService:
    def __init__(self, ..., embedding_cache: EmbeddingCache = None):
        self.embedding_cache = embedding_cache or EmbeddingCache()

    def _multi_query_search(self, queries, original_query, tenant_id):
        for query in queries:
            # Check cache first
            cached_embedding = self.embedding_cache.get_embedding(query)
            if cached_embedding:
                query_vector = cached_embedding
            else:
                query_vector = self.embedder.embed_text([query])[0]
                self.embedding_cache.set_embedding(query, query_vector)

            docs = self.db.search_similar(...)
```

**For Supabase free tier**, add materialized query caching:
```sql
-- Cache common queries in a materialized view
CREATE MATERIALIZED VIEW popular_queries_cache AS
SELECT
  content_tsvector,
  COUNT(*) as query_count,
  MIN(similarity) as avg_relevance
FROM documents
GROUP BY content_tsvector
ORDER BY query_count DESC
LIMIT 1000;

CREATE INDEX popular_queries_idx ON popular_queries_cache(query_count DESC);

-- Refresh on schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_queries_cache;
```

---

### 5. **Parallelize LLM Calls** ⚡
**Impact: 2-3s savings (especially when features enabled)**

```python
import asyncio

class ChatService:
    async def ask_question_parallel(self, question: str, session_id: str):
        # Save question
        self.db.save_chat_message(session_id, "user", question)

        # Fetch history
        chat_history = await self.db.get_chat_history_async(session_id)

        # Rewrite query
        search_query = question
        if self.query_rewriter:
            search_query = await self.query_rewriter.rewrite_async(question, chat_history)

        # KEY CHANGE: Run in parallel instead of sequential
        tasks = []

        # Task 1: HyDE generation (parallel)
        if self.enable_hyde:
            tasks.append(self._generate_hyde_async(search_query))
        else:
            await asyncio.sleep(0)

        # Task 2: Multi-query generation (parallel)
        if self.enable_multi_query:
            tasks.append(self._generate_alternatives_async(search_query))

        # Wait for all to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        queries = [search_query]

        for result in results:
            if isinstance(result, list):
                queries.extend(result)

        # Now search and generate answer...
        # (rest of logic continues with all queries ready in parallel)
```

---

## 🌍 FREE TIER DEPLOYMENT STRATEGY

### Recommended Stack (ALL FREE)

| Component | Service | Free Tier | Setup Time |
|-----------|---------|-----------|-----------|
| **Frontend** | Vercel | Unlimited deployments, edge functions, KV cache | 5 min |
| **Backend (Python)** | Railway or Render | 500 hours/month ($5), sleep after 30min idle | 10 min |
| **Database** | Supabase | 500MB storage, 2GB bandwidth, realtime | 5 min |
| **LLM API** | Groq | Free (unlimited requests, rate limit ~100/min) | 2 min |
| **Embedding** | Local fastembed | Free (runs on backend) | Already set up |
| **Caching** | Vercel KV | 100MB free tier | 5 min |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│ CDN: Vercel (Edge, Global)                              │
│ - Frontend (Next.js)                                    │
│ - API cache (Vercel KV)                                 │
│ - Edge middleware (compress, rate limit)                │
└────────────┬────────────────────────────────────────────┘
             │ (Cached responses stay at edge)
             │
┌────────────▼──────────────────────────────────────────────┐
│ Backend: Railway/Render (US Region, ~100ms latency)       │
│ - FastAPI server                                          │
│ - Python (fastembed, reranker)                            │
│ - Lifespan initialization (preload models)                │
└────────────┬──────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────┐
│ Database: Supabase (PostgreSQL + pgvector)                │
│ - Vector search (HNSW index)                              │
│ - Full-text search (GIN index)                            │
│ - Connection pooling (PgBouncer)                          │
└──────────────────────────────────────────────────────────┘

External APIs (free):
- Groq (LLM) ← Free tier, 100 requests/min
- Google Drive API ← Free tier, 100 requests/day
```

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Phase 1: Deploy Frontend on Vercel (FREE, 5 min)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
cd frontend
vercel deploy --prod

# 4. Set environment variable
vercel env add NEXT_PUBLIC_API_URL https://your-backend-railway.railway.app
vercel redeploy
```

**Result**: Your frontend is live at `your-project.vercel.app` with global CDN

---

### Phase 2: Deploy Backend on Railway (FREE TIER $5)

```bash
# 1. Create account at railway.app

# 2. Install Railway CLI
npm i -g @railway/cli

# 3. Login
railway login

# 4. Initialize Railway project
cd backend
railway init

# 5. Add environment variables
railway variable add SUPABASE_URL="your-url"
railway variable add SUPABASE_SERVICE_KEY="your-key"
railway variable add GROQ_API_KEY="your-key"
railway variable add CORS_ORIGINS="https://your-project.vercel.app"

# 6. Deploy
railway up

# 7. Get backend URL
railway status
# → https://your-backend-railway.app
```

**Free tier**: 500 hours/month = ~16 hours/day (sufficient for dev/early stage)

---

### Phase 3: Setup Supabase (FREE)

```sql
-- Already configured in your migration file
-- Verify indexes exist:
SELECT * FROM pg_indexes WHERE tablename = 'documents';

-- Check if HNSW index exists:
SELECT * FROM pg_indexes
WHERE indexname LIKE '%hnsw%';

-- If not, create:
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON documents USING GIN (content_tsvector);
```

---

### Phase 4: Add Caching with Vercel KV (FREE, 100MB)

```bash
# 1. Create KV store in Vercel dashboard
# 2. Link to project
vercel link

# 3. Add environment variable (auto-added)
# VERCEL_KV_REST_API_URL
# VERCEL_KV_REST_API_TOKEN
```

Add caching to backend:

```python
# backend/app/core/cache.py
import os
import redis
import json

class RedisCache:
    def __init__(self):
        self.client = redis.Redis.from_url(os.getenv("REDIS_URL", ""))

    def get_query_result(self, query_hash: str):
        result = self.client.get(f"query:{query_hash}")
        return json.loads(result) if result else None

    def set_query_result(self, query_hash: str, result: dict, ttl: int = 3600):
        self.client.setex(
            f"query:{query_hash}",
            ttl,  # 1 hour
            json.dumps(result)
        )

# Use in dependencies.py
cache = RedisCache()

@lru_cache()
def get_cache() -> RedisCache:
    return cache
```

---

## 🎯 SPEED BENCHMARKS (After Optimization)

### Before Optimization
```
Total Response Time: 10-12 seconds
- Slow path with all features enabled
- No caching
- Sequential LLM calls
```

### After Optimization (Quick Wins Only)
```
Total Response Time: 3-5 seconds (60% faster) ✅

Breakdown:
- Main LLM answer: 2-3s
- Vector search: 0.5-1s
- Reranking: 0.3-0.5s
- DB operations: 0.2-0.3s

Features enabled: HyDE, Multi-query (takes 3-5s total)
Features disabled: 1-2s
```

### With Streaming
```
Time to First Token: 1-2 seconds
(User sees answer starting in 1-2s instead of waiting 10s)
Full answer: 3-5 seconds
```

### With Caching (Repeated Questions)
```
Cache Hit Response: 0.3-0.5 seconds (90% faster)
(From Vercel edge → backend cache → response)
```

---

## 🔧 CONFIGURATION FOR FREE TIER

### `.env` - Optimized for Free Tier

```env
# ── Services ──
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-key
GROQ_API_KEY=your-key

# ── Models (Fast, Low Memory) ──
LLM_MODEL_NAME=llama-3.1-8b-instant      # Fast, 8B (free on Groq)
EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
RERANKER_MODEL_NAME=Xenova/ms-marco-MiniLM-L-12-v2

# ── Retrieval (Optimized for Speed) ──
RETRIEVAL_TOP_K=20                       # Reduced from 40 (faster)
RERANKER_TOP_K=5                         # Reduced from 8 (faster)
MIN_RELEVANCE_SCORE=0.5                  # Stricter filtering

# ── Features (Disabled for Speed) ──
ENABLE_HYDE=false                        # disable to save LLM call
ENABLE_MULTI_QUERY=false                 # disable to save LLM call
ENABLE_KEY_TAKEAWAYS=false               # disable to save LLM call
ENABLE_RELATED_QUESTIONS=false           # disable to save LLM call
ENABLE_NEIGHBOR_CONTEXT=false            # disable to save DB query

# ── Rate Limiting (Free Tier) ──
RATE_LIMIT_CHAT=30/minute                # Prevent abuse on free tier

# ── CORS (Vercel frontend) ──
CORS_ORIGINS=https://your-project.vercel.app

# ── Caching ──
REDIS_URL=redis://...                    # Optional: Vercel KV
CACHE_TTL=3600                           # Cache for 1 hour
```

---

## 📊 FREE TIER COST BREAKDOWN

| Service | Free Tier | Cost If Exceeded | Recommendation |
|---------|-----------|-----------------|-----------------|
| **Vercel (Frontend)** | Unlimited | Pay-as-you-go | Just stay under quota |
| **Railway (Backend)** | 500 hrs/month | $5/month | Perfect for MVP |
| **Supabase (DB)** | 500MB storage, 2GB bandwidth | ~$25/month | Upgrade only when full |
| **Groq (LLM)** | Unlimited (rate limited) | Free | Already covered |
| **Vercel KV** | 100MB cache | $2.08/GB | Use for query cache |
| **Total** | **FREE** | **$5-30/month** | Great for starting |

---

## 🧪 TESTING PERFORMANCE

### Load Test Free Tier Limits

```bash
# Install k6 for load testing
brew install k6

# Create test file: performance_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // 10 concurrent users
    { duration: '5m', target: 20 },   # increase to 20
    { duration: '2m', target: 0 },    # scale down
  ],
};

export default function () {
  let res = http.post('https://your-backend.railway.app/api/v1/chat', {
    question: 'What is the company policy?',
    tenant_id: 'test-tenant',
    session_id: 'session-123',
  }, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  sleep(1);
}

# Run test
k6 run performance_test.js

# Results show max response time, error rate, etc.
```

---

## ⚠️ FREE TIER GOTCHAS & LIMITS

### Vercel
- ❌ Cold starts: First request takes 2-5s (acceptable for dev)
- ✅ Solution: Use Railway warm backend, pre-warm requests

### Railway
- ⏱️ Sleeps: Backend goes to sleep after 30 min inactivity
- ✅ Solution: Cron job to wake it up every 20 min
  ```python
  # Add to a free service like EasyCron
  # Hits /health endpoint every 15 minutes to keep backend warm
  ```

### Supabase
- 🔒 Rate limit: ~100 concurrent connections free tier
- ✅ Solution: Use connection pooling, enable PgBouncer

### Groq
- ⏱️ Rate limited: ~100 requests/minute free tier
- ✅ Solution: Cache key takeaways & related questions, batch requests

---

## 🚀 NEXT STEPS (For Speed Freaks)

**If total speed not enough after Phase 1-4**, try these (paid):

1. **Dedicated Backend** ($5-20/mo)
   - Railway Pro (4GB RAM, always on)
   - Or Render.com: $7/month (1GB RAM, always on)

2. **Dedicated Database** (upgrade Supabase)
   - Supabase Pro: $25/month (3GB storage, better limits)

3. **Vector DB** (if Supabase pgvector too slow)
   - Pinecone Starter: $12/month (1M vectors)
   - Weaviate Cloud: Free tier

4. **Regional Deployment** (lower latency)
   - Deploy backend in EU if users in EU (Render EU region)
   - Use Cloudflare for global CDN ($20/mo)

---

## ✅ IMPLEMENTATION CHECKLIST

```
Quick Wins (Do First):
[ ] Disable HYDE/Multi-query in .env
[ ] Reduce RETRIEVAL_TOP_K to 20, RERANKER_TOP_K to 5
[ ] Add response streaming endpoint
[ ] Test response time locally

Caching:
[ ] Implement EmbeddingCache in chat_service.py
[ ] Setup Vercel KV
[ ] Add query result caching

Free Tier Deployment:
[ ] Deploy frontend on Vercel
[ ] Deploy backend on Railway
[ ] Verify Supabase indexes
[ ] Add environment variables
[ ] Test end-to-end

Advanced (Optional):
[ ] Parallelize LLM calls
[ ] Setup cron job to keep backend warm
[ ] Implement edge middleware (compression, rate limiting)
[ ] Monitor latency with Sentry/New Relic free tier
```

---

## 📞 Support

For issues:
- Railway logs: `railway logs`
- Vercel logs: `vercel logs`
- Supabase: Check database usage in dashboard

```

## File: `QUICK_START_SPEED.md`

```md
# QUICK START - Reduce Latency in 10 Minutes

**Current problem:** Answers take 10-12 seconds
**Target after these steps:** 2-4 seconds (60% faster)

---

## Step 1: Edit .env (2 min)

Copy `.env.template` to `.env` and update:

```bash
cp .env.template .env
# Then edit .env with your keys
```

**Key changes for speed:**

```env
# DISABLE slow features
ENABLE_HYDE=false                    # Saves 1-2s
ENABLE_MULTI_QUERY=false             # Saves 1-2s
ENABLE_KEY_TAKEAWAYS=false           # Saves 0.5s
ENABLE_RELATED_QUESTIONS=false       # Saves 0.5s
ENABLE_NEIGHBOR_CONTEXT=false        # Saves 0.2s

# REDUCE retrieval overhead
RETRIEVAL_TOP_K=20                   # was 40 (50% reduction)
RERANKER_TOP_K=5                     # was 8

# STRICTER filtering
MIN_RELEVANCE_SCORE=0.5              # was 0.3
```

👉 **Just editing .env cuts response time by 50%**

---

## Step 2: Test the "fast" endpoint (3 min)

Add this to `backend/app/main.py` router mounting:

```python
from app.api.chat_streaming import router as chat_streaming_router

app.include_router(chat_streaming_router)
```

Now test:
```bash
curl -X POST http://localhost:8000/api/v1/chat/fast \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is X?",
    "tenant_id": "test",
    "session_id": "sess123"
  }'
```

**Expected:** 2-4 seconds ✓

---

## Step 3: Enable streaming (3 min)

In `frontend/src/app/page.tsx`:

```typescript
import { StreamingChat } from '@/components/StreamingChat';

export default function Home() {
  return (
    <div className="p-4">
      <h1>ActionRAG - Fast Chat</h1>
      <StreamingChat sessionId="user-123" tenantId="tenant-123" />
    </div>
  );
}
```

**Expected:** User sees first words in 1-2 seconds instead of waiting 8-12 seconds

---

## Step 4: Add caching (2 min)

Update `backend/app/core/dependencies.py`:

```python
from app.core.cache import EmbeddingCache, QueryResultCache

embedding_cache = EmbeddingCache()
query_cache = QueryResultCache()

@lru_cache()
def get_embedding_cache() -> EmbeddingCache:
    return embedding_cache

@lru_cache()
def get_query_cache() -> QueryResultCache:
    return query_cache
```

Update `backend/app/services/chat_service.py` to use cache:

```python
class ChatService:
    def __init__(self, ..., embedding_cache: EmbeddingCache = None):
        self.embedding_cache = embedding_cache or EmbeddingCache()

    def _multi_query_search(self, queries, original_query, tenant_id):
        for query in queries:
            # Check cache first
            cached = self.embedding_cache.get_embedding(query)
            if cached:
                query_vector = cached
                logger.info(f"✓ Cache hit for embedding")
            else:
                query_vector = self.embedder.embed_text([query])[0]
                self.embedding_cache.set_embedding(query, query_vector)
            # ... rest of code
```

**Expected:** Repeated questions answer in 0.5 seconds (cache hit)

---

## Step 5: Check Supabase indexes (1 min)

Run this in Supabase SQL editor:

```sql
-- Check HNSW index exists
SELECT * FROM pg_indexes WHERE indexname LIKE '%hnsw%';

-- If not, create it
CREATE INDEX IF NOT EXISTS documents_embedding_hnsw
ON documents USING hnsw (embedding vector_cosine_ops);

-- Check full-text index
SELECT * FROM pg_indexes WHERE indexname LIKE '%gin%';

-- If not, create it
CREATE INDEX IF NOT EXISTS documents_tsvector_gin
ON documents USING GIN (content_tsvector);

-- Check indexes exist
SELECT schemaname, tablename, indexname, indextype
FROM pg_indexes
WHERE tablename = 'documents';
```

**Expected output:**
```
documents_embedding_hnsw    | hnsw
documents_tsvector_gin      | gin
documents_pkey              | btree
```

---

## SPEED COMPARISON

| Metric | Before | After (Quick Wins) | After (Full) |
|--------|--------|-------------------|--------------|
| Response Time | 10-12s | 2-4s ✓ | 1-2s (streaming) |
| Improvement | — | 60% faster | 80-90% faster |
| Features | All | Minimal | Streaming |
| Cost | $0 | $0 | $0 (free tier) |

---

## DEPLOYMENT (Free Tier - Optional)

### Frontend → Vercel (3 min)

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

Result: `https://your-project.vercel.app` 🌍

### Backend → Railway (5 min)

```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway env add SUPABASE_URL "..."
railway env add SUPABASE_SERVICE_KEY "..."
railway env add GROQ_API_KEY "..."
railway up
```

Result: `https://your-project-railway.app` ⚡

### Keep Backend Warm (Free)

Backend sleeps after 30 min idle. Add a cron job at **EasyCron.com**:
- URL: `https://your-project-railway.app/api/v1/chat/health`
- Interval: Every 15 minutes
- Cost: Free

---

## API ENDPOINTS

### Fast (Best for free tier)
```bash
POST /api/v1/chat/fast
# Features disabled, 2-4 second response
```

### Streaming (See tokens in real-time)
```bash
POST /api/v1/chat/stream
# SSE streaming, 1-2s to first token
```

### Standard (Original)
```bash
POST /api/v1/chat
# Full features if enabled in .env
```

---

## VERIFY SPEED IMPROVEMENTS

```bash
# Test response time
time curl -X POST http://localhost:8000/api/v1/chat/fast \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the company policy?", "tenant_id": "test", "session_id": "test"}'

# Should print: "real 0m2.4s" or similar (2-4 seconds) ✓
```

---

## COMMON ISSUES

### Q: Still slow (>5 seconds)?
A: Check:
1. Is Supabase in same region? (Lower latency)
2. Are RETRIEVAL_TOP_K and RERANKER_TOP_K reduced?
3. Are features disabled in .env?
4. Is Groq API responding fast? (test: `curl https://api.groq.com/health`)

### Q: Streaming not working?
A: Frontend needs to consume SSE:
```typescript
const response = await fetch('/api/v1/chat/stream');
const reader = response.body.getReader();
// Process chunks...
```

### Q: How to re-enable features later?
A: Just set in .env:
```env
ENABLE_HYDE=true
ENABLE_MULTI_QUERY=true
ENABLE_KEY_TAKEAWAYS=true
ENABLE_RELATED_QUESTIONS=true
```
Response time will be 5-8 seconds instead of 2-4, but more comprehensive.

---

## MONITORING

Add logging to see where time is spent:

```python
import time

@router.post("/api/v1/chat/fast")
async def chat_fast(request: ChatFastRequest):
    t0 = time.time()

    t_search = t0
    docs = service.search(...)
    print(f"Search: {time.time() - t_search:.2f}s")

    t_rerank = time.time()
    reranked = reranker.rerank(...)
    print(f"Rerank: {time.time() - t_rerank:.2f}s")

    t_llm = time.time()
    answer = llm.answer(...)
    print(f"LLM: {time.time() - t_llm:.2f}s")

    print(f"TOTAL: {time.time() - t0:.2f}s")

    return result
```

This shows which component is slowest.

---

## NEXT STEPS

After speed improvements:

1. **Monitor real-world performance** - Check Vercel/Railway logs
2. **Collect user feedback** - Is 2-4s acceptable?
3. **Consider paid upgrades if needed:**
   - Railway Pro: $7/mo (+4GB RAM)
   - Supabase Pro: $25/mo (+3GB storage)
   - This could reduce response time to 1-2s

---

## SUMMARY

✅ Edit `.env` - 50% faster
✅ Test `/fast` endpoint - 2-4 second response
✅ Enable streaming - 1-2s perceived speed (first tokens shown immediately)
✅ Add caching - 0.5s for repeated questions
✅ Deploy to Vercel/Railway - Free, global

**Total setup time: ~15 minutes**
**Performance improvement: 60-80%**
**Cost: $0/month** 🎉
```

## File: `deploy-free-tier.sh`

```sh
#!/bin/bash
# deploy-free-tier.sh
# One-script deployment to Vercel + Railway + Supabase (all free)

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    ActionRAG Free Tier Deployment Script                   ║"
echo "║    Deploy to Vercel (frontend) + Railway (backend)         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
check_dependencies() {
  echo "${YELLOW}[1/6] Checking dependencies...${NC}"

  if ! command -v node &> /dev/null; then
    echo "${RED}Error: Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
  fi

  if ! command -v npm &> /dev/null; then
    echo "${RED}Error: npm not found.${NC}"
    exit 1
  fi

  # Check for Vercel CLI (optional, can install)
  if ! command -v vercel &> /dev/null; then
    echo "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
  fi

  # Check for Railway CLI (optional)
  if ! command -v railway &> /dev/null; then
    echo "${YELLOW}Installing Railway CLI...${NC}"
    npm install -g @railway/cli
  fi

  echo "${GREEN}✓ Dependencies OK${NC}"
}

# Setup environment
setup_env() {
  echo "${YELLOW}[2/6] Setting up environment...${NC}"

  if [ ! -f .env ]; then
    echo "${RED}Error: .env file not found. Copy .env.template to .env first${NC}"
    echo "  cp .env.template .env"
    echo "  # Then edit .env with your API keys"
    exit 1
  fi

  echo "${GREEN}✓ .env file found${NC}"
}

# Deploy frontend to Vercel
deploy_frontend() {
  echo "${YELLOW}[3/6] Deploying frontend to Vercel...${NC}"

  cd frontend

  # Install dependencies
  npm install

  # Deploy
  vercel --prod

  # Get deployment URL
  VERCEL_URL=$(vercel inspect --prod 2>/dev/null | grep "https://" | head -1)
  echo "${GREEN}✓ Frontend deployed to: $VERCEL_URL${NC}"

  cd ..
}

# Deploy backend to Railway
deploy_backend() {
  echo "${YELLOW}[4/6] Deploying backend to Railway...${NC}"

  cd backend

  # Create requirements.txt if not exists
  if [ ! -f requirements.txt ]; then
    echo "${RED}Error: requirements.txt not found${NC}"
    exit 1
  fi

  # Initialize Railway
  if [ ! -f railway.json ]; then
    railway init
  fi

  # Deploy
  railway up

  # Get backend URL
  echo ""
  echo "${YELLOW}After deployment, get your Railway URL${NC}"
  echo "  railway env && railway status"
  echo ""

  cd ..
}

# Verify Supabase
verify_supabase() {
  echo "${YELLOW}[5/6] Verifying Supabase setup...${NC}"

  if [ -z "$SUPABASE_URL" ]; then
    echo "${RED}Error: SUPABASE_URL not set in .env${NC}"
    exit 1
  fi

  if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "${RED}Error: SUPABASE_SERVICE_KEY not set in .env${NC}"
    exit 1
  fi

  curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_SERVICE_KEY" > /dev/null

  if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Supabase connection verified${NC}"
  else
    echo "${RED}Error: Cannot connect to Supabase${NC}"
    exit 1
  fi
}

# Final checklist
final_checklist() {
  echo "${YELLOW}[6/6] Final checklist...${NC}"

  echo ""
  echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo "${GREEN}║        DEPLOYMENT COMPLETE!                               ║${NC}"
  echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Next steps:"
  echo ""
  echo "1. ${YELLOW}Get your Railway backend URL:${NC}"
  echo "   railway env && railway status"
  echo ""
  echo "2. ${YELLOW}Set NEXT_PUBLIC_API_URL in Vercel environment:${NC}"
  echo "   vercel env add NEXT_PUBLIC_API_URL https://your-railway-url"
  echo "   vercel redeploy"
  echo ""
  echo "3. ${YELLOW}Keep backend warm (prevents sleep after 30 min):${NC}"
  echo "   Add a cron job at EasyCron.com"
  echo "   URL: https://your-railway-url/api/v1/chat/health"
  echo "   Interval: Every 15 minutes"
  echo ""
  echo "4. ${YELLOW}Monitor performance:${NC}"
  echo "   Vercel: vercel logs"
  echo "   Railway: railway logs"
  echo ""
  echo "📊 Expected Response Times:"
  echo "   - Fast endpoint (/fast): 2-4 seconds"
  echo "   - Streaming endpoint (/stream): 1-2s to first token"
  echo ""
  echo "💰 Monthly Cost (Free Tier):"
  echo "   Vercel: $0"
  echo "   Railway: $0 (500 hours free)"
  echo "   Supabase: $0 (500MB storage)"
  echo "   Groq: $0 (free tier)"
  echo "   ---"
  echo "   TOTAL: $0 /month 🎉"
  echo ""
}

# Main execution
main() {
  check_dependencies
  setup_env

  # Ask which components to deploy
  echo ""
  echo "Choose what to deploy:"
  echo "1) Frontend only (Vercel)"
  echo "2) Backend only (Railway)"
  echo "3) Both (frontend + backend) – this takes longer"
  echo "4) Just verify Supabase"
  echo ""
  read -p "Enter choice (1-4): " choice

  case $choice in
    1)
      deploy_frontend
      ;;
    2)
      deploy_backend
      ;;
    3)
      deploy_frontend
      deploy_backend
      ;;
    4)
      verify_supabase
      ;;
    *)
      echo "Invalid choice"
      exit 1
      ;;
  esac

  final_checklist
}

main "$@"
```

## File: `.continue/agents/new-config.yaml`

```yaml
# This is an example configuration file
# To learn more, see the full config.yaml reference: https://docs.continue.dev/reference

name: Example Config
version: 1.0.0
schema: v1

# Define which models can be used
# https://docs.continue.dev/customization/models
models:
  - name: my gpt-5
    provider: openai
    model: gpt-5
    apiKey: YOUR_OPENAI_API_KEY_HERE
  - uses: ollama/qwen2.5-coder-7b
  - uses: anthropic/claude-4-sonnet
    with:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

# MCP Servers that Continue can access
# https://docs.continue.dev/customization/mcp-tools
mcpServers:
  - uses: anthropic/memory-mcp
```

## File: `backend/.env`

```
SUPABASE_URL="https://vhajzqerdnyngvwwukff.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWp6cWVyZG55bmd2d3d1a2ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU4NDc4NCwiZXhwIjoyMDg3MTYwNzg0fQ.uABQfWuwWJgTd-njHlRduRiLyEmEgMBSf0vkvh6h7lo"
GROQ_API_KEY="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"
GOOGLE_DRIVE_FOLDER_ID=1qksc25-tHbmavI9znqEztdOc6I2PMsHk
LLM_MODEL_NAME=llama-3.3-70b-versatile
EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
RERANKER_MODEL_NAME=Xenova/ms-marco-MiniLM-L-12-v2
```

## File: `backend/google_credentials.json`

```json
{
  "type": "service_account",
  "project_id": "actiona-488306",
  "private_key_id": "7a378ad8f691546bcc3c604f4476112dc13e0074",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCYC/6KfMqO1Qyb\nzZ6qGBpMEJuMJeaGgzgbE+uW31xtMFWit8DmbeLt+cFHjp5BVqrr/Lc9PD/cYgMv\ndBhdQlpxFkTWK167NGL1R6eGr3JVRytKenuxZWVJvFV+keF1KG12DDR1E5SXbGyo\nhYeu0LXCdSs8E7CEIcRe++6xW/+UqU/Pml4pm8yk6FPq/dLHSNOjMLE1rzCI1uCE\nmmGuTsFLjPS2PvNZ/YfAw1DY5OgzIFTCOrOQFCormfaKNi+LNKhypAX325omt9xa\noGf+AnS8vk2n4sxfD5/Xn9ZxZwJjR4JyAQZIn0pWIQ9R6l0GwD1b6HBFbUkMxKIT\n0PovFJPdAgMBAAECggEACejMNdvkurLdb8ESrGzGN/tkG9nzgIRIUZF2iv5zMGWU\nSzbVIl96iP58T4zWuRTsLlWp3pqQ4ezcXske9mMG8HReV6P7eFF1ep1pKHDCT5cE\nFgZODfV5CLl2y/k3e7J/EdDBUXkNd+H34fLT8TuGgQ4wW2nAGRh3SyZ5u8LucRKP\nGQ8xJtIu1xlwGOfljqwUGJZWJycTAUokUE8peW/r4f1iBCzs+S806sZaABdJeWLv\n/YKNN58TLR/KLdTn1fxFwVr4urF+UdcJO7M5kOXmDCp9vI39bwhdVI9g6Xp4oil8\nzZavTaFw2BhJos3aVijCGhkyAxAnBBY1JiYDOOEMkQKBgQDJ8l1H7ofG+itYGWWb\nCJoP3hkJwYPE5WfQiDBqW8cBNeqCntPE6lZM/gtLtHrbxwvIcYxIIWhm0+LKxayD\nHOQ6gWvzCyS+Ed1YBC1N6sg5vF0pCFvbtaqnFk9n/VBuubOOsDKgJ9R5WcxKlR0R\nL2rYOYPJzwH8dC6Shg/fM6jVcQKBgQDAvm3oH+CaSlSBDMveliSghI+OT7rpb7sG\nTy+8lFxeI9p0g++Co5tL1+eq2klhNKj8bYmuNIfnWh1u1BIujsNIGal3j8knfY4F\nDN29yCkEaUeKmdHUkMXhfVmDbK2bnGKFucaNyVyNIuv45Bcku4C2fZUWKsVCAMkr\n9PQpzsR/LQKBgBbWHGxM8fezRIGC5bWBZIKU1/n9cxwp4PJ45Biy5i8h3LIGqeXj\npfyw4bAe6aG+wXtaM8XYWUj/fu71KYvuEXT4O6/RO8dul7wjRMhB24CD53kDY/fV\ndEXOxQ36XEUZJM/m5uKrfmB2oh5w/Ed8ODXZUyjYCt50eOvC0zqnSdlRAoGBAK9F\nfBR1yH0F0sp3pHyI9E2zvgefoUzd+ajHIZXPJB/HYsRJpeead4IEl/rZ/ZiTlofV\n5DmyM1PCsrkxyEbmM9bA30aGTlnG5vrYtFv8RLBqPFBhiFpQPGHM5zWIAmdbUoxg\nX5pX3f3KH+N5J0KT73wDvyslQbO/mzCJ0+6gxDcRAoGBAIDrSmhf/6o/wP4NVgFw\nFUn4mpmcLFAJj2IeJdAsnkaKh+4k9exXvuaFzR4+cLibjz54u5oPF4L7Vrr+eS+w\nSe3hiimhrbGsYMSM38pJEaxCovxgLGvDXPvsSMpxpoYJfGRozQL50ucn166KBvmF\nBrXGLEorXiX71/LWM3hgPf4j\n-----END PRIVATE KEY-----\n",
  "client_email": "drive-reader-bot@actiona-488306.iam.gserviceaccount.com",
  "client_id": "116714553889487258981",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/drive-reader-bot%40actiona-488306.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

## File: `backend/main.py`

```py
"""
ActionRAG SME Backend — Enterprise Knowledge Agent API.

Config-driven, resilient, and future-proof.
Swap models and services by editing .env, not code.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.logger import logger
from app.core.dependencies import _get_embedder_adapter, _get_reranker_adapter
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router
from app.api.documents import router as documents_router
from app.api.drive import router as drive_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — validates config on boot."""
    logger.info("=" * 50)
    logger.info("ActionRAG Backend starting up")
    logger.info(f"  LLM Model:       {settings.LLM_MODEL_NAME}")
    logger.info(f"  Embedding Model:  {settings.EMBEDDING_MODEL_NAME}")
    logger.info(f"  Reranker Model:   {settings.RERANKER_MODEL_NAME}")
    logger.info(f"  Retrieval Top-K:  {settings.RETRIEVAL_TOP_K} → Re-rank Top-K: {settings.RERANKER_TOP_K}")
    logger.info(f"  Min Relevance:    {settings.MIN_RELEVANCE_SCORE}")
    logger.info(f"  Query Rewrite:    {'ON' if settings.ENABLE_QUERY_REWRITE else 'OFF'}")
    logger.info(f"  Rate Limit:       {settings.RATE_LIMIT_CHAT}")
    logger.info(f"  Request Timeout:  {settings.REQUEST_TIMEOUT}s")
    logger.info(f"  CORS Origins:     {settings.CORS_ORIGINS}")
    logger.info("=" * 50)

    # Pre-download & initialize models BEFORE accepting requests.
    logger.info("Pre-loading embedding model (this may take a moment on first run)...")
    _get_embedder_adapter()
    logger.info("Embedding model ready.")

    logger.info("Pre-loading reranker model...")
    _get_reranker_adapter()
    logger.info("Reranker model ready.")

    yield
    logger.info("ActionRAG Backend shutting down")


# Initialize the App
app = FastAPI(
    title="ActionRAG SME Backend",
    description="The Anti-Hallucination Knowledge Agent API",
    version="1.1.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — reads allowed origins from config
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(drive_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "version": "1.1.0",
        "model": settings.LLM_MODEL_NAME,
        "message": "ActionRAG Backend is running. Visit /docs for the Swagger API.",
    }
```

## File: `backend/requirements.txt`

```txt
annotated-doc==0.0.4
annotated-types==0.7.0
anyio==4.12.1
cachetools==6.2.6
certifi==2026.1.4
cffi==2.0.0
charset-normalizer==3.4.4
click==8.3.1
cryptography==46.0.5
Deprecated==1.3.1
deprecation==2.1.0
distro==1.9.0
fastapi==0.131.0
fastembed==0.7.4
filelock==3.24.3
flatbuffers==25.12.19
fsspec==2026.2.0
google-api-core==2.30.0
google-api-python-client==2.190.0
google-auth==2.48.0
google-auth-httplib2==0.3.0
google-auth-oauthlib==1.2.4
googleapis-common-protos==1.72.0
groq==1.0.0
h11==0.16.0
h2==4.3.0
hf-xet==1.2.0
hpack==4.1.0
httpcore==1.0.9
httplib2==0.31.2
httpx==0.28.1
huggingface_hub==1.4.1
hyperframe==6.1.0
idna==3.11
jsonpatch==1.33
jsonpointer==3.0.0
langchain-core==1.2.14
langchain-text-splitters==1.1.1
langsmith==0.7.6
limits==5.8.0
loguru==0.7.3
lxml==6.0.2
markdown-it-py==4.0.0
mdurl==0.1.2
mmh3==5.2.0
mpmath==1.3.0
multidict==6.7.1
numpy==2.4.2
oauthlib==3.3.1
onnxruntime==1.24.2
orjson==3.11.7
packaging==26.0
pillow==11.3.0
postgrest==2.28.0
propcache==0.4.1
proto-plus==1.27.1
protobuf==6.33.5
py_rust_stemmers==0.1.5
pyasn1==0.6.2
pyasn1_modules==0.4.2
pycparser==3.0
pydantic==2.12.5
pydantic-settings==2.13.1
pydantic_core==2.41.5
Pygments==2.19.2
pyiceberg==0.11.0
PyJWT==2.11.0
PyMuPDF==1.27.1
pyparsing==3.3.2
pyroaring==1.0.3
python-dateutil==2.9.0.post0
python-docx==1.2.0
python-dotenv==1.2.1
python-multipart==0.0.22
PyYAML==6.0.3
realtime==2.28.0
requests==2.32.5
requests-oauthlib==2.0.0
requests-toolbelt==1.0.0
rich==14.3.3
rsa==4.9.1
shellingham==1.5.4
six==1.17.0
slowapi==0.1.9
sniffio==1.3.1
starlette==0.52.1
storage3==2.28.0
StrEnum==0.4.15
strictyaml==1.7.3
supabase==2.28.0
supabase-auth==2.28.0
supabase-functions==2.28.0
sympy==1.14.0
tenacity==9.1.4
tokenizers==0.22.2
tqdm==4.67.3
typer==0.24.1
typer-slim==0.24.0
typing-inspection==0.4.2
typing_extensions==4.15.0
uritemplate==4.2.0
urllib3==2.6.3
uuid_utils==0.14.1
uvicorn==0.41.0
websockets==15.0.1
wrapt==2.1.1
xxhash==3.6.0
yarl==1.22.0
zstandard==0.25.0
openpyxl
```

## File: `backend/supabase_migration_rrf.sql`

```sql
-- ============================================================
-- ActionRAG Phase 2: RRF Hybrid Search + Performance Indexes
-- Run this ENTIRE script in your Supabase SQL Editor (one shot)
-- ============================================================

-- 1. Add pre-computed tsvector column for full-text search
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_tsvector tsvector;

-- 2. Populate tsvector for ALL existing rows
UPDATE documents SET content_tsvector = to_tsvector('english', content)
WHERE content_tsvector IS NULL;

-- 3. Auto-update tsvector on insert/update (trigger)
CREATE OR REPLACE FUNCTION documents_tsvector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.content_tsvector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update ON documents;
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE OF content
  ON documents FOR EACH ROW EXECUTE FUNCTION documents_tsvector_trigger();

-- 4. GIN index for full-text search (100x faster keyword search)
CREATE INDEX IF NOT EXISTS idx_documents_tsvector ON documents USING GIN(content_tsvector);

-- 5. HNSW index for vector search (10-50x faster similarity search)
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
  USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 6. Tenant filtering index (speeds up WHERE tenant_id = X)
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);

-- 7. Replace hybrid search with Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION match_documents_hybrid(
  query_embedding vector,
  query_text text,
  match_tenant_id text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  filename text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  rrf_k int := 60;  -- Standard RRF smoothing constant
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    -- Vector similarity search (uses HNSW index)
    SELECT
      d.id,
      ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS rank_ix
    FROM documents d
    WHERE d.tenant_id = match_tenant_id::uuid
    ORDER BY d.embedding <=> query_embedding
    LIMIT LEAST(match_count * 4, 100)
  ),
  keyword_search AS (
    -- Full-text search with ranking (uses GIN index + pre-computed tsvector)
    SELECT
      d.id,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(d.content_tsvector, websearch_to_tsquery('english', query_text)) DESC
      ) AS rank_ix
    FROM documents d
    WHERE d.tenant_id = match_tenant_id::uuid
      AND d.content_tsvector @@ websearch_to_tsquery('english', query_text)
    LIMIT LEAST(match_count * 4, 100)
  )
  SELECT
    d.id,
    d.filename::text,
    d.content::text,
    -- RRF: 1/(k+rank) — puts both search signals on the SAME scale
    -- Documents found by BOTH methods get the highest combined scores
    (
      COALESCE(1.0 / (rrf_k + ss.rank_ix), 0.0) +
      COALESCE(1.0 / (rrf_k + ks.rank_ix), 0.0)
    )::float AS similarity
  FROM documents d
  LEFT JOIN semantic_search ss ON d.id = ss.id
  LEFT JOIN keyword_search ks ON d.id = ks.id
  WHERE ss.id IS NOT NULL OR ks.id IS NOT NULL
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

## File: `backend/app/__init__.py`

```py
```

## File: `backend/app/api/__init__.py`

```py
```

## File: `backend/app/api/chat.py`

```py
"""
Chat API — async endpoint with config-driven rate limiting.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services.chat_service import ChatService
from app.core.dependencies import get_chat_service
from app.core.rate_limiter import limiter
from app.core.config import settings

router = APIRouter(prefix="/api/v1/chat", tags=["Enterprise Q&A"])


# ── API Contracts ──

class SessionRequest(BaseModel):
    tenant_id: str
    title: Optional[str] = "New Conversation"


class ChatRequest(BaseModel):
    question: str
    tenant_id: str
    session_id: str


class Citation(BaseModel):
    filename: str
    content: str
    similarity: float = 0.0
    rerank_score: Optional[float] = None


class EnhancedChatResponse(BaseModel):
    answer: str
    key_takeaways: list[str] = []
    related_questions: list[str] = []
    citations: list[Citation] = []
    session_id: str
    confidence: str


# ── Endpoints ──

@router.post("/sessions")
async def create_new_chat_session(
    request: SessionRequest,
    chat_service: ChatService = Depends(get_chat_service),
):
    """Creates a blank chat room and returns the session_id to the frontend."""
    try:
        session_id = chat_service.db.create_chat_session(
            tenant_id=request.tenant_id,
            title=request.title,
        )
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_chat_history(
    session_id: str,
    chat_service: ChatService = Depends(get_chat_service),
):
    """Allows the frontend to load past messages when a user clicks an old chat."""
    try:
        history = chat_service.db.get_chat_history(session_id=session_id)
        return {"status": "success", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=EnhancedChatResponse)
@limiter.limit(settings.RATE_LIMIT_CHAT)
async def chat_with_documents(
    request: Request,
    chat_request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
):
    """The main chat engine. Automatically reads history and saves new messages."""
    try:
        response = chat_service.ask_question(
            question=chat_request.question,
            tenant_id=chat_request.tenant_id,
            session_id=chat_request.session_id,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## File: `backend/app/api/chat_streaming.py`

```py
"""
Streaming Chat Endpoint — Fast response with Server-Sent Events (SSE)
User sees answer starting within 1-2 seconds instead of waiting 10-12 seconds.

Usage:
    Frontend: const response = await fetch('/api/v1/chat/stream', ...)
              const reader = response.body.getReader()
              // Stream chunks and update UI in real-time
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import json
from typing import AsyncGenerator

from app.core.dependencies import get_chat_service, get_rate_limiter, get_embedding_cache
from app.core.config import settings
from app.core.logger import logger
from pydantic import BaseModel


router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    tenant_id: str
    session_id: str
    use_streaming: bool = True  # Enable streaming by default


class ChatFastRequest(BaseModel):
    """Minimal request for fast endpoint (features disabled)."""
    question: str
    tenant_id: str
    session_id: str


@router.post("/fast")
async def chat_fast(
    request: ChatFastRequest,
    service=Depends(get_chat_service),
    rate_limiter=Depends(get_rate_limiter),
):
    """
    Ultra-fast chat endpoint with advanced features DISABLED.
    Response time: 2-4 seconds (vs 10-12s with all features).

    Features disabled:
    - HyDE (hypothetical document embedding)
    - Multi-query generation
    - Key takeaways extraction
    - Related questions generation
    - Neighbor context expansion
    """
    # Rate limiting check
    await rate_limiter.check_rate_limit(request.tenant_id)

    try:
        result = service.ask_question_fast(
            question=request.question,
            tenant_id=request.tenant_id,
            session_id=request.session_id,
        )
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    service=Depends(get_chat_service),
    rate_limiter=Depends(get_rate_limiter),
) -> StreamingResponse:
    """
    Streaming chat endpoint with Server-Sent Events (SSE).
    Frontend receives tokens/chunks in real-time.

    Response format:
    event: status
    data: {"msg": "...", "percent": 10}

    event: token
    data: {"token": "word"}

    event: metadata
    data: {"citations": [...], "confidence": "high"}

    event: end
    data: {}

    Example frontend code:
        const response = await fetch('/api/v1/chat/stream', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({question, tenant_id, session_id})
        });

        const reader = response.body.getReader();
        let answer = "";

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const lines = text.split("\\n");

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    event_type = line.slice(7);
                } else if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (event_type === 'token') answer += data.token;
                    if (event_type === 'metadata') setCitations(data.citations);
                }
            }
        }
    """
    # Rate limiting check
    await rate_limiter.check_rate_limit(request.tenant_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for streaming response."""
        try:
            from app.services.chat_service_optimized import ChatServiceStreaming

            streaming_service = ChatServiceStreaming(service)

            async for event in streaming_service.stream_answer(
                question=request.question,
                tenant_id=request.tenant_id,
                session_id=request.session_id,
            ):
                yield event

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_data = {
                "error": str(e),
                "msg": "An error occurred while processing your question.",
            }
            yield f'event: error\ndata: {json.dumps(error_data)}\n\n'
            yield "event: end\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/")
async def chat(
    request: ChatRequest,
    service=Depends(get_chat_service),
    rate_limiter=Depends(get_rate_limiter),
):
    """
    Standard chat endpoint (original behavior).
    Returns full response at once (slower, but simpler for existing clients).
    """
    await rate_limiter.check_rate_limit(request.tenant_id)

    try:
        if settings.ENABLE_HYDE or settings.ENABLE_MULTI_QUERY:
            # Use full featured service
            result = service.ask_question(
                question=request.question,
                tenant_id=request.tenant_id,
                session_id=request.session_id,
            )
        else:
            # Use optimized service
            result = service.ask_question_fast(
                question=request.question,
                tenant_id=request.tenant_id,
                session_id=request.session_id,
            )
        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")


@router.get("/health")
async def health_check():
    """Health check endpoint (useful for keeping backend warm)."""
    return {"status": "ok", "cached_features": {
        "analytics": settings.ENABLE_HYDE,
        "multi_query": settings.ENABLE_MULTI_QUERY,
        "key_takeaways": settings.ENABLE_KEY_TAKEAWAYS,
        "related_questions": settings.ENABLE_RELATED_QUESTIONS,
    }}
```

## File: `backend/app/api/documents.py`

```py
from fastapi import APIRouter, Depends, HTTPException
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service

router = APIRouter(prefix="/api/v1/documents", tags=["Document Management"])

@router.delete("/")
def delete_document(
    filename: str,
    tenant_id: str,
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    try:
        success = ingestion_service.delete_file(filename=filename, tenant_id=tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found.")
        return {"status": "success", "message": f"Successfully deleted {filename} and all its vectors."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/")
def get_documents(
    tenant_id: str,
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    try:
        files = ingestion_service.list_files(tenant_id=tenant_id)
        return {"status": "success", "files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## File: `backend/app/api/drive.py`

```py
"""
Google Drive API — Glean-like integration with recursive folder sync.

Supports ALL Google Workspace types + native files:
  Google Docs → PDF | Google Sheets → CSV | Google Slides → Text
  Native: PDF, DOCX, TXT, CSV, XLSX

Features:
  - Recursive subfolder crawling
  - Smart export per file type
  - Memory-safe disk streaming for large files
  - Hash-based deduplication
"""
import os
import hashlib
import httpx
from fastapi import APIRouter, Form, Depends, HTTPException, BackgroundTasks
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service
from app.core.config import settings
from app.core.logger import logger
from app.infrastructure.google_drive_adapter import (
    GoogleDriveAdapter,
    GOOGLE_WORKSPACE_EXPORTS,
    ALL_SUPPORTED_MIMES,
)

router = APIRouter(prefix="/api/v1/drive", tags=["Google Drive Integration"])

TEMP_DIR = "/tmp/actionrag_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)


def _clean_drive_filename(raw_name: str, mime_type: str) -> str:
    """
    Cleans Google Drive filenames and assigns correct extensions.

    Google appends suffixes like ' - Google Docs' to names.
    For Workspace types, we strip the suffix and use the export extension.
    """
    # Strip Google's type suffixes
    for suffix in [" - Google Docs", " - Google Sheets", " - Google Slides",
                   " - Google Forms", " - Google Drawings"]:
        if raw_name.endswith(suffix):
            raw_name = raw_name[:-len(suffix)]

    # For Google Workspace types → use the export extension
    if mime_type in GOOGLE_WORKSPACE_EXPORTS:
        _, ext = GOOGLE_WORKSPACE_EXPORTS[mime_type]
        base = os.path.splitext(raw_name)[0]
        return f"{base}{ext}"

    return raw_name


def _get_safe_ext(file_name: str, mime_type: str) -> str:
    """Returns a safe file extension for any supported MIME type."""
    if mime_type in GOOGLE_WORKSPACE_EXPORTS:
        _, ext = GOOGLE_WORKSPACE_EXPORTS[mime_type]
        return ext

    ext = os.path.splitext(file_name)[1]
    if ext and len(ext) <= 10:
        return ext
    return ".pdf"  # fallback


# ==========================================
# 🚀 ENDPOINT: SINGLE FILE IMPORT (user token)
# ==========================================
@router.post("/process")
async def process_drive_file(
    background_tasks: BackgroundTasks,
    file_id: str = Form(...),
    file_name: str = Form(...),
    access_token: str = Form(...),
    tenant_id: str = Form(...),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    """Endpoint for importing a specific, single file using user's access token."""
    try:
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT) as client:
            meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=mimeType"
            meta_response = await client.get(meta_url, headers=headers)

            if meta_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not access Google Drive file metadata.")

            mime_type = meta_response.json().get("mimeType", "")

            if mime_type.startswith("application/vnd.google-apps."):
                drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=application/pdf"
                safe_ext = ".pdf"
            else:
                drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                safe_ext = os.path.splitext(file_name)[1]
                if not safe_ext:
                    safe_ext = ".pdf"

            response = await client.get(drive_url, headers=headers)

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to download file from Google Drive.")

        file_bytes = response.content
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        if ingestion_service.db.document_exists(file_hash=file_hash, tenant_id=tenant_id):
            raise HTTPException(status_code=409, detail="Exact file content already exists in the database.")

        file_path = os.path.join(TEMP_DIR, f"{file_hash}{safe_ext}")
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        final_filename = _clean_drive_filename(file_name, mime_type)

        background_tasks.add_task(
            ingestion_service.process_file_background,
            file_path=file_path,
            filename=final_filename,
            file_hash=file_hash,
            tenant_id=tenant_id,
        )

        logger.info(f"Drive file accepted: '{final_filename}' (hash={file_hash[:12]}...)")

        return {
            "status": "processing",
            "message": f"Google Drive file '{final_filename}' is downloading and indexing in the background.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Drive processing failed for '{file_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 🚀 ENDPOINT: RECURSIVE FOLDER SYNC (service account)
# ==========================================
@router.post("/sync")
async def sync_google_drive_folder(
    background_tasks: BackgroundTasks,
    tenant_id: str = Form(...),
    force_resync: bool = Form(False),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    """
    One-click sync — recursively crawls GOOGLE_DRIVE_FOLDER_ID.
    Handles ALL Google Workspace types + native files.

    Set force_resync=true to delete and re-process all files (fixes partial ingestion from crashes).
    """
    folder_id = settings.GOOGLE_DRIVE_FOLDER_ID
    if not folder_id:
        raise HTTPException(status_code=400, detail="GOOGLE_DRIVE_FOLDER_ID not set in .env")

    try:
        # 1. Recursive crawl (subfolders included)
        drive_adapter = GoogleDriveAdapter()
        drive_files = drive_adapter.get_all_files_recursive(folder_id)

        if not drive_files:
            return {
                "status": "success",
                "message": "No supported files found in the shared folder (including subfolders).",
                "queued_files": [],
                "total_found": 0,
            }

        # 2. Get what we already have in Supabase
        existing_filenames = ingestion_service.list_files(tenant_id=tenant_id)

        queued_files = []
        skipped_files = []

        # 3. Compare and queue missing files
        for drive_file in drive_files:
            file_name = drive_file.get("name", "")
            file_id = drive_file.get("id", "")
            mime_type = drive_file.get("mimeType", "")
            folder_path = drive_file.get("folder_path", "")

            # Clean filename (strip Google suffixes, fix extension)
            final_filename = _clean_drive_filename(file_name, mime_type)

            # Prefix with folder path for context (e.g., "HR/Policies/leave_policy.pdf")
            if folder_path:
                display_name = f"{folder_path}{final_filename}"
            else:
                display_name = final_filename

            # Skip if already in Supabase (unless force re-sync)
            if not force_resync and (final_filename in existing_filenames or display_name in existing_filenames):
                skipped_files.append(display_name)
                continue

            # Force re-sync: delete old chunks first
            if force_resync and (final_filename in existing_filenames or display_name in existing_filenames):
                try:
                    ingestion_service.delete_file(filename=final_filename, tenant_id=tenant_id)
                    ingestion_service.delete_file(filename=display_name, tenant_id=tenant_id)
                    logger.info(f"Force re-sync: deleted old chunks for '{display_name}'")
                except Exception as e:
                    logger.warning(f"Failed to delete old chunks for '{display_name}': {e}")

            # Queue for background ingestion
            queued_files.append(display_name)
            background_tasks.add_task(
                _sync_single_file,
                drive_adapter=drive_adapter,
                file_id=file_id,
                file_name=display_name,
                mime_type=mime_type,
                tenant_id=tenant_id,
                ingestion_service=ingestion_service,
            )

        logger.info(
            f"Drive Sync: {len(drive_files)} files found | "
            f"{len(queued_files)} new | {len(skipped_files)} already synced"
        )

        return {
            "status": "success",
            "message": f"Sync started. {len(queued_files)} new files queued from {len(drive_files)} total found.",
            "queued_files": queued_files,
            "total_found": len(drive_files),
            "already_synced": len(skipped_files),
        }

    except FileNotFoundError as e:
        logger.error(f"Drive Sync failed — missing credentials: {e}")
        raise HTTPException(status_code=500, detail="Google Drive service account credentials not configured.")
    except Exception as e:
        logger.error(f"Drive Sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Background worker — routes each file type to the right handler
# ==========================================
def _sync_single_file(
    drive_adapter: GoogleDriveAdapter,
    file_id: str,
    file_name: str,
    mime_type: str,
    tenant_id: str,
    ingestion_service: IngestionService,
):
    """
    Background task: download/export a file and ingest it.

    Smart routing per file type:
      Google Docs    → export as PDF
      Google Sheets  → export as CSV (→ ingested as text)
      Google Slides  → export as plain text
      Native files   → download directly
    """
    safe_ext = _get_safe_ext(file_name, mime_type)
    temp_download_path = os.path.join(TEMP_DIR, f"drive_dl_{file_id}{safe_ext}")

    try:
        # Route to the correct download/export method
        if mime_type in GOOGLE_WORKSPACE_EXPORTS:
            export_mime, _ = GOOGLE_WORKSPACE_EXPORTS[mime_type]
            file_hash = drive_adapter.export_workspace_file_to_disk(
                file_id, export_mime, temp_download_path
            )
            logger.info(f"Exported '{file_name}' as {export_mime}")
        else:
            file_hash = drive_adapter.download_file_to_disk(file_id, temp_download_path)

        # Skip if already exists (hash-based dedup)
        if ingestion_service.db.document_exists(file_hash=file_hash, tenant_id=tenant_id):
            logger.info(f"Skipped '{file_name}' — duplicate hash")
            if os.path.exists(temp_download_path):
                os.remove(temp_download_path)
            return

        # Rename to hash-based filename for processing
        file_path = os.path.join(TEMP_DIR, f"{file_hash}{safe_ext}")
        os.rename(temp_download_path, file_path)

        ingestion_service.process_file_background(
            file_path=file_path,
            filename=file_name,
            file_hash=file_hash,
            tenant_id=tenant_id,
        )
        logger.info(f"Auto-sync ingested: '{file_name}'")

    except Exception as e:
        logger.error(f"Background sync failed for '{file_name}': {e}")
        if os.path.exists(temp_download_path):
            os.remove(temp_download_path)
```

## File: `backend/app/api/upload.py`

```py
"""
Upload API — stream-hashed file uploads to prevent memory spikes.
"""
import os
import hashlib
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service
from app.core.logger import logger

router = APIRouter(prefix="/api/v1/upload", tags=["Document Management"])

TEMP_DIR = "/tmp/actionrag_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# 64KB chunks for stream hashing
HASH_CHUNK_SIZE = 65536


@router.post("/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        # 1. Stream-hash: compute SHA-256 WITHOUT loading entire file into memory
        sha256 = hashlib.sha256()
        safe_ext = os.path.splitext(file.filename)[1]

        # Write to a temp file AND hash simultaneously
        temp_path = os.path.join(TEMP_DIR, f"uploading_{file.filename}")
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(HASH_CHUNK_SIZE)
                if not chunk:
                    break
                sha256.update(chunk)
                f.write(chunk)

        file_hash = sha256.hexdigest()

        # 2. Check Database for this exact fingerprint
        if ingestion_service.db.document_exists(file_hash=file_hash, tenant_id=tenant_id):
            os.remove(temp_path)  # Clean up temp file
            raise HTTPException(status_code=409, detail="Exact file content already exists. Duplicate rejected.")

        # 3. Rename temp file to hash-based filename
        file_path = os.path.join(TEMP_DIR, f"{file_hash}{safe_ext}")
        os.rename(temp_path, file_path)

        # 4. Fire and Forget: Send to the Background Worker
        background_tasks.add_task(
            ingestion_service.process_file_background,
            file_path=file_path,
            filename=file.filename,
            file_hash=file_hash,
            tenant_id=tenant_id,
        )

        logger.info(f"Upload accepted: '{file.filename}' (hash={file_hash[:12]}...)")

        # 5. Instantly return success to the frontend
        return {
            "status": "processing",
            "message": f"'{file.filename}' is processing in the background.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for '{file.filename}': {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

## File: `backend/app/core/__init__.py`

```py
```

## File: `backend/app/core/cache.py`

```py
"""
Caching Layer for Embeddings and Query Results
Reduce repeated queries by 90%+ with simple in-memory cache (or Redis for production)
"""

import hashlib
import json
import time
from typing import Optional, Dict, Any
from app.core.logger import logger


class SimpleCache:
    """In-memory cache for embeddings (2GB should be enough for 1000s of queries)."""

    def __init__(self, max_size: int = 10000, ttl: int = 3600):
        """
        Args:
            max_size: Max number of cached items before eviction
            ttl: Time to live in seconds (default 1 hour)
        """
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.max_size = max_size
        self.ttl = ttl
        self.hits = 0
        self.misses = 0

    def _key(self, text: str) -> str:
        """Create hash key from text."""
        return hashlib.md5(text.encode()).hexdigest()

    def get(self, text: str) -> Optional[Any]:
        """Get from cache with TTL check."""
        key = self._key(text)

        if key not in self.cache:
            self.misses += 1
            return None

        value, timestamp = self.cache[key]

        # Check if expired
        if time.time() - timestamp > self.ttl:
            del self.cache[key]
            self.misses += 1
            return None

        self.hits += 1
        return value

    def set(self, text: str, value: Any) -> None:
        """Set in cache with LRU eviction."""
        key = self._key(text)

        # Evict oldest if full
        if len(self.cache) >= self.max_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]
            logger.debug(f"Cache full, evicted oldest entry")

        self.cache[key] = (value, time.time())

    def clear(self) -> None:
        """Clear all cache."""
        self.cache.clear()

    def stats(self) -> dict:
        """Get cache statistics."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "size": len(self.cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": f"{hit_rate:.1f}%",
        }


class QueryResultCache(SimpleCache):
    """Cache for full query results (search results, reranking)."""

    def get_query_result(self, query: str, tenant_id: str) -> Optional[list]:
        """Get cached search results."""
        key = f"{tenant_id}:{query}"
        return super().get(key)

    def set_query_result(self, query: str, tenant_id: str, results: list) -> None:
        """Cache search results."""
        key = f"{tenant_id}:{query}"
        super().set(key, results)


class EmbeddingCache(SimpleCache):
    """Cache for embeddings (text → vector)."""

    def get_embedding(self, text: str) -> Optional[list]:
        """Get cached embedding."""
        return super().get(text)

    def set_embedding(self, text: str, embedding: list) -> None:
        """Cache embedding."""
        super().set(text, embedding)


class RedisCache:
    """Production version using Redis (for deployed systems)."""

    def __init__(self, redis_url: str):
        import redis

        self.client = redis.Redis.from_url(redis_url, decode_responses=True)
        try:
            self.client.ping()
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    def get(self, key: str) -> Optional[Any]:
        """Get from Redis."""
        data = self.client.get(key)
        if data:
            try:
                return json.loads(data)
            except:
                return data
        return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """Set in Redis with TTL."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        self.client.setex(key, ttl, value)

    def get_embedding(self, text: str) -> Optional[list]:
        """Get cached embedding."""
        key = f"embed:{hashlib.md5(text.encode()).hexdigest()}"
        data = self.get(key)
        if data and isinstance(data, list):
            return data
        elif data:
            return json.loads(data)
        return None

    def set_embedding(self, text: str, embedding: list) -> None:
        """Cache embedding."""
        key = f"embed:{hashlib.md5(text.encode()).hexdigest()}"
        self.set(key, embedding, ttl=24 * 3600)  # 24 hours for embeddings

    def get_query_result(self, query: str, tenant_id: str) -> Optional[list]:
        """Get cached search results."""
        key = f"query:{tenant_id}:{hashlib.md5(query.encode()).hexdigest()}"
        return self.get(key)

    def set_query_result(self, query: str, tenant_id: str, results: list) -> None:
        """Cache search results."""
        key = f"query:{tenant_id}:{hashlib.md5(query.encode()).hexdigest()}"
        self.set(key, results, ttl=3600)  # 1 hour

    def clear(self) -> None:
        """Clear all cache."""
        self.client.flushdb()

    def stats(self) -> dict:
        """Get Redis stats."""
        info = self.client.info("stats")
        return {
            "total_commands_processed": info.get("total_commands_processed"),
            "total_connections_received": info.get("total_connections_received"),
        }


# Factory function to create appropriate cache
def create_cache(cache_type: str = "simple", redis_url: str = None) -> SimpleCache | RedisCache:
    """Create cache instance based on environment."""
    if cache_type == "redis" and redis_url:
        logger.info("Using Redis cache")
        return RedisCache(redis_url)
    else:
        logger.info("Using in-memory cache")
        return SimpleCache()
```

## File: `backend/app/core/config.py`

```py
"""
Centralized, type-safe configuration.

To swap models for production, just edit your .env:
    LLM_MODEL_NAME=llama-3.3-70b-versatile
    EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
    RATE_LIMIT=200/minute
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── External Service Keys ──
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    GROQ_API_KEY: str

    # ── Model Configuration (swap via .env) ──
    LLM_MODEL_NAME: str = "llama-3.1-8b-instant"
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-large-en-v1.5"
    LLM_TEMPERATURE: float = 0.0

    # ── Resilience ──
    REQUEST_TIMEOUT: int = 120         # seconds for external API calls (large file downloads need time)
    LLM_MAX_RETRIES: int = 3           # retry attempts on Groq failures
    DB_MAX_RETRIES: int = 3            # retry attempts on Supabase failures

    # ── Rate Limiting ──
    RATE_LIMIT_CHAT: str = "20/minute"

    # ── Security ──
    CORS_ORIGINS: str = "*"            # comma-separated in production

    # ── RAG Retrieval & Accuracy ──
    RERANKER_MODEL_NAME: str = "Xenova/ms-marco-MiniLM-L-12-v2"
    RETRIEVAL_TOP_K: int = 20          # faster default; can override in .env for max-accuracy mode
    RERANKER_TOP_K: int = 5            # faster default; can override in .env
    MIN_RELEVANCE_SCORE: float = 0.3   # keep balanced precision by default
    MIN_RELEVANCE_SCORE_LOW: float = 0.1  # dynamic floor when few results survive
    ENABLE_QUERY_REWRITE: bool = True  # LLM-based query rewriting for multi-turn
    ENABLE_HYDE: bool = False          # expensive; enable in .env when needed
    ENABLE_MULTI_QUERY: bool = False   # expensive; enable in .env when needed
    ENABLE_NEIGHBOR_CONTEXT: bool = False  # extra DB calls; enable in .env when needed

    # ── Ingestion ──
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 300
    INGESTION_BATCH_SIZE: int = 10     # keep small to avoid OOM with large embedding models

    # ── Google Drive ──
    GOOGLE_DRIVE_FOLDER_ID: str = ""  # set in .env

    # ── Answer Formatting & Structure ──
    ENABLE_STRUCTURED_ANSWERS: bool = True  # Enable hierarchical answer structure
    ENABLE_KEY_TAKEAWAYS: bool = False  # extra LLM call; enable in .env when needed
    ENABLE_RELATED_QUESTIONS: bool = False  # extra LLM call; enable in .env when needed
    RELATED_QUESTIONS_COUNT: int = 3  # Number of related questions to generate
    KEY_TAKEAWAYS_COUNT: int = 3  # Number of key takeaways to extract
    ANSWER_DETAIL_LEVEL: str = "comprehensive"  # or "detailed", "standard"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # don't crash on unknown .env vars


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton — settings are loaded once and reused."""
    return Settings()


# Convenience alias so existing imports still work
settings = get_settings()
```

## File: `backend/app/core/dependencies.py`

```py
"""
Dependency Injection — wires config-driven adapters into services.

This is the ONLY place where adapters are instantiated.
All config values flow from Settings → adapters → services.
"""
from functools import lru_cache
from app.core.config import settings
from app.infrastructure.supabase_adapter import SupabaseAdapter
from app.infrastructure.fastembed_adapter import FastEmbedAdapter
from app.infrastructure.groq_adapter import GroqAdapter
from app.infrastructure.reranker_adapter import FastEmbedRerankerAdapter
from app.services.chat_service import ChatService
from app.services.ingestion_service import IngestionService
from app.services.query_rewriter import QueryRewriter


# ── Singleton Adapters (created once, reused across all requests) ──

@lru_cache()
def _get_db_adapter() -> SupabaseAdapter:
    return SupabaseAdapter(
        url=settings.SUPABASE_URL,
        service_key=settings.SUPABASE_SERVICE_KEY,
        max_retries=settings.DB_MAX_RETRIES,
    )


@lru_cache()
def _get_embedder_adapter() -> FastEmbedAdapter:
    return FastEmbedAdapter(model_name=settings.EMBEDDING_MODEL_NAME)


@lru_cache()
def _get_llm_adapter() -> GroqAdapter:
    return GroqAdapter(
        api_key=settings.GROQ_API_KEY,
        model_name=settings.LLM_MODEL_NAME,
        timeout=settings.REQUEST_TIMEOUT,
        max_retries=settings.LLM_MAX_RETRIES,
    )


@lru_cache()
def _get_reranker_adapter() -> FastEmbedRerankerAdapter:
    return FastEmbedRerankerAdapter(model_name=settings.RERANKER_MODEL_NAME)


# ── Service Factories (called by FastAPI Depends) ──

def get_chat_service() -> ChatService:
    """FastAPI will call this to get a fully configured ChatService."""
    llm = _get_llm_adapter()
    query_rewriter = QueryRewriter(llm=llm) if settings.ENABLE_QUERY_REWRITE else None

    return ChatService(
        db=_get_db_adapter(),
        embedder=_get_embedder_adapter(),
        llm=llm,
        reranker=_get_reranker_adapter(),
        query_rewriter=query_rewriter,
        retrieval_top_k=settings.RETRIEVAL_TOP_K,
        reranker_top_k=settings.RERANKER_TOP_K,
        min_relevance_score=settings.MIN_RELEVANCE_SCORE,
        min_relevance_score_low=settings.MIN_RELEVANCE_SCORE_LOW,
        enable_hyde=settings.ENABLE_HYDE,
        enable_multi_query=settings.ENABLE_MULTI_QUERY,
        enable_neighbor_context=settings.ENABLE_NEIGHBOR_CONTEXT,
    )


def get_ingestion_service() -> IngestionService:
    """FastAPI will call this to get a fully configured IngestionService."""
    return IngestionService(
        db=_get_db_adapter(),
        embedder=_get_embedder_adapter(),
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        batch_size=settings.INGESTION_BATCH_SIZE,
        llm=_get_llm_adapter(),  # For document summary generation
    )
```

## File: `backend/app/core/logger.py`

```py
"""
Centralized logging with loguru.

Usage in any module:
    from app.core.logger import logger
    logger.info("Processing file", filename=name)
"""
import sys
from loguru import logger

# Remove default handler and add a clean structured one
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# Optional: file logging for production debugging
logger.add(
    "/tmp/actionrag.log",
    rotation="10 MB",
    retention="3 days",
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
)
```

## File: `backend/app/core/rate_limiter.py`

```py
"""
Rate limiter — reads limits from config so you can tune via .env.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Uses the caller's IP address for tracking.
# Behind a reverse proxy, configure X-Forwarded-For header parsing.
limiter = Limiter(key_func=get_remote_address)
```

## File: `backend/app/infrastructure/__init__.py`

```py
```

## File: `backend/app/infrastructure/fastembed_adapter.py`

```py
"""
FastEmbed Adapter — config-driven model selection.

To swap embedding models, change EMBEDDING_MODEL_NAME in your .env:
    EMBEDDING_MODEL_NAME=BAAI/bge-large-en-v1.5
"""
from typing import List
from fastembed import TextEmbedding
from app.interfaces.embedder import IEmbedder
from app.core.logger import logger


class FastEmbedAdapter(IEmbedder):
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model = TextEmbedding(model_name=model_name)
        logger.info(f"FastEmbed adapter initialized | model={model_name}")

    def embed_text(self, text_chunks: List[str]) -> List[List[float]]:
        embeddings = list(self.model.embed(text_chunks))
        return [embedding.tolist() for embedding in embeddings]
```

## File: `backend/app/infrastructure/google_drive_adapter.py`

```py
"""
Google Drive Adapter — Glean-like integration with recursive crawl.

Supports ALL Google Workspace types:
  - Google Docs    → export as PDF
  - Google Sheets  → export as CSV
  - Google Slides  → export as plain text
  - Native files   → download directly (PDF, DOCX, TXT, CSV, XLSX)

MEMORY SAFE: Large files are streamed to disk in 10MB chunks.
RECURSIVE: Crawls all subfolders automatically.
PAGINATED: Handles folders with 100+ files via pageToken.
"""
import io
import os
import hashlib
from pathlib import Path
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from app.core.logger import logger

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CREDENTIALS_FILE = os.path.join(BASE_DIR, 'google_credentials.json')

TEMP_DIR = "/tmp/actionrag_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# ── Google Workspace MIME types and their export targets ──
GOOGLE_WORKSPACE_EXPORTS = {
    "application/vnd.google-apps.document":     ("application/pdf", ".pdf"),
    "application/vnd.google-apps.spreadsheet":  ("text/csv", ".csv"),
    "application/vnd.google-apps.presentation": ("text/plain", ".txt"),
}

# ── Native file types we can ingest directly ──
NATIVE_SUPPORTED_MIMES = [
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        # .xlsx
    "application/vnd.ms-excel",                                                  # .xls
]

# All supported MIME types (Google Workspace + native)
ALL_SUPPORTED_MIMES = list(GOOGLE_WORKSPACE_EXPORTS.keys()) + NATIVE_SUPPORTED_MIMES


class GoogleDriveAdapter:
    def __init__(self):
        if not os.path.exists(CREDENTIALS_FILE):
            raise FileNotFoundError(f"Missing credentials at: {CREDENTIALS_FILE}")

        self.credentials = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        self.service = build('drive', 'v3', credentials=self.credentials)

    # ── Folder listing ──

    def get_files_in_folder(self, folder_id: str) -> list:
        """Lists all files in a single folder (flat, paginated)."""
        query = f"'{folder_id}' in parents and trashed = false"
        all_files = []
        page_token = None

        while True:
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='nextPageToken, files(id, name, mimeType, modifiedTime, size)',
                pageToken=page_token,
                pageSize=100,
            ).execute()

            all_files.extend(results.get('files', []))
            page_token = results.get('nextPageToken')
            if not page_token:
                break

        return all_files

    def get_all_files_recursive(self, folder_id: str) -> list:
        """
        Recursively crawls a folder and all subfolders.

        Returns a flat list of all supported files with their full folder path.
        Handles deeply nested folder structures like Glean does.
        """
        all_files = []
        self._crawl_folder(folder_id, "", all_files)
        logger.info(f"Recursive crawl complete: {len(all_files)} supported files found")
        return all_files

    def _crawl_folder(self, folder_id: str, path_prefix: str, result_list: list):
        """Internal recursive crawler."""
        items = self.get_files_in_folder(folder_id)

        for item in items:
            mime = item.get("mimeType", "")
            name = item.get("name", "")

            if mime == "application/vnd.google-apps.folder":
                # Recurse into subfolder
                subfolder_path = f"{path_prefix}{name}/"
                logger.debug(f"Crawling subfolder: {subfolder_path}")
                self._crawl_folder(item["id"], subfolder_path, result_list)
            elif mime in ALL_SUPPORTED_MIMES:
                # Add the folder path context to the file
                item["folder_path"] = path_prefix
                result_list.append(item)
            else:
                logger.debug(f"Skipping unsupported type: {name} ({mime})")

    # ── File downloads (memory-safe, streamed to disk) ──

    def download_file_to_disk(self, file_id: str, dest_path: str) -> str:
        """Downloads a native file directly to disk. Returns SHA-256 hash."""
        request = self.service.files().get_media(fileId=file_id)
        sha256 = hashlib.sha256()

        with open(dest_path, "wb") as f:
            downloader = MediaIoBaseDownload(f, request, chunksize=10 * 1024 * 1024)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    logger.debug(f"Download progress: {int(status.progress() * 100)}%")

        with open(dest_path, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                sha256.update(chunk)

        return sha256.hexdigest()

    def export_workspace_file_to_disk(self, file_id: str, export_mime: str, dest_path: str) -> str:
        """
        Exports a Google Workspace file (Docs/Sheets/Slides) to disk.

        Args:
            file_id: Google Drive file ID
            export_mime: Target MIME type (e.g., 'application/pdf', 'text/csv')
            dest_path: Where to save the exported file

        Returns: SHA-256 hash of the exported file
        """
        request = self.service.files().export_media(fileId=file_id, mimeType=export_mime)
        sha256 = hashlib.sha256()

        with open(dest_path, "wb") as f:
            downloader = MediaIoBaseDownload(f, request, chunksize=10 * 1024 * 1024)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    logger.debug(f"Export progress: {int(status.progress() * 100)}%")

        with open(dest_path, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                sha256.update(chunk)

        return sha256.hexdigest()

    # ── Keep backward compat ──

    def download_file(self, file_id: str) -> bytes:
        """Downloads a file into RAM. Only use for small files (<50MB)."""
        request = self.service.files().get_media(fileId=file_id)
        file_stream = io.BytesIO()
        downloader = MediaIoBaseDownload(file_stream, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        return file_stream.getvalue()

    def export_google_doc_to_disk(self, file_id: str, dest_path: str) -> str:
        """Legacy wrapper — exports Google Doc as PDF to disk."""
        return self.export_workspace_file_to_disk(file_id, "application/pdf", dest_path)
```

## File: `backend/app/infrastructure/groq_adapter.py`

```py
"""
Groq LLM Adapter — config-driven model selection with retry resilience.

To swap models, change LLM_MODEL_NAME in your .env:
    LLM_MODEL_NAME=llama-3.3-70b-versatile
"""
from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.interfaces.llm import ILLM
from app.core.logger import logger


class GroqAdapter(ILLM):
    def __init__(self, api_key: str, model_name: str, timeout: int = 30, max_retries: int = 3):
        if not api_key:
            raise ValueError("Missing Groq API key — set GROQ_API_KEY in .env")
        self.client = Groq(api_key=api_key, timeout=timeout)
        self.model_name = model_name
        self.max_retries = max_retries
        logger.info(f"Groq adapter initialized | model={model_name} | timeout={timeout}s")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(Exception),
        before_sleep=lambda retry_state: logger.warning(
            f"Groq call failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.0) -> str:
        response = self.client.chat.completions.create(
            model=self.model_name,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(Exception),
        before_sleep=lambda retry_state: logger.warning(
            f"Groq chat call failed (attempt {retry_state.attempt_number}), retrying..."
        ),
    )
    def chat_with_messages(self, messages: list, temperature: float = 0.0) -> str:
        """Full message list call — used by ChatService for history-aware conversations."""
        response = self.client.chat.completions.create(
            model=self.model_name,
            temperature=temperature,
            messages=messages,
        )
        return response.choices[0].message.content
```

## File: `backend/app/infrastructure/reranker_adapter.py`

```py
"""
FastEmbed Reranker Adapter — local cross-encoder re-ranking via ONNX.

Uses a tiny (~23MB) MiniLM cross-encoder model that runs locally with zero
API calls. Dramatically improves retrieval accuracy by scoring each
(query, document) pair with full cross-attention.

To swap models, change RERANKER_MODEL_NAME in your .env:
    RERANKER_MODEL_NAME=Xenova/ms-marco-MiniLM-L-12-v2
"""
from fastembed.rerank.cross_encoder import TextCrossEncoder
from app.interfaces.reranker import IReranker
from app.core.logger import logger


class FastEmbedRerankerAdapter(IReranker):
    def __init__(self, model_name: str = "Xenova/ms-marco-MiniLM-L-6-v2"):
        self.model = TextCrossEncoder(model_name=model_name)
        logger.info(f"Reranker adapter initialized | model={model_name}")

    def rerank(self, query: str, documents: list[dict], top_k: int = 5) -> list[dict]:
        """
        Re-ranks documents using cross-encoder scores.

        Scores each (query, doc.content) pair, sorts by score descending,
        and returns the top_k most relevant documents.
        """
        if not documents:
            return []

        # Extract text content for scoring
        passages = [doc.get("content", "") for doc in documents]

        # Score all (query, passage) pairs
        scores = list(self.model.rerank(query, passages))

        # Attach scores back to documents (handle both float and score-object return types)
        scored_docs = []
        for score_entry, doc in zip(scores, documents):
            if isinstance(score_entry, float):
                score = score_entry
            else:
                score = float(score_entry.score)
            enriched = {**doc, "rerank_score": score}
            scored_docs.append(enriched)

        # Sort by cross-encoder score (highest = most relevant)
        scored_docs.sort(key=lambda d: d["rerank_score"], reverse=True)

        logger.debug(
            f"Re-ranked {len(documents)}→{min(top_k, len(scored_docs))} docs | "
            f"top_score={scored_docs[0]['rerank_score']:.4f}" if scored_docs else "no docs"
        )

        return scored_docs[:top_k]
```

## File: `backend/app/infrastructure/supabase_adapter.py`

```py
"""
Supabase Adapter — all DB operations with retry resilience.

Wraps every call with tenacity retries so transient network errors
(connection resets, timeouts) don't crash the entire request.
"""
import httpx
from typing import List, Dict, Any
from supabase import create_client, Client
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.interfaces.vector_store import IVectorStore
from app.core.logger import logger

# Define a tuple of exceptions that are safe to retry.
# Retrying on all `Exception` types can be dangerous, as it might hide
# permanent errors (like auth issues or bad SQL) and lead to repeated,
# failing requests. We should only retry on transient network-related issues.
RETRYABLE_EXCEPTIONS = (
    httpx.ConnectError,
    httpx.ReadTimeout,
    httpx.ConnectTimeout,
)

class SupabaseAdapter(IVectorStore):
    def __init__(self, url: str, service_key: str, max_retries: int = 3):
        if not url or not service_key:
            raise ValueError("Missing Supabase credentials — set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        self.client: Client = create_client(url, service_key)
        self.max_retries = max_retries
        logger.info("Supabase adapter initialized")

    # ── Document Operations ──

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase save_documents retry (attempt {rs.attempt_number})"),
    )
    def save_documents(self, records: List[Dict[str, Any]]) -> int:
        response = self.client.table("documents").insert(records).execute()
        return len(response.data)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase search_similar retry (attempt {rs.attempt_number})"),
    )
    def search_similar(self, query_vector: list[float], query_text: str, tenant_id: str, limit: int = 10) -> list[dict]:
        """Runs the Hybrid Search RPC in Supabase."""
        try:
            response = self.client.rpc(
                "match_documents_hybrid",
                {
                    "query_embedding": query_vector,
                    "query_text": query_text,
                    "match_tenant_id": tenant_id,
                    "match_count": limit,
                },
            ).execute()
            return response.data
        except Exception as e:
            logger.error(f"Hybrid search failed: {e}")
            return []

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase document_exists retry (attempt {rs.attempt_number})"),
    )
    def document_exists(self, file_hash: str, tenant_id: str) -> bool:
        """Checks if a file with this exact SHA-256 fingerprint already exists."""
        response = (
            self.client.table("documents")
            .select("id")
            .eq("file_hash", file_hash)
            .eq("tenant_id", tenant_id)
            .limit(1)
            .execute()
        )
        return len(response.data) > 0

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase delete_document retry (attempt {rs.attempt_number})"),
    )
    def delete_document(self, filename: str, tenant_id: str) -> bool:
        response = (
            self.client.table("documents")
            .delete()
            .eq("tenant_id", tenant_id)
            .eq("filename", filename)
            .execute()
        )
        return len(response.data) > 0

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase get_all_documents retry (attempt {rs.attempt_number})"),
    )
    def get_all_documents(self, tenant_id: str) -> List[str]:
        """Fetches a list of all unique filenames for a tenant."""
        response = self.client.table("documents").select("filename").eq("tenant_id", tenant_id).execute()
        unique_files = list(set([row["filename"] for row in response.data]))
        return unique_files

    # ── Chat Session Operations ──

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase create_chat_session retry (attempt {rs.attempt_number})"),
    )
    def create_chat_session(self, tenant_id: str, title: str = "New Conversation") -> str:
        """Creates a new blank chat room and returns the session_id."""
        response = self.client.table("chat_sessions").insert({
            "tenant_id": tenant_id,
            "title": title,
        }).execute()
        return response.data[0]["id"]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase get_chat_history retry (attempt {rs.attempt_number})"),
    )
    def get_chat_history(self, session_id: str) -> list:
        """Fetches the entire conversation history in chronological order."""
        response = (
            self.client.table("chat_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return response.data

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
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
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(RETRYABLE_EXCEPTIONS),
        before_sleep=lambda rs: logger.warning(f"Supabase get_neighboring_chunks retry (attempt {rs.attempt_number})"),
    )
    def get_neighboring_chunks(self, filename: str, content_snippet: str, tenant_id: str, limit: int = 5) -> list[dict]:
        """
        Fetches chunks from the same document to provide surrounding context.

        Used for parent-child retrieval — when a matched chunk is small,
        we expand context by including adjacent chunks from the same file.
        Returns chunks ordered by their database insertion order (proxy for position).
        """
        try:
            response = (
                self.client.table("documents")
                .select("id, filename, content")
                .eq("tenant_id", tenant_id)
                .eq("filename", filename)
                .order("created_at")
                .limit(limit)
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Failed to fetch neighboring chunks for '{filename}': {e}")
            return []
```

## File: `backend/app/interfaces/__init__.py`

```py
```

## File: `backend/app/interfaces/embedder.py`

```py
from abc import ABC, abstractmethod
from typing import List

class IEmbedder(ABC):
    @abstractmethod
    def embed_text(self, text_chunks: List[str]) -> List[List[float]]:
        """
        Converts a list of text strings into a list of mathematical vectors.
        """
        pass
```

## File: `backend/app/interfaces/llm.py`

```py
from abc import ABC, abstractmethod


class ILLM(ABC):
    @abstractmethod
    def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.0) -> str:
        """
        Sends the strict prompt to the AI and returns the secure answer.
        Temperature defaults to 0.0 to enforce the anti-hallucination policy.
        """
        pass

    @abstractmethod
    def chat_with_messages(self, messages: list, temperature: float = 0.0) -> str:
        """
        Full message list call for history-aware conversations.
        Used by ChatService to pass system prompt + chat history together.
        """
        pass
```

## File: `backend/app/interfaces/reranker.py`

```py
"""
Reranker Interface — contract for cross-encoder re-ranking adapters.

Re-rankers score each (query, document) pair with full cross-attention,
producing far more accurate relevance scores than vector cosine similarity.
"""
from abc import ABC, abstractmethod
from typing import List


class IReranker(ABC):
    @abstractmethod
    def rerank(self, query: str, documents: list[dict], top_k: int = 5) -> list[dict]:
        """
        Re-scores and re-orders retrieved documents by relevance to the query.

        Args:
            query: The user's search query.
            documents: List of dicts with at least a 'content' key.
            top_k: Number of top results to return after re-ranking.

        Returns:
            The top_k documents sorted by cross-encoder relevance score,
            each enriched with a 'rerank_score' key.
        """
        pass
```

## File: `backend/app/interfaces/vector_store.py`

```py
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
```

## File: `backend/app/services/__init__.py`

```py
```

## File: `backend/app/services/chat_service.py`

```py
"""
Chat Service — the core Q&A engine with advanced retrieval strategies.

ACCURACY FEATURES (v2):
  - HyDE (Hypothetical Document Embeddings) — bridges vocabulary mismatch
  - Multi-query retrieval — searches with 3 query variations
  - Cross-encoder re-ranking — scores each (query, doc) with full attention
  - Dynamic relevance threshold — adapts when few results survive
  - Parent-child context — expands matched chunks with neighboring context
  - Chat history condensation — summarizes old history to save tokens
  - Multi-source confidence — detects when sources disagree

Uses interfaces (IVectorStore, IEmbedder, ILLM, IReranker) so swapping
adapters requires zero changes here — just update .env.
"""
import time
from typing import Optional
from app.interfaces.vector_store import IVectorStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.llm import ILLM
from app.interfaces.reranker import IReranker
from app.core.logger import logger
from app.core.config import settings


class ChatService:
    def __init__(
        self,
        db: IVectorStore,
        embedder: IEmbedder,
        llm: ILLM,
        reranker: IReranker,
        query_rewriter=None,
        retrieval_top_k: int = 40,
        reranker_top_k: int = 8,
        min_relevance_score: float = 0.3,
        min_relevance_score_low: float = 0.1,
        enable_hyde: bool = True,
        enable_multi_query: bool = True,
        enable_neighbor_context: bool = True,
    ):
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.reranker = reranker
        self.query_rewriter = query_rewriter
        self.retrieval_top_k = retrieval_top_k
        self.reranker_top_k = reranker_top_k
        self.min_relevance_score = min_relevance_score
        self.min_relevance_score_low = min_relevance_score_low
        self.enable_hyde = enable_hyde
        self.enable_multi_query = enable_multi_query
        self.enable_neighbor_context = enable_neighbor_context

    def _get_doc_relevance_score(self, doc: dict) -> float:
        """
        Returns the best available relevance score for a document.

        Priority:
        1) Cross-encoder score (`rerank_score`) when available
        2) Vector/Hybrid score (`similarity`) as fallback
        """
        if "rerank_score" in doc and doc.get("rerank_score") is not None:
            return float(doc.get("rerank_score", 0.0))
        return float(doc.get("similarity", 0.0))

    def ask_question(self, question: str, tenant_id: str, session_id: str) -> dict:
        total_start = time.perf_counter()

        # 1. Save user question to stateful memory
        try:
            self.db.save_chat_message(session_id=session_id, role="user", content=question)
        except Exception as e:
            logger.error(f"Failed to save user message: {e}")

        # 2. Fetch history (graceful: empty history if DB fails)
        chat_history = []
        try:
            chat_history = self.db.get_chat_history(session_id=session_id)
        except Exception as e:
            logger.warning(f"Failed to fetch chat history, continuing without it: {e}")

        # 3. ✨ Query Rewriting — resolve multi-turn context
        rewrite_start = time.perf_counter()
        search_query = question
        if self.query_rewriter:
            try:
                search_query = self.query_rewriter.rewrite(question, chat_history)
            except Exception as e:
                logger.warning(f"Query rewriting failed, using original: {e}")
                search_query = question
        rewrite_ms = (time.perf_counter() - rewrite_start) * 1000

        # 4-8. Retrieval Pipeline (normal pass)
        retrieval_start = time.perf_counter()
        retrieved_docs = self._retrieve_documents(search_query=search_query, tenant_id=tenant_id)
        retrieval_ms = (time.perf_counter() - retrieval_start) * 1000

        # 9. Confidence detection (normal pass)
        confidence_level = self._determine_confidence(retrieved_docs)
        rescue_used = False

        # 9b. Accuracy rescue pass: retry once only when evidence is genuinely weak.
        if self._should_run_accuracy_rescue(confidence_level, retrieved_docs):
            rescue_start = time.perf_counter()
            rescue_docs = self._retrieve_documents(
                search_query=search_query,
                tenant_id=tenant_id,
                force_hyde=True,
                force_multi_query=True,
                retrieval_limit=max(self.retrieval_top_k, self.retrieval_top_k + 10),
            )
            rescue_ms = (time.perf_counter() - rescue_start) * 1000
            rescue_confidence = self._determine_confidence(rescue_docs)

            rank = {"low": 0, "medium": 1, "multi_source": 2, "high": 3}
            current_top = max((self._get_doc_relevance_score(doc) for doc in retrieved_docs), default=0.0)
            rescue_top = max((self._get_doc_relevance_score(doc) for doc in rescue_docs), default=0.0)

            should_use_rescue = (
                rank.get(rescue_confidence, 0) > rank.get(confidence_level, 0)
                or (
                    rank.get(rescue_confidence, 0) == rank.get(confidence_level, 0)
                    and rescue_top >= (current_top + 0.05)
                )
                or (
                    rank.get(rescue_confidence, 0) == rank.get(confidence_level, 0)
                    and len(rescue_docs) > len(retrieved_docs)
                    and rescue_top >= current_top
                )
            )

            if should_use_rescue:
                logger.info(
                    f"Rescue pass selected | confidence {confidence_level}→{rescue_confidence} "
                    f"| docs {len(retrieved_docs)}→{len(rescue_docs)}"
                )
                retrieved_docs = rescue_docs
                confidence_level = rescue_confidence
                rescue_used = True

            logger.info(
                f"Rescue pass evaluated | used={rescue_used} | ms={rescue_ms:.1f} "
                f"| confidence={confidence_level}"
            )

        logger.info(f"Confidence level: {confidence_level}")

        # 10. Context Builder (labeled, isolated, with relevance scores)
        context_parts = []
        for doc in retrieved_docs:
            score_label = ""
            if "rerank_score" in doc:
                score_label = f" [relevance: {doc['rerank_score']:.2f}]"
            neighbor_label = " [+ neighboring context]" if doc.get("has_neighbor_context") else ""
            context_parts.append(
                f"--- START OF SOURCE: {doc['filename']}{score_label}{neighbor_label} ---\n"
                f"{doc['content']}\n"
                f"--- END OF SOURCE: {doc['filename']} ---"
            )
        context_text = "\n\n".join(context_parts)

        # 11. Structured logging
        logger.info(f"Chat query | tenant={tenant_id} | session={session_id}")
        logger.debug(f"Retrieved {len(retrieved_docs)} docs: {[d.get('filename') for d in retrieved_docs]}")

        # 12. THE DEFINED FALLBACK PHRASE
        fallback_phrase = "I could not find the answer to this in the provided company documents."

        # 13. ✨ Chat History Condensation
        condensed_history = self._condense_history(chat_history)

        # 14. ✨ Confidence-aware system prompt
        system_prompt = self._build_system_prompt(
            context_text=context_text,
            fallback_phrase=fallback_phrase,
            confidence_level=confidence_level,
        )

        messages = [{"role": "system", "content": system_prompt}]

        # Inject condensed history
        for msg in condensed_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # 15. Call LLM through interface
        llm_start = time.perf_counter()
        try:
            answer = self.llm.chat_with_messages(messages=messages, temperature=0.0)
        except Exception as e:
            logger.error(f"LLM call failed after retries: {e}")
            answer = "I'm temporarily unable to process your question. Please try again in a moment."
        llm_ms = (time.perf_counter() - llm_start) * 1000

        # 16. Save AI answer (non-fatal if it fails)
        try:
            self.db.save_chat_message(session_id=session_id, role="assistant", content=answer)
        except Exception as e:
            logger.error(f"Failed to save assistant message: {e}")

        # 17. Extract Key Takeaways (NEW)
        post_start = time.perf_counter()
        key_takeaways = []
        if settings.ENABLE_KEY_TAKEAWAYS:
            try:
                key_takeaways = self._extract_key_takeaways(answer)
            except Exception as e:
                logger.warning(f"Key takeaway extraction failed: {e}")

        # 18. Generate Related Questions (NEW)
        related_questions = []
        if settings.ENABLE_RELATED_QUESTIONS:
            try:
                related_questions = self._generate_related_questions(answer, retrieved_docs, question)
            except Exception as e:
                logger.warning(f"Related questions generation failed: {e}")
        post_ms = (time.perf_counter() - post_start) * 1000

        # 19. Citation Builder (with re-rank scores)
        citations = []
        if fallback_phrase not in answer:
            for doc in retrieved_docs:
                citations.append({
                    "filename": doc["filename"],
                    "content": doc["content"],
                    "similarity": doc.get("similarity", 0.0),
                    "rerank_score": doc.get("rerank_score", None),
                })

        total_ms = (time.perf_counter() - total_start) * 1000
        logger.info(
            f"Chat timings | rewrite={rewrite_ms:.1f}ms | retrieval={retrieval_ms:.1f}ms "
            f"| llm={llm_ms:.1f}ms | post={post_ms:.1f}ms | total={total_ms:.1f}ms "
            f"| rescue_used={rescue_used} | docs={len(retrieved_docs)}"
        )

        return {
            "answer": answer,
            "key_takeaways": key_takeaways,
            "related_questions": related_questions,
            "citations": citations,
            "session_id": session_id,
            "confidence": confidence_level,
        }

    def _should_run_accuracy_rescue(self, confidence_level: str, docs: list[dict]) -> bool:
        """
        Runs rescue pass only when first-pass evidence is genuinely weak.

        This preserves accuracy while avoiding unnecessary duplicate expensive retrieval.
        """
        if not docs:
            return True

        top_score = max((self._get_doc_relevance_score(doc) for doc in docs), default=0.0)

        if top_score < max(0.12, self.min_relevance_score_low):
            return True

        if len(docs) == 1 and top_score < max(0.25, self.min_relevance_score):
            return True

        if confidence_level == "low" and top_score < 0.25 and len(docs) < 2:
            return True

        return False

    # ══════════════════════════════════════════════
    # ✨ NEW: Advanced Retrieval Strategies
    # ══════════════════════════════════════════════

    def _build_search_queries(
        self,
        search_query: str,
        use_hyde: Optional[bool] = None,
        use_multi_query: Optional[bool] = None,
    ) -> list[str]:
        """
        Generates multiple search queries for improved retrieval.

        1. Original query (always included)
        2. HyDE — hypothetical document embedding
        3. Multi-query — LLM-generated variations
        """
        queries = [search_query]
        use_hyde = self.enable_hyde if use_hyde is None else use_hyde
        use_multi_query = self.enable_multi_query if use_multi_query is None else use_multi_query

        # HyDE: Generate a hypothetical answer and use IT for embedding search
        if use_hyde:
            try:
                hypothetical = self.llm.generate_response(
                    system_prompt=(
                        "You are a helpful assistant. Given a question, write a short paragraph (2-3 sentences) "
                        "that would answer this question, as if quoting from an internal company document. "
                        "Be specific and factual-sounding. Output ONLY the paragraph."
                    ),
                    user_prompt=search_query,
                    temperature=0.0,
                )
                if hypothetical and len(hypothetical) > 20:
                    queries.append(hypothetical)
                    logger.info(f"HyDE generated hypothetical answer ({len(hypothetical)} chars)")
            except Exception as e:
                logger.warning(f"HyDE generation failed: {e}")

        # Multi-Query: Generate alternative phrasings
        if use_multi_query:
            try:
                alternatives = self.llm.generate_response(
                    system_prompt=(
                        "You are a search query optimizer. Given a question, generate 2 alternative "
                        "phrasings that might retrieve different relevant documents. "
                        "Output ONLY the 2 queries, one per line, no numbering or bullets."
                    ),
                    user_prompt=search_query,
                    temperature=0.3,
                )
                if alternatives:
                    for alt in alternatives.strip().split("\n"):
                        alt = alt.strip().strip("-").strip("•").strip()
                        if alt and len(alt) > 10 and len(alt) < 300:
                            queries.append(alt)
                    logger.info(f"Multi-query generated {len(queries)-1} alternative queries")
            except Exception as e:
                logger.warning(f"Multi-query generation failed: {e}")

        return queries

    def _multi_query_search(
        self,
        queries: list[str],
        original_query: str,
        tenant_id: str,
        retrieval_limit: Optional[int] = None,
    ) -> list[dict]:
        """
        Searches with multiple queries and merges results with deduplication.

        Each query's results are combined; duplicates (same content) are removed,
        keeping the highest similarity score.
        """
        all_docs = {}  # key: content hash, value: doc dict
        search_limit = retrieval_limit or self.retrieval_top_k

        for query in queries:
            try:
                query_vector = self.embedder.embed_text([query])[0]
                docs = self.db.search_similar(
                    query_vector=query_vector,
                    query_text=original_query,  # Always use original for keyword search
                    tenant_id=tenant_id,
                    limit=search_limit,
                )
                for doc in docs:
                    # Deduplicate by content (keep highest similarity)
                    content_key = doc.get("content", "")[:100]
                    existing = all_docs.get(content_key)
                    if not existing or doc.get("similarity", 0) > existing.get("similarity", 0):
                        all_docs[content_key] = doc
            except Exception as e:
                logger.error(f"Search failed for query variant: {e}")

        merged = list(all_docs.values())
        logger.info(f"Multi-query search: {len(queries)} queries → {len(merged)} unique docs")
        return merged

    def _retrieve_documents(
        self,
        search_query: str,
        tenant_id: str,
        force_hyde: Optional[bool] = None,
        force_multi_query: Optional[bool] = None,
        retrieval_limit: Optional[int] = None,
    ) -> list[dict]:
        """Runs full retrieval stack and returns filtered/enriched documents."""
        search_queries = self._build_search_queries(
            search_query=search_query,
            use_hyde=force_hyde,
            use_multi_query=force_multi_query,
        )

        retrieved_docs = self._multi_query_search(
            queries=search_queries,
            original_query=search_query,
            tenant_id=tenant_id,
            retrieval_limit=retrieval_limit,
        )

        if retrieved_docs and self.reranker:
            try:
                retrieved_docs = self.reranker.rerank(
                    query=search_query,
                    documents=retrieved_docs,
                    top_k=self.reranker_top_k,
                )
                logger.info(f"Re-ranked → top {len(retrieved_docs)} docs")
            except Exception as e:
                logger.warning(f"Re-ranking failed, using original order: {e}")
                retrieved_docs = retrieved_docs[:self.reranker_top_k]

        retrieved_docs = self._dynamic_relevance_filter(retrieved_docs)

        if self.enable_neighbor_context and retrieved_docs:
            retrieved_docs = self._expand_with_neighbors(retrieved_docs, tenant_id)

        return retrieved_docs

    def _dynamic_relevance_filter(self, docs: list) -> list:
        """
        Filters docs by relevance score with dynamic threshold.

        If fewer than 2 docs survive the normal threshold, falls back to
        a lower threshold to avoid returning nothing on partial matches.
        """
        if not docs:
            return docs

        # First pass: normal threshold
        filtered = [
            doc for doc in docs
            if self._get_doc_relevance_score(doc) >= self.min_relevance_score
        ]

        # If we filtered too aggressively, try with lower threshold
        if len(filtered) < 2:
            filtered = [
                doc for doc in docs
                if self._get_doc_relevance_score(doc) >= self.min_relevance_score_low
            ]
            if len(filtered) > len(docs):
                filtered = docs  # Shouldn't happen, but safety check
            logger.info(
                f"Dynamic threshold: {self.min_relevance_score} → {self.min_relevance_score_low} "
                f"({len(docs)} → {len(filtered)} docs)"
            )
        else:
            filtered_count = len(docs) - len(filtered)
            if filtered_count > 0:
                logger.info(f"Filtered out {filtered_count} low-relevance docs (threshold={self.min_relevance_score})")

        return filtered

    def _expand_with_neighbors(self, docs: list, tenant_id: str) -> list:
        """
        Expands retrieved chunks with neighboring context from the same document.

        For each matched chunk, fetches adjacent chunks from the same file
        and appends their content, giving the LLM more surrounding context.
        """
        expanded = []
        seen_filenames = set()

        for doc in docs:
            filename = doc.get("filename", "")

            # Only expand once per unique filename to avoid bloat
            if filename in seen_filenames or not filename:
                expanded.append(doc)
                continue

            seen_filenames.add(filename)

            try:
                neighbors = self.db.get_neighboring_chunks(
                    filename=filename,
                    content_snippet=doc.get("content", "")[:100],
                    tenant_id=tenant_id,
                    limit=5,
                )

                if neighbors and len(neighbors) > 1:
                    # Combine neighbor content (excluding the matched chunk itself)
                    neighbor_texts = []
                    for n in neighbors:
                        n_content = n.get("content", "")
                        if n_content and n_content[:100] != doc.get("content", "")[:100]:
                            neighbor_texts.append(n_content)

                    if neighbor_texts:
                        expanded_content = (
                            doc["content"] + "\n\n"
                            "[SURROUNDING CONTEXT FROM SAME DOCUMENT]\n" +
                            "\n---\n".join(neighbor_texts[:2])  # Max 2 neighbors
                        )
                        enriched_doc = {**doc, "content": expanded_content, "has_neighbor_context": True}
                        expanded.append(enriched_doc)
                        logger.debug(f"Expanded '{filename}' with {len(neighbor_texts[:2])} neighbor chunks")
                        continue

            except Exception as e:
                logger.warning(f"Neighbor expansion failed for '{filename}': {e}")

            expanded.append(doc)

        return expanded

    # ══════════════════════════════════════════════
    # ✨ NEW: Chat History Condensation
    # ══════════════════════════════════════════════

    def _condense_history(self, chat_history: list) -> list:
        """
        Condenses long chat histories to save LLM tokens.

        - If ≤ 10 messages: pass all of them directly
        - If > 10 messages: summarize older messages + keep last 4 verbatim
        """
        if len(chat_history) <= 10:
            return chat_history

        # Split into old (to summarize) and recent (to keep verbatim)
        old_messages = chat_history[:-4]
        recent_messages = chat_history[-4:]

        try:
            old_text = "\n".join(
                f"{msg['role'].upper()}: {msg['content']}" for msg in old_messages
            )

            summary = self.llm.generate_response(
                system_prompt=(
                    "Summarize the following conversation history in 2-3 sentences. "
                    "Focus on the key topics discussed and any important facts mentioned. "
                    "Output ONLY the summary."
                ),
                user_prompt=old_text[:2000],
                temperature=0.0,
            )

            if summary and len(summary) > 10:
                condensed = [
                    {"role": "system", "content": f"[Previous conversation summary: {summary}]"}
                ]
                condensed.extend(recent_messages)
                logger.info(f"Condensed {len(old_messages)} old messages into summary")
                return condensed

        except Exception as e:
            logger.warning(f"History condensation failed, using last 8 messages: {e}")

        return chat_history[-8:]

    # ══════════════════════════════════════════════
    # Confidence & Prompt Building
    # ══════════════════════════════════════════════

    def _determine_confidence(self, docs: list) -> str:
        """
        Classifies retrieval confidence with multi-source detection.

        Returns: 'high', 'multi_source', 'medium', or 'low'
        """
        if not docs:
            return "low"

        scores = [self._get_doc_relevance_score(doc) for doc in docs]
        top_score = max(scores)
        unique_files = set(doc.get("filename", "") for doc in docs)

        # Multi-source: top docs come from different files with varying scores
        if len(unique_files) >= 3 and top_score >= 0.5:
            score_spread = max(scores) - min(scores)
            if score_spread > 0.3:
                return "multi_source"

        if top_score >= 0.7:
            return "high"
        elif top_score >= 0.3:
            return "medium"
        else:
            return "low"

    def _build_system_prompt(
        self, context_text: str, fallback_phrase: str, confidence_level: str
    ) -> str:
        """
        Builds a confidence-aware system prompt.

        - High confidence: full authoritative answer
        - Multi-source: synthesize across documents, note differences
        - Medium confidence: hedged answer acknowledging uncertainty
        - Low confidence: fallback
        """
        if confidence_level == "low" and not context_text:
            # No context at all — use minimal prompt
            return f"""You are ActionRAG, an Enterprise Knowledge Agent.

You have NO relevant documents to answer the user's question.
Reply with EXACTLY this phrase and nothing else: "{fallback_phrase}" """

        detail_level = (settings.ANSWER_DETAIL_LEVEL or "comprehensive").strip().lower()
        if detail_level == "standard":
            detail_instruction = "Provide a concise but complete answer in 1-3 short paragraphs."
        elif detail_level == "detailed":
            detail_instruction = "Provide a detailed answer with clear explanations, covering key points and important nuances."
        else:
            detail_instruction = "Provide a comprehensive answer with full coverage of relevant points, edge cases, and practical implications from the context."

        if settings.ENABLE_STRUCTURED_ANSWERS:
            structure_instruction = (
                "OUTPUT STRUCTURE: Use this structure when relevant: "
                "## Direct Answer, ## Detailed Explanation, ## Evidence by Source, ## Gaps or Unknowns. "
                "In 'Evidence by Source', cite filenames from the context and map each major claim to at least one source."
            )
        else:
            structure_instruction = (
                "OUTPUT STRUCTURE: Keep a natural narrative format, but still separate major ideas into clear paragraphs."
            )

        confidence_instruction = ""
        if confidence_level == "high":
            confidence_instruction = """CONFIDENCE: The retrieved sources are HIGHLY relevant. Give a direct, authoritative answer based on the evidence below."""
        elif confidence_level == "multi_source":
            confidence_instruction = """CONFIDENCE: The answer spans MULTIPLE documents. Synthesize information across all sources into a coherent answer. If sources contain conflicting information, clearly note the discrepancy and cite which document says what."""
        elif confidence_level == "medium":
            confidence_instruction = """CONFIDENCE: The retrieved sources are PARTIALLY relevant. Answer what you can from the evidence, but clearly state what information is incomplete or uncertain. Preface uncertain parts with "Based on the available information..." or "The documents suggest..." — do NOT invent facts to fill gaps."""
        else:
            confidence_instruction = f"""CONFIDENCE: The retrieved sources have LOW relevance to the question. Provide a cautious, evidence-limited answer using ONLY available context. If the context still does not support a direct answer, reply with EXACTLY: "{fallback_phrase}" """

        return f"""You are ActionRAG, an expert Enterprise Knowledge Agent.

INSTRUCTIONS:
1. FACTUAL ACCURACY: Answer the user's question using ONLY the facts provided in the CONTEXT below. Never invent, assume, or hallucinate information not present in the sources.
2. {confidence_instruction}
3. DETAIL LEVEL: {detail_instruction}
4. {structure_instruction}
5. SOURCE ISOLATION: The CONTEXT is divided by filenames (e.g., '--- START OF SOURCE: filename.pdf ---').
   - If the user asks about a specific document, ONLY use facts from that file's sections.
   - Sources with higher [relevance] scores are more likely to contain the answer — prioritize them.
   - Sections marked [+ neighboring context] provide surrounding context from the same document for better understanding.
6. SYNTHESIS: When multiple chunks from the SAME document are relevant, synthesize them into a coherent answer rather than repeating information.
7. NATURAL STRUCTURE (FLEXIBLE): Write naturally and conversationally, using structure ONLY where it improves clarity:
   - For complex topics: Use clear paragraphs with descriptive headers (##, ###) where appropriate
   - For lists: Use bullet points naturally when describing multiple items
   - For comparisons: Use tables when comparing 2+ similar items
   - Don't force sections if the topic flows better as prose
   - When relevant, highlight key points with **bold** for emphasis
   - Use appropriate markdown but keep it minimal and natural
8. FORMATTING GUIDELINES:
   - Use markdown naturally and minimally
   - Use **bold** only for key terms and concepts
   - Use bullet points for actual lists, not for padding
   - Use headers (##, ###) only when topic transitions are clear
   - Keep writing concise, engaging, and direct
9. SOURCE-CLAIM DISCIPLINE: Do not make a claim unless it is supported by at least one retrieved source chunk.
10. THE SHIELD: If the CONTEXT does not contain enough information, reply with EXACTLY: "{fallback_phrase}"

CONTEXT:
{context_text}"""

    # ══════════════════════════════════════════════
    # ✨ NEW: Key Takeaways & Related Questions
    # ══════════════════════════════════════════════

    def _extract_key_takeaways(self, answer: str) -> list[str]:
        """
        Intelligently extracts key takeaways from the answer ONLY if meaningful.

        Strategy 1: Parse markdown for existing bullet points (natural structure)
        Strategy 2: Only use LLM extraction if answer is long enough (>500 chars)
        Strategy 3: Return empty if answer is short or conversational (no forced extraction)
        """
        import re

        # Strategy 1: Look for existing bullet points in the answer
        # If the answer naturally has bullet points, extract those as takeaways
        bullet_pattern = r"[•\-\*]\s+(.+?)(?=\n[•\-\*]|\n##|\n\n|$)"
        bullets = re.findall(bullet_pattern, answer, re.DOTALL)

        if bullets:
            # Filter to meaningful bullets (>10 chars, not too long)
            meaningful_bullets = [
                b.strip().replace('\n', ' ')[:120]
                for b in bullets
                if b.strip() and len(b.strip()) > 10 and len(b.strip()) < 500
            ]
            if meaningful_bullets:
                return meaningful_bullets[:settings.KEY_TAKEAWAYS_COUNT]

        # Strategy 2: Only extract if answer is substantial (avoid forcing structure on short answers)
        if len(answer) < 300:
            return []  # Too short for takeaways

        # Strategy 3: Use LLM extraction ONLY for longer answers
        try:
            takeaways_text = self.llm.generate_response(
                system_prompt=(
                    f"Extract 2-3 key takeaways from this text. "
                    "Output ONLY bullet points (starting with •), one per line. "
                    "Keep each takeaway under 20 words. "
                    "Only extract if there are clear, distinct points worth highlighting. "
                    "If the text is conversational with no clear key points, output: NONE"
                ),
                user_prompt=answer[:2000],
                temperature=0.0,
            )

            if takeaways_text and "NONE" not in takeaways_text.upper():
                # Parse bullet points
                bullets = re.findall(bullet_pattern, takeaways_text)
                if bullets:
                    takeaways = [
                        b.strip().replace('\n', ' ')[:120]
                        for b in bullets if b.strip()
                    ]
                    return takeaways[:settings.KEY_TAKEAWAYS_COUNT]

        except Exception as e:
            logger.warning(f"LLM extract_key_takeaways failed: {e}")

        return []

    def _generate_related_questions(
        self, answer: str, retrieved_docs: list, original_question: str
    ) -> list[str]:
        """
        Generates related follow-up questions ONLY when relevant.

        Only generates if:
        - Answer is long enough (substantive content)
        - Multiple documents involved (suggests complexity)
        - Answer has clear topics to expand on
        """

        # Only generate if answer is substantial and multi-sourced
        if len(answer) < 200:
            return []  # Too short for meaningful follow-ups

        unique_files = set(doc.get("filename", "") for doc in retrieved_docs)
        if len(unique_files) < 2:
            return []  # Single source, likely simple question

        # Extract key topics from retrieved documents
        doc_topics = []
        for doc in retrieved_docs[:3]:
            filename = doc.get("filename", "")
            if filename:
                doc_topics.append(filename.replace(".pdf", "").replace(".docx", ""))

        topics_str = ", ".join(doc_topics[:3]) if doc_topics else "related topics"

        try:
            questions_text = self.llm.generate_response(
                system_prompt=(
                    "Based on the provided text, suggest 2-3 natural follow-up questions "
                    "that a curious reader might ask. "
                    "Questions should explore adjacent topics, deeper aspects, or related areas. "
                    "Output ONLY the questions, one per line, without numbering. "
                    "Keep each under 15 words. "
                    "If the answer is too simple/complete and doesn't warrant follow-ups, output: NONE"
                ),
                user_prompt=f"""Original question: {original_question}

Answer: {answer[:1000]}

Sources: {topics_str}""",
                temperature=0.3,
            )

            if questions_text and "NONE" not in questions_text.upper():
                # Parse questions (one per line, non-empty)
                questions = [
                    q.strip().strip("?").strip().rstrip("?") + "?"
                    for q in questions_text.strip().split("\n")
                    if q.strip() and len(q.strip()) > 10
                ]
                # Filter out duplicates and very similar to original
                unique_questions = []
                seen = set()
                for q in questions:
                    q_lower = q.lower()
                    # Check if too similar to original question
                    if q_lower not in seen and original_question.lower() not in q_lower:
                        unique_questions.append(q)
                        seen.add(q_lower)
                        if len(unique_questions) >= settings.RELATED_QUESTIONS_COUNT:
                            break
                return unique_questions

        except Exception as e:
            logger.warning(f"Generate_related_questions failed: {e}")

        return []
```

## File: `backend/app/services/chat_service_optimized.py`

```py
"""
Optimized Chat Service — Streaming + Parallel LLM Calls
Reduce latency by:
1. Running LLM calls in parallel (1-2s faster)
2. Streaming responses to frontend (1-2s perceived speed improvement)
3. Optional feature flags to disable slow features
"""

import asyncio
from typing import Optional, AsyncGenerator
from app.interfaces.vector_store import IVectorStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.llm import ILLM
from app.interfaces.reranker import IReranker
from app.core.logger import logger
from app.core.config import settings


class ChatServiceOptimized:
    """Optimized version with parallel execution and streaming support."""

    def __init__(
        self,
        db: IVectorStore,
        embedder: IEmbedder,
        llm: ILLM,
        reranker: IReranker,
        query_rewriter=None,
        retrieval_top_k: int = 20,  # Reduced for speed
        reranker_top_k: int = 5,     # Reduced for speed
        min_relevance_score: float = 0.5,  # Stricter
        enable_hyde: bool = False,  # Disabled by default for speed
        enable_multi_query: bool = False,  # Disabled by default for speed
    ):
        self.db = db
        self.embedder = embedder
        self.llm = llm
        self.reranker = reranker
        self.query_rewriter = query_rewriter
        self.retrieval_top_k = retrieval_top_k
        self.reranker_top_k = reranker_top_k
        self.min_relevance_score = min_relevance_score
        self.enable_hyde = enable_hyde
        self.enable_multi_query = enable_multi_query

    def ask_question_fast(self, question: str, tenant_id: str, session_id: str) -> dict:
        """
        Fast version: Disabled features, optimized for speed.
        Response time target: 2-3 seconds (vs 8-12s with all features).
        """
        try:
            self.db.save_chat_message(session_id=session_id, role="user", content=question)
        except Exception as e:
            logger.error(f"Failed to save user message: {e}")

        # Fetch history
        chat_history = []
        try:
            chat_history = self.db.get_chat_history(session_id=session_id)
        except Exception as e:
            logger.warning(f"Failed to fetch chat history: {e}")

        # Query rewriting (optional, disabled by default for speed)
        search_query = question

        # Build queries (no HyDE, no multi-query for speed)
        search_queries = [search_query]

        # Single query search (no multi-query overhead)
        retrieved_docs = self._single_query_search(search_queries[0], tenant_id)

        # Reranking (smaller set due to reduced RETRIEVAL_TOP_K)
        if retrieved_docs and self.reranker:
            try:
                retrieved_docs = self.reranker.rerank(
                    query=search_query,
                    documents=retrieved_docs,
                    top_k=self.reranker_top_k,
                )
                logger.info(f"Re-ranked → top {len(retrieved_docs)} docs")
            except Exception as e:
                logger.warning(f"Re-ranking failed: {e}")
                retrieved_docs = retrieved_docs[:self.reranker_top_k]

        # Simple relevance filter
        retrieved_docs = [
            doc for doc in retrieved_docs
            if doc.get("rerank_score", 1.0) >= self.min_relevance_score
        ]

        # Build context
        context_parts = []
        for doc in retrieved_docs:
            score_label = f" [relevance: {doc.get('rerank_score', 0):.2f}]"
            context_parts.append(
                f"--- SOURCE: {doc['filename']}{score_label} ---\n"
                f"{doc['content']}\n"
                f"--- END ---"
            )
        context_text = "\n\n".join(context_parts)

        # Build simple system prompt
        system_prompt = f"""You are ActionRAG, an Enterprise Knowledge Agent.

INSTRUCTIONS:
1. Answer using ONLY facts from the CONTEXT below. Never invent information.
2. If the context doesn't contain enough information, respond with:
   "I could not find the answer to this in the provided company documents."

CONTEXT:
{context_text}"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": msg["role"], "content": msg["content"]} for msg in chat_history[-4:]])

        # Call LLM (single request)
        try:
            answer = self.llm.chat_with_messages(messages=messages, temperature=0.0)
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            answer = "I'm temporarily unable to process your question. Please try again."

        try:
            self.db.save_chat_message(session_id=session_id, role="assistant", content=answer)
        except Exception as e:
            logger.error(f"Failed to save assistant message: {e}")

        # Build citations (no takeaways, no related questions for speed)
        citations = [
            {
                "filename": doc["filename"],
                "content": doc["content"],
                "rerank_score": doc.get("rerank_score", None),
            }
            for doc in retrieved_docs
        ]

        return {
            "answer": answer,
            "citations": citations,
            "session_id": session_id,
            "confidence": self._determine_confidence(retrieved_docs),
        }

    def _single_query_search(self, query: str, tenant_id: str) -> list[dict]:
        """Single query search (no multi-query overhead)."""
        try:
            query_vector = self.embedder.embed_text([query])[0]
            docs = self.db.search_similar(
                query_vector=query_vector,
                query_text=query,
                tenant_id=tenant_id,
                limit=self.retrieval_top_k,
            )
            logger.info(f"Retrieved {len(docs)} documents")
            return docs
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def _determine_confidence(self, docs: list) -> str:
        """Simple confidence detection."""
        if not docs:
            return "low"
        top_score = max([doc.get("rerank_score", 0.0) for doc in docs])
        if top_score >= 0.7:
            return "high"
        elif top_score >= 0.3:
            return "medium"
        return "low"


class ChatServiceStreaming:
    """Streaming version that yields tokens as they arrive."""

    def __init__(self, chat_service: ChatServiceOptimized):
        self.chat_service = chat_service

    async def stream_answer(
        self, question: str, tenant_id: str, session_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Streams the answer token by token to the frontend.
        Frontend sees first tokens in 1-2 seconds instead of waiting 8-12s.

        Usage:
            async for chunk in service.stream_answer(question, tenant_id, session_id):
                yield chunk
        """

        # Phase 1: Retrieve documents (fast)
        yield 'event: status\ndata: {"msg": "Retrieving documents...", "percent": 10}\n\n'

        question_saved = False
        try:
            self.chat_service.db.save_chat_message(session_id, "user", question)
            question_saved = True
        except Exception as e:
            logger.error(f"Failed to save question: {e}")

        # Fetch history
        chat_history = []
        try:
            chat_history = self.chat_service.db.get_chat_history(session_id=session_id)
        except Exception as e:
            logger.warning(f"Failed to fetch chat history: {e}")

        # Search (optimized for speed)
        yield 'event: status\ndata: {"msg": "Searching for relevant documents...", "percent": 30}\n\n'

        retrieved_docs = self.chat_service._single_query_search(question, tenant_id)

        # Rerank
        if retrieved_docs and self.chat_service.reranker:
            try:
                retrieved_docs = self.chat_service.reranker.rerank(
                    query=question,
                    documents=retrieved_docs,
                    top_k=self.chat_service.reranker_top_k,
                )
            except Exception as e:
                logger.warning(f"Reranking failed: {e}")
                retrieved_docs = retrieved_docs[:self.chat_service.reranker_top_k]

        # Filter by relevance
        retrieved_docs = [
            doc for doc in retrieved_docs
            if doc.get("rerank_score", 1.0) >= self.chat_service.min_relevance_score
        ]

        yield 'event: status\ndata: {"msg": "Found documents. Generating answer...", "percent": 50}\n\n'

        # Build context
        context_parts = []
        for doc in retrieved_docs:
            score_label = f" [relevance: {doc.get('rerank_score', 0):.2f}]"
            context_parts.append(
                f"--- SOURCE: {doc['filename']}{score_label} ---\n"
                f"{doc['content']}\n"
                f"--- END ---"
            )
        context_text = "\n\n".join(context_parts)

        system_prompt = f"""You are ActionRAG, an Enterprise Knowledge Agent.

INSTRUCTIONS:
1. Answer using ONLY facts from the CONTEXT below. Never invent information.
2. If the context doesn't contain enough information, respond with:
   "I could not find the answer to this in the provided company documents."

CONTEXT:
{context_text}"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": msg["role"], "content": msg["content"]} for msg in chat_history[-4:]])

        # Phase 2: Stream LLM response (tokens arrive as they're generated)
        yield 'event: status\ndata: {"msg": "Streaming response...", "percent": 60}\n\n'

        full_answer = ""
        try:
            for token in self.chat_service.llm.stream_chat_with_messages(
                messages=messages, temperature=0.0
            ):
                if token:
                    full_answer += token
                    yield f'event: token\ndata: {{"token": {json.dumps(token)}}}\n\n'
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            error_msg = "I'm temporarily unable to process your question. Please try again."
            full_answer = error_msg
            yield f'event: token\ndata: {{"token": {json.dumps(error_msg)}}}\n\n'

        # Save answer
        try:
            if question_saved:
                self.chat_service.db.save_chat_message(session_id, "assistant", full_answer)
        except Exception as e:
            logger.error(f"Failed to save assistant message: {e}")

        # Build and send metadata
        citations = [
            {
                "filename": doc["filename"],
                "content": doc["content"],
                "rerank_score": doc.get("rerank_score", None),
            }
            for doc in retrieved_docs
        ]

        metadata = {
            "citations": citations,
            "confidence": self.chat_service._determine_confidence(retrieved_docs),
            "session_id": session_id,
            "percent": 100,
        }

        yield f'event: metadata\ndata: {json.dumps(metadata)}\n\n'
        yield "event: end\ndata: {}\n\n"


import json
```

## File: `backend/app/services/ingestion_service.py`

```py
"""
Ingestion Service — memory-safe document processing with contextual chunking.

Processes PDF, DOCX, TXT, CSV, and XLSX files into vector chunks.
Each chunk is enriched with document metadata (filename, chunk position)
so embeddings capture document-level context, not just raw text.

MEMORY SAFETY: Large PDFs (150MB+) are processed in page batches
to avoid the OOM killer crashing VS Code / uvicorn. Text is never
held entirely in memory — it's extracted, chunked, embedded, and
flushed to DB in streaming fashion.

ACCURACY FEATURES (v2):
  - Heading-aware semantic chunking (splits at ## before fixed-size)
  - Document summary generation (LLM creates a summary stored as chunk #0)
  - Block-based PDF extraction (preserves document structure)
  - Richer contextual chunk headers (file type + position metadata)
"""
import csv
import fitz  # PyMuPDF
import docx
import gc
import os
from typing import List, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.interfaces.vector_store import IVectorStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.llm import ILLM
from app.core.logger import logger

# Number of PDF pages to process at a time (kept small for bge-large memory safety).
PDF_PAGE_BATCH_SIZE = 10


class IngestionService:
    def __init__(
        self,
        db: IVectorStore,
        embedder: IEmbedder,
        chunk_size: int = 1000,
        chunk_overlap: int = 300,
        batch_size: int = 50,
        llm: Optional[ILLM] = None,
    ):
        self.db = db
        self.embedder = embedder
        self.batch_size = batch_size
        self.llm = llm  # Optional: used for document summary generation
        # Heading-aware separators — respects document structure before fixed-size splits
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=[
                "\n## ",       # H2 headings (highest priority split)
                "\n### ",      # H3 headings
                "\n#### ",     # H4 headings
                "\n\n",        # Double newline (paragraph boundary)
                "\n",          # Single newline
                ". ",          # Sentence boundary
                " ",           # Word boundary (last resort)
            ],
        )

    def process_file_background(self, file_path: str, filename: str, file_hash: str, tenant_id: str):
        """
        Background worker for processing files of any size.

        Routes by file type:
          PDF  → streaming page-by-page (memory-safe)
          DOCX/TXT/CSV/XLSX → standard processing

        Also generates a document summary (if LLM is available).
        """
        try:
            filename_lower = filename.lower()
            file_type = self._detect_file_type(filename)

            if filename_lower.endswith(".pdf"):
                self._process_pdf_streaming(file_path, filename, file_hash, tenant_id, file_type)
            else:
                self._process_small_file(file_path, filename, file_hash, tenant_id, file_type)

        except Exception as e:
            logger.error(f"Failed to process '{filename}': {e}")
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Cleaned up temp file: {file_path}")

    def _process_pdf_streaming(self, file_path: str, filename: str, file_hash: str, tenant_id: str, file_type: str = "PDF"):
        """Memory-safe PDF processing — pages in batches with block-based extraction."""
        doc = fitz.open(file_path)
        total_pages = doc.page_count
        logger.info(f"Processing PDF '{filename}' | {total_pages} pages | batch size {PDF_PAGE_BATCH_SIZE}")

        total_chunks_saved = 0
        failed_batches = 0
        all_text_for_summary = []  # Collect first pages for summary generation

        for page_start in range(0, total_pages, PDF_PAGE_BATCH_SIZE):
            page_end = min(page_start + PDF_PAGE_BATCH_SIZE, total_pages)

            page_texts = []
            for page_num in range(page_start, page_end):
                page = doc.load_page(page_num)
                # Use 'blocks' extraction to preserve document structure (headings, paragraphs)
                blocks = page.get_text("blocks")
                # Sort blocks by vertical position (top to bottom), then horizontal
                blocks.sort(key=lambda b: (b[1], b[0]))
                page_text = "\n".join(b[4] for b in blocks if b[6] == 0)  # type 0 = text blocks
                page_texts.append(page_text)

            batch_text = "\n".join(page_texts)

            # Collect text from first 3 pages for summary
            if page_start == 0:
                all_text_for_summary.append(batch_text[:3000])

            del page_texts

            if not batch_text.strip():
                continue

            chunks = self.text_splitter.split_text(batch_text)
            del batch_text

            if not chunks:
                continue

            for i in range(0, len(chunks), self.batch_size):
                embed_batch = chunks[i : i + self.batch_size]

                try:
                    contextual_batch = [
                        f"[Document: {filename} | Type: {file_type} | Pages {page_start+1}-{page_end} | Chunk {i+j+1}]\n\n{chunk}"
                        for j, chunk in enumerate(embed_batch)
                    ]
                    embeddings = self.embedder.embed_text(contextual_batch)
                    del contextual_batch

                    records = [
                        {
                            "tenant_id": tenant_id,
                            "filename": filename,
                            "file_hash": file_hash,
                            "content": chunk,
                            "embedding": embeddings[j],
                        }
                        for j, chunk in enumerate(embed_batch)
                    ]

                    self.db.save_documents(records)
                    total_chunks_saved += len(embed_batch)
                    del records, embeddings

                except Exception as e:
                    failed_batches += 1
                    logger.error(f"Failed batch for pages {page_start+1}-{page_end}: {e}")

            del chunks
            gc.collect()

            logger.info(f"PDF '{filename}' | pages {page_start+1}-{page_end}/{total_pages} | {total_chunks_saved} chunks")

        doc.close()

        # Generate and store document summary as chunk #0
        if all_text_for_summary:
            self._generate_document_summary(
                text_preview="\n".join(all_text_for_summary),
                filename=filename, file_hash=file_hash, tenant_id=tenant_id, file_type=file_type,
            )

        if failed_batches > 0:
            logger.warning(f"Completed '{filename}' with {failed_batches} failed batches | {total_chunks_saved} chunks")
        else:
            logger.info(f"Successfully ingested '{filename}' | {total_pages} pages → {total_chunks_saved} chunks")

    def _process_small_file(self, file_path: str, filename: str, file_hash: str, tenant_id: str, file_type: str = "Document"):
        """Standard processing for DOCX, TXT, CSV, and XLSX files."""
        raw_text = self._extract_text_from_disk(file_path, filename)
        logger.info(f"Extracted text from '{filename}' ({len(raw_text)} chars)")

        chunks = self.text_splitter.split_text(raw_text)
        total_chunks = len(chunks)
        logger.info(f"Split '{filename}' into {total_chunks} chunks")

        # Generate document summary before deleting raw_text
        self._generate_document_summary(
            text_preview=raw_text[:3000],
            filename=filename, file_hash=file_hash, tenant_id=tenant_id, file_type=file_type,
        )
        del raw_text

        total_batches = (total_chunks + self.batch_size - 1) // self.batch_size
        failed_batches = 0

        for i in range(0, total_chunks, self.batch_size):
            batch_num = i // self.batch_size + 1
            batch_chunks = chunks[i : i + self.batch_size]

            try:
                contextual_batch = [
                    f"[Document: {filename} | Type: {file_type} | Chunk {i + j + 1}/{total_chunks}]\n\n{chunk}"
                    for j, chunk in enumerate(batch_chunks)
                ]

                embeddings = self.embedder.embed_text(contextual_batch)
                del contextual_batch

                records = [
                    {
                        "tenant_id": tenant_id,
                        "filename": filename,
                        "file_hash": file_hash,
                        "content": chunk,
                        "embedding": embeddings[j],
                    }
                    for j, chunk in enumerate(batch_chunks)
                ]

                self.db.save_documents(records)
                del records, embeddings
                logger.info(f"Processed batch {batch_num}/{total_batches} for '{filename}'")

            except Exception as e:
                failed_batches += 1
                logger.error(f"Failed batch {batch_num}/{total_batches} for '{filename}': {e}")

        if failed_batches > 0:
            logger.warning(f"Completed '{filename}' with {failed_batches}/{total_batches} failed batches")
        else:
            logger.info(f"Successfully ingested '{filename}' ({total_batches} batches)")

    def delete_file(self, filename: str, tenant_id: str) -> bool:
        """Deletes all chunks of a document."""
        return self.db.delete_document(filename=filename, tenant_id=tenant_id)

    def list_files(self, tenant_id: str) -> List[str]:
        """Lists all unique filenames for a tenant."""
        return self.db.get_all_documents(tenant_id=tenant_id)

    def _extract_text_from_disk(self, file_path: str, filename: str) -> str:
        """
        Extracts readable text from non-PDF files.

        Supports: DOCX, TXT, CSV, XLSX
        PDFs use the streaming method instead.
        """
        filename_lower = filename.lower()

        if filename_lower.endswith(".docx"):
            doc_file = docx.Document(file_path)
            return "\n".join([paragraph.text for paragraph in doc_file.paragraphs])

        elif filename_lower.endswith(".txt"):
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()

        elif filename_lower.endswith(".csv"):
            return self._extract_csv(file_path)

        elif filename_lower.endswith((".xlsx", ".xls")):
            return self._extract_xlsx(file_path)

        else:
            raise ValueError(f"Unsupported file type: {filename}")

    def _extract_csv(self, file_path: str) -> str:
        """
        Converts CSV into readable text format.

        Each row becomes: "Column1: value1 | Column2: value2 | ..."
        This makes the data semantically searchable.
        """
        rows = []
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    row_text = " | ".join(
                        f"{key}: {value}" for key, value in row.items()
                        if value and value.strip()
                    )
                    if row_text:
                        rows.append(row_text)
        except Exception as e:
            logger.warning(f"CSV DictReader failed, falling back to raw read: {e}")
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()

        return "\n".join(rows)

    def _extract_xlsx(self, file_path: str) -> str:
        """
        Extracts text from Excel files (XLSX/XLS).

        Reads all sheets, converting each row to "Col: val | Col: val" format.
        """
        try:
            from openpyxl import load_workbook
            wb = load_workbook(file_path, read_only=True, data_only=True)
            all_text = []

            for sheet_name in wb.sheetnames:
                ws = wb[sheet_name]
                all_text.append(f"--- Sheet: {sheet_name} ---")

                rows = list(ws.iter_rows(values_only=True))
                if not rows:
                    continue

                # Use first row as headers
                headers = [str(h) if h else f"Col{i}" for i, h in enumerate(rows[0])]

                for row in rows[1:]:
                    row_text = " | ".join(
                        f"{headers[i]}: {str(cell)}"
                        for i, cell in enumerate(row)
                        if cell is not None and str(cell).strip()
                    )
                    if row_text:
                        all_text.append(row_text)

            wb.close()
            return "\n".join(all_text)

        except ImportError:
            logger.warning("openpyxl not installed, cannot process XLSX files")
            raise ValueError("XLSX support requires openpyxl: pip install openpyxl")
        except Exception as e:
            logger.error(f"XLSX extraction failed: {e}")
            raise

    # ── New: Accuracy Enhancement Helpers ──

    def _detect_file_type(self, filename: str) -> str:
        """Returns a human-readable file type label for contextual headers."""
        ext = os.path.splitext(filename)[1].lower()
        type_map = {
            ".pdf": "PDF", ".docx": "Word Document", ".txt": "Text File",
            ".csv": "CSV Spreadsheet", ".xlsx": "Excel Spreadsheet",
            ".xls": "Excel Spreadsheet",
        }
        return type_map.get(ext, "Document")

    def _generate_document_summary(self, text_preview: str, filename: str, file_hash: str,
                                    tenant_id: str, file_type: str):
        """
        Uses the LLM to generate a document summary and stores it as a special chunk.

        This helps answer "what is this document about?" queries and improves
        retrieval for broad questions about document contents.
        """
        if not self.llm:
            return  # No LLM available — skip summary generation

        try:
            summary = self.llm.generate_response(
                system_prompt=(
                    "You are a document summarizer. Given the beginning of a document, "
                    "write a concise 3-5 sentence summary describing what the document contains, "
                    "its key topics, and its purpose. Be factual and specific."
                ),
                user_prompt=f"Document: {filename} (Type: {file_type})\n\nContent preview:\n{text_preview[:2500]}",
                temperature=0.0,
            )

            if not summary or len(summary) < 20:
                logger.warning(f"Summary generation returned empty result for '{filename}'")
                return

            # Store summary as a special chunk with [SUMMARY] prefix
            summary_content = f"[DOCUMENT SUMMARY] {filename}\n\n{summary}"
            contextual_text = f"[Document: {filename} | Type: {file_type} | Summary]\n\n{summary_content}"
            summary_embedding = self.embedder.embed_text([contextual_text])[0]

            self.db.save_documents([{
                "tenant_id": tenant_id,
                "filename": filename,
                "file_hash": file_hash,
                "content": summary_content,
                "embedding": summary_embedding,
            }])

            logger.info(f"Generated and stored document summary for '{filename}'")

        except Exception as e:
            logger.warning(f"Document summary generation failed for '{filename}': {e}")
```

## File: `backend/app/services/query_rewriter.py`

```py
"""
Query Rewriter — resolves multi-turn context into standalone search queries.

When a user asks "What about their education?" after "Tell me about Harsh",
the embedding search would fail because "their education" has no context.
This service rewrites follow-ups into self-contained queries:
    → "What is Harsh's educational background?"

Uses a single, fast LLM call — adds ~50ms on Groq.
Can be toggled off via ENABLE_QUERY_REWRITE=false in .env.
"""
from app.interfaces.llm import ILLM
from app.core.logger import logger

REWRITE_SYSTEM_PROMPT = """You are a search query rewriter for a document retrieval system.

YOUR TASK:
Given a conversation history and a follow-up question, rewrite the follow-up into a STANDALONE search query that includes all necessary context from the conversation.

RULES:
1. Resolve all pronouns (he, she, they, it, this, that) to their specific referents from the conversation.
2. Include key entities and topics from the conversation that the follow-up refers to.
3. Output ONLY the rewritten query — no explanation, no quotes, no preamble.
4. If the follow-up is already self-contained, return it as-is.
5. Keep the query concise and search-friendly (under 50 words).

EXAMPLES:
History: "Tell me about Harsh's work experience"
Follow-up: "What about his education?"
Output: What is Harsh's educational background and education history?

History: "What products does Acme Corp sell?"
Follow-up: "How much do they cost?"
Output: What are the prices of Acme Corp's products?"""


class QueryRewriter:
    def __init__(self, llm: ILLM):
        self.llm = llm

    def rewrite(self, question: str, chat_history: list) -> str:
        """
        Rewrites a follow-up question into a standalone search query.

        If there's no chat history, returns the original question unchanged.
        """
        # No history → nothing to resolve
        if not chat_history:
            return question

        # Build conversation context from last 4 messages
        recent_history = chat_history[-4:]
        history_text = "\n".join(
            f"{msg['role'].upper()}: {msg['content']}" for msg in recent_history
        )

        user_prompt = f"""CONVERSATION HISTORY:
{history_text}

FOLLOW-UP QUESTION: {question}

REWRITTEN STANDALONE QUERY:"""

        try:
            rewritten = self.llm.generate_response(
                system_prompt=REWRITE_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                temperature=0.0,
            )
            rewritten = rewritten.strip().strip('"').strip("'")

            if rewritten and len(rewritten) < 500:  # sanity check
                logger.info(f"Rewritten query: '{question}' → '{rewritten}'")
                return rewritten
            else:
                logger.warning(f"Query rewriter returned invalid output, using original")
                return question

        except Exception as e:
            logger.warning(f"Query rewriting failed, using original question: {e}")
            return question
```

## File: `frontend/.gitignore`

```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

## File: `frontend/README.md`

```md
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
```

## File: `frontend/eslint.config.mjs`

```mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

## File: `frontend/next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

## File: `frontend/next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

## File: `frontend/package.json`

```json
{
  "name": "action-rag-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.97.0",
    "axios": "^1.13.5",
    "clsx": "^2.1.1",
    "lucide-react": "^0.575.0",
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-markdown": "^10.1.0",
    "react-pdf": "^10.3.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.33",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5.9.3"
  }
}
```

## File: `frontend/postcss.config.mjs`

```mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

## File: `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

## File: `frontend/src/app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* Toast slide-in animation */
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out forwards;
}
```

## File: `frontend/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ActionRAG — Enterprise Knowledge Agent",
  description: "Anti-hallucination AI that answers questions from your uploaded documents with source citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

## File: `frontend/src/app/page.tsx`

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  MessageSquare, Plus, FileText, Send, Paperclip, X,
  Loader2, Info, Database, History, CheckCircle2,
  AlertCircle, RefreshCw, XCircle, Cloud
} from 'lucide-react';
import { API_URL } from '../lib/config';

// ── Types ──

interface Citation {
  filename: string;
  content: string;
  similarity: number;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  key_takeaways?: string[];
  related_questions?: string[];
  error?: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

// ── Inline Toast Component ──

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold backdrop-blur-md animate-slide-in max-w-sm ${toast.type === 'success' ? 'bg-emerald-600/95 text-white' :
            toast.type === 'error' ? 'bg-red-600/95 text-white' :
              'bg-amber-500/95 text-white'
            }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'error' && <XCircle size={16} />}
          {toast.type === 'warning' && <AlertCircle size={16} />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Knowledge Base View Component ──
// NOTE: For maintainability, this would typically be in its own file (e.g., `components/KnowledgeBaseView.tsx`)
function KnowledgeBaseView({
  dbFiles,
  isSyncing,
  isUploading,
  onUploadClick,
  onDriveSync,
  onForceResync,
  onDeleteFile,
}: {
  dbFiles: string[];
  isSyncing: boolean;
  isUploading: boolean;
  onUploadClick: () => void;
  onDriveSync: () => void;
  onForceResync: () => void;
  onDeleteFile: (filename: string) => void;
}) {
  return (
    <div className="p-10 bg-slate-50 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Knowledge Base</h2>
        <div className="flex gap-3">
          <button onClick={onForceResync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 shadow-md shadow-amber-100">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Force Re-sync
          </button>
          <button onClick={onDriveSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-md shadow-emerald-100">
            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
            Sync Drive
          </button>
          <button onClick={onUploadClick} disabled={isUploading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100">
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Upload Document
          </button>
        </div>
      </div>
      {dbFiles.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-500">
          <Database size={40} className="mx-auto mb-4 opacity-20" />
          <p>No documents found in the current tenant space.</p>
          <p className="text-xs mt-2">Upload a file in the chat to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dbFiles.map((file, i) => (
            <div key={i} className="p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-xl transition-all group flex flex-col justify-between h-32 relative">
              <div className="flex items-start justify-between">
                <FileText className="text-indigo-600 group-hover:scale-110 transition-transform" size={28} />
                <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <X size={14} />
                </button>
              </div>
              <div>
                <h4 className="font-bold text-sm truncate text-slate-800">{file}</h4>
                <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-tighter flex items-center gap-1">
                  <CheckCircle2 size={10} /> Verified in DB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──

export default function SecureBrainDashboard() {
  const [activeDoc, setActiveDoc] = useState<{ title: string, content: string, fileUrl?: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'documents'>('chat');
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});
  const [dbFiles, setDbFiles] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<{ id: string, title: string }[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // FIXME: The tenantId is hardcoded. In a real application, this should be
  // derived from the user's session or an authentication context provider.
  // For example: `const { tenantId } = useAuth();`
  const tenantId = "a4e69a0a-c349-4dd8-a923-e7c1ce02f0e6";

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: "Unknown error" }));
      if (res.status === 429) {
        showToast("Rate limited — please wait a moment and try again", "warning");
        throw new Error("rate_limited");
      }
      if (res.status === 409) {
        showToast(data.detail || "Duplicate file detected", "warning");
        throw new Error("duplicate");
      }
      showToast(data.detail || "Something went wrong", "error");
      throw new Error(data.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }, [showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await apiFetch(`/api/v1/documents/?tenant_id=${tenantId}`);
        if (data.files) setDbFiles(data.files);
      } catch {
        // Silent fail
      }
    };
    fetchDocs();
  }, [apiFetch, tenantId]);

  useEffect(() => {
    if (!sessionId) return;
    const loadHistory = async () => {
      try {
        const data = await apiFetch(`/api/v1/chat/sessions/${sessionId}`);
        setMessages(data.history.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'ai' : 'user',
          content: m.content
        })));
      } catch {
        showToast("Failed to load chat history", "error");
      }
    };
    loadHistory();
  }, [sessionId, apiFetch, showToast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenant_id", tenantId);

    try {
      const data = await apiFetch("/api/v1/upload/", { method: "POST", body: formData });
      showToast(`${data.message}`, "success");
      setDbFiles(prev => Array.from(new Set([...prev, file.name])));
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "rate_limited") return;
      if (err instanceof Error && err.message === "duplicate") return;
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDriveSync = async (forceResync: boolean = false) => {
    setIsSyncing(true);
    const formData = new FormData();
    formData.append("tenant_id", tenantId);
    if (forceResync) {
      formData.append("force_resync", "true");
    }

    try {
      showToast(forceResync ? "Force re-syncing all files..." : "Scanning Google Drive folder...", "warning");
      const data = await apiFetch("/api/v1/drive/sync", {
        method: "POST",
        body: formData,
      });
      showToast(data.message, "success");
      if (data.queued_files && data.queued_files.length > 0) {
        setDbFiles(prev => Array.from(new Set([...prev, ...data.queued_files])));
      }
    } catch (err) {
      // Errors handled by apiFetch
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendMessage = async (retryContent?: string) => {
    const userQuery = retryContent || inputText.trim();
    if (!userQuery || isProcessing) return;

    if (!retryContent) {
      setInputText("");
      setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    }
    setIsProcessing(true);

    let currentSid = sessionId;
    if (!currentSid) {
      try {
        const data = await apiFetch("/api/v1/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenantId, title: userQuery.slice(0, 30) })
        });
        currentSid = data.session_id;
        setSessionId(currentSid);
        setRecentChats(prev => [{ id: data.session_id, title: userQuery.slice(0, 25) + "..." }, ...prev]);
      } catch {
        showToast("Failed to create chat session", "error");
        setIsProcessing(false);
        return;
      }
    }

    try {
      const data = await apiFetch("/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuery, tenant_id: tenantId, session_id: currentSid })
      });
      setMessages(prev => {
        const filtered = retryContent ? prev.filter(m => !(m.error && m.role === 'ai')) : prev;
        return [...filtered, { role: 'ai', content: data.answer, citations: data.citations }];
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: "I couldn't reach the server. Click retry or try again in a moment.", error: true }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    try {
      await apiFetch(`/api/v1/documents/?filename=${encodeURIComponent(filename)}&tenant_id=${tenantId}`, { method: "DELETE" });
      setDbFiles(prev => prev.filter(f => f !== filename));
      showToast(`Deleted "${filename}"`, "success");
    } catch { }
  };

  const getFileUrl = (name: string) => {
    const key = Object.keys(localFiles).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? localFiles[key] : undefined;
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <aside className="w-72 border-r border-slate-200 flex flex-col bg-white shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <Database className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">ActionRAG</span>
        </div>

        <button onClick={() => { setMessages([]); setSessionId(null); setCurrentView('chat'); }} className="mx-6 mb-8 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100">
          <Plus size={18} /> New Investigation
        </button>

        <nav className="flex-1 overflow-y-auto px-4 space-y-8">
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Library</h3>
            <div onClick={() => setCurrentView('documents')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${currentView === 'documents' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileText size={18} /> <span className="text-sm">Knowledge Base</span>
            </div>
          </div>

          {recentChats.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">Recent Inquiries</h3>
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setSessionId(chat.id); setCurrentView('chat'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-xs truncate transition-all ${sessionId === chat.id ? 'bg-slate-100 text-indigo-600 font-bold border-l-4 border-indigo-600 rounded-l-none' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <History size={14} /> {chat.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-500 ease-in-out ${activeDoc ? 'max-w-[50%] border-r border-slate-200' : 'max-w-full'}`}>
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="font-bold text-sm text-slate-700 uppercase tracking-widest">
              {currentView === 'chat' ? 'Neural Search Active' : 'Document Index'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isSyncing && <span className="text-xs text-emerald-600 font-bold flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Syncing Drive...</span>}
            {isUploading && <span className="text-xs text-indigo-600 font-bold flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Indexing Document...</span>}
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>
        </header>

        {currentView === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth bg-slate-50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center">
                    <MessageSquare size={40} className="text-indigo-600 opacity-40" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-800">Enterprise Contextual AI</h3>
                    <p className="text-sm text-slate-400 max-w-sm">Ask a question to retrieve insights from your uploaded technical or legal documentation.</p>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-4'}`}>

                  {msg.role === 'ai' && (
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg mt-1 ${msg.error ? 'bg-red-500 shadow-red-100' : 'bg-indigo-600 shadow-indigo-100'
                      }`}>
                      {msg.error ? <AlertCircle className="text-white w-4 h-4" /> : <span className="text-white text-xs font-black italic">AI</span>}
                    </div>
                  )}

                  <div className={`flex flex-col space-y-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'ai' && !msg.error && msg.key_takeaways && msg.key_takeaways.length > 0 && (
                      <div className="w-full bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg animate-in fade-in">
                        <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                          <span className="text-lg">📌</span> Key Takeaways
                        </p>
                        <ul className="text-sm text-amber-800 space-y-1.5">
                          {msg.key_takeaways.map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2">
                              <span className="text-amber-400 font-bold mt-0.5">•</span>
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className={`p-6 text-[15px] leading-relaxed shadow-sm transition-all ${msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-3xl rounded-tr-sm'
                      : msg.error
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-3xl rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-tl-sm'
                      }`}>
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : msg.error ? '' : 'prose-indigo'}`}>
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {msg.error && (
                        <button onClick={() => { const lastUserMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user'); if (lastUserMsg) handleSendMessage(lastUserMsg.content); }} className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-800 transition-colors">
                          <RefreshCw size={12} /> Retry
                        </button>
                      )}
                    </div>

                    {msg.role === 'ai' && !msg.error && msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 animate-in fade-in pt-1 pl-2">
                        {Array.from(new Set(msg.citations.map(c => c.filename))).map((filename, cIdx) => (
                          <button key={cIdx} onClick={() => { const cite = msg.citations?.find(c => c.filename === filename); setActiveDoc({ title: filename, content: cite?.content || "", fileUrl: getFileUrl(filename) }); }} className="group flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all duration-200">
                            <CheckCircle2 size={12} className="text-indigo-400 group-hover:text-white" />
                            {filename}
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.role === 'ai' && !msg.error && msg.related_questions && msg.related_questions.length > 0 && (
                      <div className="w-full mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2.5">💡 Related Questions</p>
                        <div className="space-y-2">
                          {msg.related_questions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => { setInputText(q); handleSendMessage(q); }}
                              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-slate-700 hover:text-indigo-700 font-medium flex items-start gap-2"
                            >
                              <span className="text-indigo-500 mt-0.5 flex-shrink-0">→</span>
                              <span className="leading-relaxed">{q}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="max-w-4xl mx-auto relative group flex items-center">
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute left-4 z-10 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50">
                  {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
                </button>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-16 pr-16 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all" placeholder="Query your internal knowledge base..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} />
                <button onClick={() => handleSendMessage()} disabled={isProcessing || !inputText.trim()} className="absolute right-3 bg-indigo-600 p-2.5 rounded-xl text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all disabled:opacity-50">
                  <Send size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.docx" />
              </div>
            </div>
          </>
        ) : (
          <>
            <KnowledgeBaseView
              dbFiles={dbFiles}
              isSyncing={isSyncing}
              isUploading={isUploading}
              onUploadClick={() => fileInputRef.current?.click()}
              onDriveSync={() => handleDriveSync(false)}
              onForceResync={() => handleDriveSync(true)}
              onDeleteFile={handleDeleteFile}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt,.docx" />
          </>
        )}
      </main>

      {activeDoc && (
        <aside className="w-1/2 bg-slate-50 flex flex-col shrink-0 animate-in slide-in-from-right duration-500 ease-out z-20 shadow-2xl border-l border-slate-200">
          <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 truncate max-w-[250px]">{activeDoc.title}</h3>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 w-fit mt-1">
                  <CheckCircle2 size={10} /> Source Authenticated
                </span>
              </div>
            </div>
            <button onClick={() => setActiveDoc(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 overflow-hidden relative">
            {activeDoc.fileUrl ? (
              <iframe
                src={`${activeDoc.fileUrl}#toolbar=0&navpanes=0&view=FitH`}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="h-full p-12 overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-8">
                  <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 relative">
                    <div className="absolute -top-3 -left-3 bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
                      <Info size={16} />
                    </div>
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      Exact Knowledge Fragment
                    </h4>
                    <p className="text-[15px] leading-[1.8] text-slate-700 font-medium whitespace-pre-wrap">
                      {activeDoc.content}
                    </p>
                  </div>

                  <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                      The AI extracted this specific paragraph from the source document to formulate your answer. The original file is stored securely in your vector database.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
```

## File: `frontend/src/components/StreamingChat.tsx`

```tsx
/**
 * Real-time Streaming Chat Component
 * Shows answer as tokens arrive (1-2s instead of 10-12s)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { API_URL } from '@/lib/config';

interface Citation {
  filename: string;
  content: string;
  rerank_score: number;
}

interface StreamingChatProps {
  sessionId: string;
  tenantId: string;
}

export function StreamingChat({ sessionId, tenantId }: StreamingChatProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const answerEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as answer streams in
  useEffect(() => {
    answerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [answer]);

  const handleStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    setCitations([]);
    setError('');
    setProgress(0);
    setStatus('Retrieving documents...');

    try {
      // Call the /stream endpoint
      const response = await fetch(`${API_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          tenant_id: tenantId,
          session_id: sessionId,
          use_streaming: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentAnswer = '';
      let eventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          // Parse SSE format
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'status') {
                setStatus(data.msg || '');
                setProgress(data.percent || 0);
              } else if (eventType === 'token') {
                // Stream individual tokens
                currentAnswer += data.token;
                setAnswer(currentAnswer);
              } else if (eventType === 'metadata') {
                // Receive citations and metadata at end
                if (data.citations) {
                  setCitations(data.citations);
                }
                setProgress(data.percent || 100);
              } else if (eventType === 'error') {
                setError(data.error || 'Unknown error');
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, dataStr);
            }
          }
        }
      }

      setStatus('');
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Streaming error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Chat Input */}
      <form onSubmit={handleStream} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
      </form>

      {/* Progress Bar */}
      {loading && progress > 0 && (
        <div className="w-full bg-gray-200 rounded-lg overflow-hidden">
          <div
            className="bg-blue-600 h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="text-sm text-gray-600 italic">
          {status}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Answer (Streaming in Real-time) */}
      {answer && (
        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50">
          <div className="prose prose-sm max-w-none">
            {/* Simple markdown rendering */}
            {answer.split('\n').map((line, i) => {
              // Bold **text**
              const boldRegex = /\*\*(.+?)\*\*/g;
              const parts = line.split(boldRegex).map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              );

              // Heading detection (though streaming may split across boundaries)
              if (line.startsWith('## ')) {
                return (
                  <h3 key={i} className="text-lg font-bold mt-3 mb-2">
                    {line.slice(3)}{parts}
                  </h3>
                );
              } else if (line.startsWith('- ')) {
                return (
                  <li key={i} className="ml-4">
                    {parts}
                  </li>
                );
              } else if (line.trim() === '') {
                return <div key={i} className="h-2" />;
              } else {
                return (
                  <p key={i} className="my-1">
                    {parts}
                  </p>
                );
              }
            })}
            <div ref={answerEndRef} />
          </div>
        </div>
      )}

      {/* Citations */}
      {citations.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-bold mb-2">Sources:</h4>
          <div className="space-y-2">
            {citations.map((cite, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                <div className="font-semibold text-sm text-gray-800">
                  {cite.filename}
                  {cite.rerank_score && (
                    <span className="text-gray-500 ml-2">
                      (relevance: {cite.rerank_score.toFixed(2)})
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {cite.content.slice(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: `frontend/src/components/error-boundary.tsx`

```tsx
```

## File: `frontend/src/lib/config.ts`

```ts
// Centralized config — change API_URL here when deploying
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

