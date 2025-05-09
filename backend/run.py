import uvicorn
import os
import logging
from app.core.config import settings

if __name__ == "__main__":
    logging.info("Starting GSTInvoicePro API server")
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    ) 