"""
DocIntel SME Backend — Enterprise Knowledge Agent API.

Config-driven, resilient, and future-proof.
Swap models and services by editing .env, not code.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback
import logging

class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return "/api/v1/documents/" not in msg and "/api/v1/chat/sessions" not in msg

# Silence uvicorn's built-in access logs for polling endpoints
logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.core.logger import logger
from app.core.dependencies import _get_db_adapter, _get_embedder_adapter, _get_reranker_adapter, get_ingestion_service
from app.core.retrieval_health import retrieval_health
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router
from app.api.documents import router as documents_router
from app.api.boxes import router as boxes_router


def _check_embedding_dimension(embedder) -> None:
    """Fail loudly at boot if the configured model can't search the stored vectors.

    A mismatch (e.g. a 384-dim model against a 768-dim column) makes every dense
    search error, and retrieval would silently answer from keywords alone.
    """
    try:
        model_dim = embedder.dimension
        stored_dim = _get_db_adapter().stored_embedding_dimension()
    except Exception as e:
        logger.warning(f"Embedding dimension check skipped: {e}")
        return
    if stored_dim is None:
        logger.info(f"Embedding dimension: model={model_dim}; no stored chunks yet to compare")
    elif stored_dim != model_dim:
        retrieval_health.config_problem(
            f"EMBEDDING_MODEL_NAME={settings.EMBEDDING_MODEL_NAME} produces {model_dim}-dim vectors but stored "
            f"chunks are {stored_dim}-dim. Vector search will fail until the model matches the database "
            f"(or documents are re-ingested after migrating the column)."
        )
    else:
        logger.info(f"Embedding dimension check passed ({model_dim})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — validates config on boot."""
    logger.info("=" * 50)
    logger.info("DocIntel Backend starting up")
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
    embedder = _get_embedder_adapter()
    logger.info("Embedding model ready.")
    _check_embedding_dimension(embedder)

    logger.info("Pre-loading reranker model...")
    _get_reranker_adapter()
    logger.info("Reranker model ready.")

    # Ingestion runs in-process, so a restart abandons any in-flight documents.
    try:
        get_ingestion_service().fail_stale_documents()
    except Exception as e:
        logger.warning(f"Stale document sweep skipped: {e}")

    yield
    logger.info("DocIntel Backend shutting down")


# Initialize the App
app = FastAPI(
    title="DocIntel SME Backend",
    description="The Anti-Hallucination Knowledge Agent API",
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error on {request.url}: {exc.errors()} - Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled application exception on {request.url}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# Multipart framing adds a little on top of the file itself.
_UPLOAD_BODY_LIMIT = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 1024 * 1024
_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


@app.middleware("http")
async def limit_upload_body(request: Request, call_next):
    """Refuse oversized uploads before Starlette reads the body to disk."""
    if request.method == "POST" and request.url.path.startswith("/api/v1/upload"):
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return JSONResponse(status_code=411, content={"detail": "Content-Length header is required for uploads."})
        if int(length) > _UPLOAD_BODY_LIMIT:
            return JSONResponse(
                status_code=413,
                content={"detail": f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB upload limit."},
            )
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    # API responses carry private document data; never let proxies or browsers cache them.
    response.headers.setdefault("Cache-Control", "no-store")
    if not request.url.path.startswith(_DOCS_PATHS):
        # JSON API: nothing may load, execute, or frame. Swagger UI needs its own CDN assets.
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip logging for high-frequency polling endpoints to keep the terminal readable
    path = request.url.path
    is_polling_endpoint = request.method == "GET" and (
        path.startswith("/api/v1/documents/") or path.startswith("/api/v1/chat/sessions")
    )
    
    if not is_polling_endpoint:
        logger.info(f"Incoming request: {request.method} {request.url}")
        safe_headers = {
            k: v for k, v in request.headers.items() 
            if k.lower() in {"user-agent", "host", "accept", "content-type", "x-forwarded-for"}
        }
        logger.info(f"Headers: {safe_headers}")
        
    try:
        response = await call_next(request)
        if response.status_code >= 400 and not is_polling_endpoint:
            logger.error(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Exception during request: {e}")
        raise


# CORS — reads allowed origins from config
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    # Browsers do not allow credentialed requests with a wildcard origin.
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(boxes_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "version": "1.1.0",
        "model": settings.LLM_MODEL_NAME,
        "retrieval": retrieval_health.status(),
        "message": "DocIntel Backend is running.",
    }
