from typing import Optional, List
from pydantic import AnyHttpUrl, PostgresDsn, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "GSTInvoicePro"
    VERSION: str = "0.1.0"
    
    # JWT Authentication
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS Settings
    FRONTEND_ORIGIN: str = "https://gst-invoice-pro.vercel.app"  # Default production URL
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: List[str]) -> List[AnyHttpUrl]:
        if isinstance(v, str) and not v.startswith("["):
            return [v]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Database
    DATABASE_URL: PostgresDsn
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    @validator("DATABASE_URL", pre=True)
    def validate_database_url(cls, v: Optional[str]) -> str:
        if not v:
            raise ValueError("DATABASE_URL is required")
        # Support Neon's connection pooling
        if "neon.tech" in v:
            return v + "?sslmode=require&pool_size={pool_size}&max_overflow={max_overflow}"
        return v
    
    # Debug mode
    DEBUG: bool = False
    
    # Host and Port (for Render)
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()