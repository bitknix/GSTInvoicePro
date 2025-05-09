from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(str(settings.DATABASE_URL))

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency function to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 