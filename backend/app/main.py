import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.api_v1.api import api_router
from app.core.config import settings

# Load environment-based config
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
frontend_host = frontend_origin.replace("https://", "").replace("http://", "")
backend_host = os.getenv("BACKEND_HOST", "localhost")
debug_mode = os.getenv("DEBUG", "true").lower() == "true"

# Custom middleware for security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="GST Invoice Generator for Indian Businesses",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add secure headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Restrict trusted hosts in production
if not debug_mode:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            frontend_host,
            backend_host
        ]
    )

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root route
@app.get("/")
def root():
    return {"message": "Welcome to GSTInvoicePro API. Check /docs for API documentation."}