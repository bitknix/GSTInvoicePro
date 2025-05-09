import logging
from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """
    Initialize the database with tables and sample data
    """
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create superuser if it doesn't exist
    user = crud.user.get_by_email(db, email="admin@example.com")
    if not user:
        user_in = schemas.UserCreate(
            email="admin@example.com",
            password="adminpassword",
            is_superuser=True,
        )
        user = crud.user.create(db, obj_in=user_in)
        logger.info("Created superuser admin@example.com")


def init_demo_data(db: Session) -> None:
    """
    Initialize with demo data for testing
    """
    # Create demo user
    user = crud.user.get_by_email(db, email="demo@example.com")
    if not user:
        user_in = schemas.UserCreate(
            email="demo@example.com",
            password="demopassword",
            gstin="29AAAAA0000A1Z5",
        )
        user = crud.user.create(db, obj_in=user_in)
        logger.info("Created demo user demo@example.com")
        
        # Create business profile
        from app.models.business_profile import BusinessProfile
        business_profile = BusinessProfile(
            user_id=user.id,
            name="Demo Business",
            gstin="29AAAAA0000A1Z5",
            state="Karnataka",
            state_code="29",
            city="Bangalore",
            pin="560001",
            address="123 Demo Street, Bangalore",
            email="business@example.com",
            phone="9876543210",
            current_invoice_number=1
        )
        db.add(business_profile)
        db.commit()
        logger.info(f"Created business profile for {user.email}")
        
        # Create customers
        from app.models.customer import Customer
        customers = [
            Customer(
                user_id=user.id,
                name="ABC Enterprises",
                gstin="27BBBBB0000B1Z2",
                address="456 Sample Road, Mumbai",
                city="Mumbai",
                state="Maharashtra",
                country="India",
                pincode="400001",
                email="abc@example.com",
                phone="8765432109"
            ),
            Customer(
                user_id=user.id,
                name="XYZ Corp",
                gstin="29CCCCC0000C1Z9",
                address="789 Test Avenue, Bangalore",
                city="Bangalore",
                state="Karnataka",
                country="India",
                pincode="560001",
                email="xyz@example.com",
                phone="7654321098"
            )
        ]
        db.add_all(customers)
        db.commit()
        logger.info(f"Created sample customers for {user.email}")
        
        # Create products
        from app.models.product import Product
        products = [
            Product(
                user_id=user.id,
                name="Web Development",
                hsn_sac="998314",
                tax_rate=18.0,
                unit="Hour",
                description="Website development services"
            ),
            Product(
                user_id=user.id,
                name="Mobile App Development",
                hsn_sac="998315",
                tax_rate=18.0,
                unit="Day",
                description="Mobile application development services"
            ),
            Product(
                user_id=user.id,
                name="Digital Marketing",
                hsn_sac="998361",
                tax_rate=18.0,
                unit="Service",
                description="Digital marketing services"
            )
        ]
        db.add_all(products)
        db.commit()
        logger.info(f"Created sample products for {user.email}")
        
        # Optionally create sample invoices
        logger.info("Demo data initialization complete.") 