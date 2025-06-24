import uvicorn
import os
import logging
from app.core.config import settings

# ✅ Import your Alembic migration runner
from app.utils.run_migrations import run_migrations

if __name__ == "__main__":
    logging.info("Starting GSTInvoicePro API server")

    # ✅ Run Alembic migrations before starting FastAPI
    try:
        run_migrations()
        logging.info("Database migration completed successfully.")
    except Exception as e:
        logging.error(f"Error during DB migration: {e}")

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
