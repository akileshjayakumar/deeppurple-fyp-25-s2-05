from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from schemas import schemas
from core.auth import get_current_admin_user
from core.database import get_db
from models.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=schemas.UserList)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all registered user accounts.

    This endpoint allows administrators to view all registered users with
    pagination, filtering, and search capabilities. It requires admin privileges.
    """
    # Start with base query
    query = db.query(User)

    # Apply filters if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    # Get total for pagination
    total = query.count()

    # Apply pagination
    users = query.offset(skip).limit(limit).all()

    return {"items": users, "total": total}


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific user's details.

    This endpoint allows administrators to view the details of a specific user.
    It requires admin privileges.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's account details.

    This endpoint allows administrators to update a user's account details,
    including activation status and admin privileges. It requires admin privileges.
    """
    # Prevent admins from deactivating themselves
    if user_id == current_user.id and user_update.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own accounts"
        )

    # Prevent admins from removing their own admin status
    if user_id == current_user.id and user_update.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot remove their own admin privileges"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update fields if provided
    if user_update.full_name is not None:
        user.full_name = user_update.full_name

    if user_update.profile_picture is not None:
        user.profile_picture = user_update.profile_picture

    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    if user_update.is_admin is not None:
        user.is_admin = user_update.is_admin

    # Save changes
    db.commit()
    db.refresh(user)

    return user


@router.put("/users/{user_id}/deactivate", response_model=schemas.UserResponse)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user account.

    This endpoint allows administrators to deactivate a user account, effectively
    preventing them from logging in. It requires admin privileges.
    """
    # Prevent admins from deactivating themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot deactivate their own accounts"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_active = False
    db.commit()
    db.refresh(user)

    return user


@router.put("/users/{user_id}/activate", response_model=schemas.UserResponse)
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Activate a user account.

    This endpoint allows administrators to reactivate a previously deactivated
    user account. It requires admin privileges.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_active = True
    db.commit()
    db.refresh(user)

    return user
