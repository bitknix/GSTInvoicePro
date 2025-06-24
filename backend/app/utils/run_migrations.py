from sqlalchemy import create_engine
from app.db.base import Base
from app.core.config import settings
import logging

def run_migrations():
    try:
        engine = create_engine(str(settings.DATABASE_URL))  # <-- convert to string
        Base.metadata.create_all(bind=engine)
        logging.info("✅ Tables created successfully from SQLAlchemy models.")
    except Exception as e:
        logging.error(f"❌ Failed to create tables: {e}")

if __name__ == "__main__":
    run_migrations()
