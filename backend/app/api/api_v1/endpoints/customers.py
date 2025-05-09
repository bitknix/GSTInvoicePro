from typing import Any, List
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.crud import customer as crud

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[schemas.Customer])
def read_customers(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve customers.
    """
    customers = db.query(models.Customer).filter(
        models.Customer.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return customers


@router.post("/", response_model=schemas.Customer)
def create_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_in: schemas.CustomerCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new customer.
    """
    try:
        # Enhanced logging for debugging
        logger.info(f"Creating customer with data: {customer_in}")
        logger.info(f"Country: '{customer_in.country}', GSTIN: '{customer_in.gstin}'")
        
        # Process customer data dictionary
        customer_dict = customer_in.dict()
        
        # Apply additional processing if needed
        is_foreign = customer_dict.get('country', 'India') != 'India'
        if is_foreign and (not customer_dict.get('gstin') or customer_dict.get('gstin') == ''):
            customer_dict['gstin'] = 'URP'
            logger.info("Set GSTIN to URP for foreign customer")
            
        logger.info(f"Final customer dict: {customer_dict}")
        
        # Create and save the customer object
        customer = models.Customer(
            **customer_dict, user_id=current_user.id
        )
        
        # Add and commit to database
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        logger.info(f"Customer created successfully: {customer.id}")
        return customer
    except ValueError as ve:
        # Handle validation errors
        logger.error(f"Validation error creating customer: {str(ve)}")
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ve)}")
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        db.rollback()
        
        # Provide more detailed error information
        error_detail = str(e)
        if hasattr(e, "__dict__"):
            logger.error(f"Exception details: {e.__dict__}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create customer: {error_detail}"
        )


@router.get("/{customer_id}", response_model=schemas.Customer)
def read_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get customer by ID.
    """
    customer = db.query(models.Customer).filter(
        models.Customer.id == customer_id,
        models.Customer.user_id == current_user.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{id}", response_model=schemas.Customer)
def update_customer(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    customer_in: schemas.CustomerUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a customer.
    """
    try:
        logger.info(f"Updating customer ID {id}")
        customer = db.query(models.Customer).filter(
            models.Customer.id == id,
            models.Customer.user_id == current_user.id
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
            
        if customer.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
            
        for field, value in customer_in.dict(exclude_unset=True).items():
            setattr(customer, field, value)
        
        db.add(customer)
        db.commit()
        db.refresh(customer)
        logger.info(f"Customer {id} updated successfully")
        return customer
    except ValueError as ve:
        # Handle validation errors
        logger.error(f"Validation error updating customer: {str(ve)}")
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Validation error: {str(ve)}")
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        db.rollback()
        
        # Provide more detailed error information
        error_detail = str(e)
        if hasattr(e, "__dict__"):
            logger.error(f"Exception details: {e.__dict__}")
            
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update customer: {error_detail}"
        )


@router.delete("/{id}", response_model=schemas.Customer)
def delete_customer(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a customer.
    """
    try:
        logger.info(f"Deleting customer ID {id}")
        
        # First check if customer exists with direct query
        customer = db.query(models.Customer).filter(
            models.Customer.id == id
        ).first()
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
            
        if customer.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Check if customer has any invoices
        invoice_count = db.query(models.Invoice).filter(
            models.Invoice.customer_id == id
        ).count()
        
        if invoice_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete customer: {invoice_count} invoice(s) associated with this customer. Delete the invoices first."
            )
            
        # Manually delete customer instead of using crud to have more control
        db.delete(customer)
        db.commit()
        
        logger.info(f"Customer {id} deleted successfully")
        return customer
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        logger.error(f"Error deleting customer: {str(e)}")
        db.rollback()
        
        # Provide more detailed error information
        error_detail = str(e)
        if hasattr(e, "__dict__"):
            logger.error(f"Exception details: {e.__dict__}")
            
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete customer: {error_detail}"
        ) 