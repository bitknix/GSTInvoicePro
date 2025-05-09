from typing import Any, Dict
from datetime import datetime
import platform
import sys
import psutil

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.db.session import engine

router = APIRouter()


@router.get("/")
def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint for monitoring applications.
    Returns basic system information and service status.
    """
    # Check database connection
    db_status = "healthy"
    db_error = None
    try:
        # Test database connection with a simple query
        with engine.connect() as connection:
            connection.execute("SELECT 1")
    except Exception as e:
        db_status = "unhealthy"
        db_error = str(e)
    
    # Get system information
    system_info = {
        "os": platform.system(),
        "python_version": sys.version,
        "cpu_usage": psutil.cpu_percent(),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent
    }
    
    return {
        "status": "ok" if db_status == "healthy" else "error",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "database": {
            "status": db_status,
            "error": db_error
        },
        "system": system_info
    }


@router.get("/readiness")
def readiness_check(db: Session = Depends(deps.get_db)) -> Dict[str, str]:
    """
    Readiness check endpoint for Kubernetes or other orchestrators.
    Verifies that the application is ready to receive traffic.
    """
    return {"status": "ready"} 