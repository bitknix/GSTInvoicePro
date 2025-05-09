from typing import Any, List

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user
    """
    return current_user


@router.put("/me", response_model=schemas.User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user
    """
    current_user_data = jsonable_encoder(current_user)
    user_in = schemas.UserUpdate(**current_user_data)
    if user_in.password is not None:
        user_in.password = user_in.password
    if user_in.email is not None:
        user_in.email = user_in.email
    user = crud.user.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.get("/{user_id}", response_model=schemas.User)
def read_user_by_id(
    user_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Get a specific user by id
    """
    user = crud.user.get(db, id=user_id)
    if user == current_user:
        return user
    if not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return user 