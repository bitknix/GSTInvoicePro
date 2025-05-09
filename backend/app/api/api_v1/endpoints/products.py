from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve products.
    """
    products = db.query(models.Product).filter(
        models.Product.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return products


@router.post("/", response_model=schemas.Product)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: schemas.ProductCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new product.
    """
    product = models.Product(
        **product_in.dict(), user_id=current_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=schemas.Product)
def read_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get product by ID.
    """
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: schemas.ProductUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update product.
    """
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for field, value in product_in.dict(exclude_unset=True).items():
        setattr(product, field, value)
        
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=schemas.Product)
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete product.
    """
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return product 