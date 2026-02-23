from app.api.drive import router as drive_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limiter import limiter
from app.api.chat import router as chat_router
from app.api.upload import router as upload_router
from app.api.documents import router as documents_router

# 1. Initialize the Enterprise App
app = FastAPI(
    title="ActionRAG SME Backend", 
    description="The Anti-Hallucination Knowledge Agent API",
    version="1.0.0"
)

# 👇 ADD THESE TWO LINES RIGHT HERE 👇
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# 👆 ================================ 👆

# 2. Security: Allow your friend's Next.js frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Plug in the routes we just built
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(drive_router)

# 4. A simple health check route
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online", 
        "message": "ActionRAG Backend is running. Visit /docs for the Swagger API."
    }