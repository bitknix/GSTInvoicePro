from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.api_v1.api import api_router
from app.core.config import settings

# Custom middleware for security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Set secure headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="GST Invoice Generator for Indian Businesses",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set all CORS middleware
if settings.FRONTEND_ORIGIN:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add security headers
app.add_middleware(SecurityHeadersMiddleware)

# Restrict trusted hosts in production
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["localhost", "127.0.0.1", settings.FRONTEND_ORIGIN.replace("http://", "").replace("https://", "")] 
    )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get("/")
def root():
    return {"message": "Welcome to GSTInvoicePro API. Check /docs for API documentation."}