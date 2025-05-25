from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Response
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
        # Upload profile picture to S3 - await the async function
        s3_key = await upload_file_to_s3(file, current_user.id)

        # Store the S3 key in the profile_picture field
        # The frontend will construct the full URL using this key
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


@router.post("/change-password", response_model=schemas.UserResponse)
async def change_password_post(
    password_update: schemas.PasswordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change user password (POST endpoint for frontend compatibility).

    This endpoint provides secure password change functionality with proper validation:
    - Verifies current password before allowing change
    - Enforces password strength requirements
    - Uses secure bcrypt hashing for storage
    - Returns minimal error information for security
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify current password
    if not user.hashed_password or not verify_password(password_update.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password strength
    new_password = password_update.new_password

    # Basic password validation
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Check for at least one uppercase letter
    if not any(c.isupper() for c in new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter"
        )

    # Check for at least one lowercase letter
    if not any(c.islower() for c in new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter"
        )

    # Check for at least one digit
    if not any(c.isdigit() for c in new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number"
        )

    # Ensure new password is different from current password
    if verify_password(new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Update password with secure hashing
    user.hashed_password = get_password_hash(new_password)

    # Save changes
    db.commit()
    db.refresh(user)

    # Log successful password change (without sensitive data)
    from utils.logger import logger
    logger.info(f"Password changed successfully for user ID: {user.id}")

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


@router.patch("/profile", response_model=schemas.UserResponse)
async def update_user_profile_patch(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    full_name: str = None,
    profile_picture: UploadFile = None
):
    """
    Update user profile information via PATCH method.

    This endpoint allows updating profile information by sending form data,
    supporting partial updates of profile details and file uploads.
    """
    # Set up logging
    import logging
    logger = logging.getLogger(__name__)
    
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()
    
    # Log the current state
    logger.info(f"Updating user profile for user_id={current_user.id}")
    logger.info(f"Current profile: full_name='{user.full_name}', profile_picture='{user.profile_picture}'")
    logger.info(f"Update request: full_name='{full_name}', profile_picture={profile_picture is not None}")

    # Update full name if provided
    if full_name:
        user.full_name = full_name
        logger.info(f"Updated full_name to: {full_name}")

    # Update profile picture if provided
    if profile_picture:
        try:
            # Read a small portion of the file to determine its MIME type
            file_header = await profile_picture.read(2048)
            mime_type = magic.from_buffer(file_header, mime=True)
            logger.info(f"Detected MIME type: {mime_type}")

            # Reset file position after reading the header
            await profile_picture.seek(0)

            # Check if file type is an image
            if not mime_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file must be an image (JPEG, PNG, etc.)"
                )

            # Generate a unique filename to prevent collisions
            file_extension = profile_picture.filename.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"

            # Create a specific path for profile pictures
            s3_key = f"profile_pictures/{current_user.id}/{unique_filename}"
            profile_picture.filename = s3_key

            # Upload profile picture to S3 - await the async function
            s3_key = await upload_file_to_s3(profile_picture, current_user.id)
            logger.info(f"S3 key after upload: {s3_key}")
            
            # Update the user's profile picture URL
            user.profile_picture = s3_key
            logger.info(f"Updated user profile_picture to: {user.profile_picture}")

        except Exception as e:
            logger.error(f"Failed to upload profile picture: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload profile picture: {str(e)}"
            )

    # Save changes
    db.commit()
    db.refresh(user)

    return user


@router.get("/profile-picture/{s3_key:path}")
async def get_profile_picture(s3_key: str):
    """
    Serve a profile picture from S3.
    
    This endpoint retrieves a profile picture from S3 and serves it directly.
    The s3_key is the path to the file in S3.
    """
    try:
        from utils.s3 import get_file_from_s3
        # Get the file content from S3
        file_content = await get_file_from_s3(s3_key)
        
        # Determine content type (default to JPEG if unknown)
        content_type = "image/jpeg"
        if s3_key.lower().endswith(".png"):
            content_type = "image/png"
        elif s3_key.lower().endswith(".gif"):
            content_type = "image/gif"
        
        # Return the file content with appropriate headers
        return Response(
            content=file_content,
            media_type=content_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile picture not found: {str(e)}"
        )


@router.delete("/profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete the current user's account.

    This endpoint allows users to delete their own account.
    All associated data will be removed from the system.
    """
    # Get user from database
    user = db.query(User).filter(User.id == current_user.id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # If the user is an admin, check if they are the last admin
    if user.is_admin:
        admin_count = db.query(User).filter(User.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last admin account"
            )

    # Delete the user
    db.delete(user)
    db.commit()

    return None
