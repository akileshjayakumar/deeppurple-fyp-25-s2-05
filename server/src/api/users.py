from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
import magic
import uuid

from schemas import schemas
from core.auth import get_current_active_user, get_password_hash, verify_password
from core.database import get_db
from models.models import User
from utils.s3 import upload_file_to_s3

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
async def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile information.
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    # Update fields if provided
    if user_update.full_name is not None:
        user.full_name = user_update.full_name

    if user_update.profile_picture is not None:
        user.profile_picture = user_update.profile_picture

    # Save changes
    db.commit()
    db.refresh(user)

    return user


@router.put("/me/profile-picture", response_model=schemas.UserResponse)
async def update_profile_picture(
    file: UploadFile = FastAPIFile(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile picture.

    This endpoint allows the authenticated user to upload a new profile picture.
    The picture is stored in S3 and the URL is saved in the user profile.

    According to FR005 in the PRD: "As an End-User, I want to update my profile picture 
    so that my account reflects my identity."
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    # Read a small portion of the file to determine its MIME type
    file_header = await file.read(2048)
    mime_type = magic.from_buffer(file_header, mime=True)

    # Reset file position after reading the header
    await file.seek(0)

    # Check if file type is an image
    if not mime_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (JPEG, PNG, etc.)"
        )

    # Generate a unique filename to prevent collisions
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    # Create a specific path for profile pictures
    s3_key = f"profile_pictures/{current_user.id}/{unique_filename}"
    file.filename = s3_key

    try:
        # Upload profile picture to S3
        s3_key = upload_file_to_s3(file, current_user.id)

        # Update the user's profile picture URL
        user.profile_picture = s3_key

        # Save changes
        db.commit()
        db.refresh(user)

        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload profile picture: {str(e)}"
        )


@router.put("/me/password", response_model=schemas.UserResponse)
async def change_password(
    password_update: schemas.PasswordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change user password.
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    # Verify current password
    if not user.hashed_password or not verify_password(password_update.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )

    # Update password
    user.hashed_password = get_password_hash(password_update.new_password)

    # Save changes
    db.commit()
    db.refresh(user)

    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data.
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    # Delete user (cascade will delete associated sessions, files, insights, and questions)
    db.delete(user)
    db.commit()

    return None
