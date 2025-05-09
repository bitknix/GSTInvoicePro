from typing import List, Optional

from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[Customer]:
        return (
            db.query(self.model)
            .filter(Customer.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def create_with_user(
        self, db: Session, *, obj_in: CustomerCreate, user_id: int
    ) -> Customer:
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data, user_id=user_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


customer = CRUDCustomer(Customer) 