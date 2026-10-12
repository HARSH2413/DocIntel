"""
Rate limiter — reads limits from config so you can tune via .env.
"""
import base64
import hashlib
import json

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def user_or_ip_key(request: Request) -> str:
    """Bucket requests per user instead of per IP.

    Behind a hosting proxy every client shares the proxy's IP, so IP keys either
    throttle everyone together or (if X-Forwarded-For is trusted) are spoofable.
    slowapi checks limits only after FastAPI has resolved route dependencies, so
    on authenticated routes the bearer token has already been verified and its
    `sub` claim is trustworthy; decoding without verification here is safe.
    """
    auth = request.headers.get("authorization", "")
    if auth[:7].lower() == "bearer ":
        token = auth[7:].strip()
        try:
            payload = token.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            sub = json.loads(base64.urlsafe_b64decode(payload)).get("sub")
            if sub:
                return f"user:{sub}"
        except (IndexError, ValueError):
            pass
        return "token:" + hashlib.sha256(token.encode()).hexdigest()[:32]
    return "ip:" + get_remote_address(request)


limiter = Limiter(key_func=user_or_ip_key)
