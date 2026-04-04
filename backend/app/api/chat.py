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