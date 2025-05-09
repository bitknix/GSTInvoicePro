import logging

from app.db.init_db import init_db, init_demo_data
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init() -> None:
    db = SessionLocal()
    try:
        logger.info("Creating initial database")
        init_db(db)
        
        logger.info("Creating demo data")
        init_demo_data(db)
        
        logger.info("Initial database setup completed")
    finally:
        db.close()


def main() -> None:
    logger.info("Initializing database")
    init()
    logger.info("Database initialized")


if __name__ == "__main__":
    main() 