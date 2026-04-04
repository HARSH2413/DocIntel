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
