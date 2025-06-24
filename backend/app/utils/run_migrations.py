from sqlalchemy import create_engine
from app.db.base import Base  # Make sure this imports your Base and all models
from app.core.config import settings
import logging

def run_migrations():
    try:
        engine = create_engine(settings.DATABASE_URL)
        Base.metadata.create_all(bind=engine)
        logging.info("✅ Tables created successfully from SQLAlchemy models.")
    except Exception as e:
        logging.error(f"❌ Failed to create tables: {e}")

if __name__ == "__main__":
    run_migrations()
