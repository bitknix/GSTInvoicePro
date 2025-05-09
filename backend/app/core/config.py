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
    FRONTEND_ORIGIN: str
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
    
    # Debug mode
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings() 