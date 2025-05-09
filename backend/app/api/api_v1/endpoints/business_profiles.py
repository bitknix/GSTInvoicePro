from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.BusinessProfile])
def read_business_profiles(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve business profiles.
    """
    business_profiles = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return business_profiles


@router.post("/", response_model=schemas.BusinessProfile)
def create_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_profile_in: schemas.BusinessProfileCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new business profile.
    """
    business_profile = models.BusinessProfile(
        **business_profile_in.dict(), user_id=current_user.id
    )
    db.add(business_profile)
    db.commit()
    db.refresh(business_profile)
    return business_profile


@router.get("/{business_profile_id}", response_model=schemas.BusinessProfile)
def read_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_profile_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get business profile by ID.
    """
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business_profile


@router.put("/{business_profile_id}", response_model=schemas.BusinessProfile)
def update_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_profile_id: int,
    business_profile_in: schemas.BusinessProfileUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update business profile.
    """
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    for field, value in business_profile_in.dict(exclude_unset=True).items():
        setattr(business_profile, field, value)
        
    db.add(business_profile)
    db.commit()
    db.refresh(business_profile)
    return business_profile


@router.delete("/{business_profile_id}", response_model=schemas.BusinessProfile)
def delete_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_profile_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete business profile.
    """
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    db.delete(business_profile)
    db.commit()
    return business_profile


@router.put("/{business_profile_id}/default", response_model=schemas.BusinessProfile)
def set_default_business_profile(
    *,
    db: Session = Depends(deps.get_db),
    business_profile_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Set a business profile as the default one for the current user.
    """
    # Verify profile exists and belongs to user
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Reset is_default for all other profiles
    db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == current_user.id,
        models.BusinessProfile.id != business_profile_id
    ).update({models.BusinessProfile.is_default: False})
    
    # Set current profile as default
    business_profile.is_default = True
    
    db.add(business_profile)
    db.commit()
    db.refresh(business_profile)
    
    return business_profile