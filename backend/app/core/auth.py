from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from cachetools import TTLCache
from app.core.logger import logger
from app.core.dependencies import _get_db_adapter

security = HTTPBearer()

class UserContext(BaseModel):
    user_id: str
    email: str
    role: Optional[str] = None

# Cache valid tokens briefly to avoid hitting Supabase on every request.
# Kept short so a revoked/logged-out session stops working within a minute.
_token_cache = TTLCache(maxsize=1000, ttl=60)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> UserContext:
    """Verifies the Supabase JWT token and extracts user information securely using the Supabase SDK."""
    token = credentials.credentials
    
    if token in _token_cache:
        return _token_cache[token]
        
    try:
        db = _get_db_adapter()
        # This calls Supabase's auth service, verifying the token securely via Supabase's own API
        # This automatically handles asymmetric keys (ES256, RS256) and symmetric keys (HS256)
        user_resp = db.get_auth_user(token)
        
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        user = user_resp.user
        ctx = UserContext(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        
        _token_cache[token] = ctx
        return ctx
    except Exception as e:
        error_name = type(e).__name__
        if error_name == "AuthApiError" or "invalid" in str(e).lower() or "expired" in str(e).lower():
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
        logger.error(f"Unexpected error validating token: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def verify_box_access(box_id: str, user_id: str) -> dict:
    """
    Checks if a user has access to a box and returns the box object.
    Raises HTTPException if not found or unauthorized.
    """
    db = _get_db_adapter()
    try:
        box = db.get_box_for_user(box_id, user_id)
        if not box:
            raise HTTPException(status_code=404, detail="Box not found or unauthorized")
        return box
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking box access: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
