from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from schemas import schemas
from core.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user, add_token_to_blacklist, oauth2_scheme
)
from core.config import settings
from core.database import get_db
from models.models import User
from utils.logger import logger

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Authenticate user and provide access token.

    This endpoint is used for password-based authentication. It receives a username
    (which is the user's email) and password from a form submission, verifies them against
    the database, and returns a JWT token if authentication is successful.
    """
    # Find the user by email
    user = db.query(User).filter(User.email == form_data.username).first()

    # Check if user exists and password is correct
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/signup", response_model=schemas.UserResponse)
async def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    This endpoint allows new users to register with an email and password. It checks if
    the email is already in use, hashes the password, and creates a new user in the database.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if password is provided
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        profile_picture=user_data.profile_picture,
        hashed_password=get_password_hash(user_data.password)
    )

    # Add user to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/me", response_model=schemas.UserResponse)
async def get_user_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user.

    This endpoint returns the profile information of the currently authenticated user.
    It requires a valid JWT token in the Authorization header.
    """
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme)
):
    """
    Log out the current user by blacklisting their current access token.

    This endpoint invalidates the user's current JWT token by adding it to a blacklist,
    effectively ending their session. Any subsequent requests using this token will
    be rejected with a 401 Unauthorized error.

    Args:
        current_user: The authenticated user from the get_current_active_user dependency
        token: The JWT token from the request's Authorization header

    Returns:
        dict: A success message confirming the logout
    """
    add_token_to_blacklist(token)
    return {"message": "Successfully logged out"}


@router.post("/google", response_model=schemas.Token)
async def login_with_google(
    google_auth: schemas.GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user using Google OAuth token.

    This endpoint receives a Google token ID from the client's Google Sign-In flow, 
    verifies it with Google, and either logs in an existing user or creates a new user 
    account if it's their first time signing in with Google.

    Args:
        google_auth: Contains the token ID from Google Sign-In
        db: Database session

    Returns:
        Token: JWT access token for authenticated session
    """
    try:
        # TODO: Implement Google token verification
        # 1. Verify the Google token ID with Google's API
        # 2. Extract user information from the verified token
        # 3. Check if user exists in database, create if not
        # 4. Generate and return JWT token

        # This is a placeholder implementation
        # In a real implementation, you would verify the token with Google
        logger.info(f"Processing Google authentication request")

        # Placeholder: Create or get user based on Google profile
        # For now, throw an exception so clients know this isn't implemented yet
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google authentication is not fully implemented yet"
        )

    except Exception as e:
        logger.error(f"Google authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
