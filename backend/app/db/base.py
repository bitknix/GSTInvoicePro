from sqlalchemy.ext.declarative import declarative_base

# Create a SQLAlchemy base model
Base = declarative_base() 

# ✅ Import all models so they get registered with Base
# (This is VERY important for table creation to work!)
from app.models import user, product, invoice, customer, business_profile