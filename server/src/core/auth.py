from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests

from core.config import settings
from core.database import get_db
from models.models import User
from schemas.schemas import TokenData
from utils.logger import logger

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# In-memory token blacklist (for simplicity; use Redis or DB in production)
token_blacklist = set()


def add_token_to_blacklist(token: str):
    """
    Adds a token to the blacklist.

    This function adds a JWT token to an in-memory blacklist, effectively
    invalidating it for future authentication attempts. This is used during
    logout to revoke access.

    Args:
        token: The JWT token to blacklist
    """
    token_blacklist.add(token)


def is_token_blacklisted(token: str) -> bool:
    """
    Checks if a token is in the blacklist.

    This function verifies if a given JWT token has been previously revoked
    by checking it against the in-memory blacklist.

    Args:
        token: The JWT token to check

    Returns:
        bool: True if the token is blacklisted, False otherwise
    """
    return token in token_blacklist


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.

    This function checks if a plaintext password matches a previously hashed
    password using the configured hashing algorithm (bcrypt).

    Args:
        plain_password: The plaintext password to verify
        hashed_password: The hashed password to compare against

    Returns:
        bool: True if the password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password for storing.

    This function creates a secure hash of a plaintext password using the
    configured hashing algorithm (bcrypt) for safe storage in the database.

    Args:
        password: The plaintext password to hash

    Returns:
        str: The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token with an optional expiration time.

    This function generates a new JWT token containing the provided data
    and sets an expiration time. This is used to create authentication tokens
    for users upon login or registration.

    Args:
        data: The payload data to include in the token
        expires_delta: Optional custom expiration time. If not provided,
                      the default expiration time from settings is used

    Returns:
        str: The encoded JWT token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + \
        (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from a JWT token.

    This function validates the provided JWT token, extracts the user ID
    from it, and fetches the corresponding user from the database. It's
    used as a FastAPI dependency to protect endpoints that require authentication.

    Args:
        token: The JWT token from the request's Authorization header
        db: Database session dependency

    Returns:
        User: The authenticated user

    Raises:
        HTTPException: If the token is invalid, blacklisted, or the user doesn't exist
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked (logged out)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Decode the JWT token
        payload = jwt.decode(token, settings.SECRET_KEY,
                             algorithms=[settings.ALGORITHM])
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id))
    except JWTError:
        raise credentials_exception

    # Get the user from the database
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active user.

    This function builds on get_current_user and validates that the user
    account is active. It's used as a FastAPI dependency to protect endpoints
    that require an active user.

    Args:
        current_user: The current authenticated user (from get_current_user)

    Returns:
        User: The active authenticated user

    Raises:
        HTTPException: If the user account is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency to get the current admin user.

    This function builds on get_current_active_user and validates that the user
    has admin privileges. It's used as a FastAPI dependency to protect endpoints
    that should only be accessible to administrators.

    Args:
        current_user: The current authenticated user (from get_current_active_user)

    Returns:
        User: The active authenticated admin user

    Raises:
        HTTPException: If the user doesn't have admin privileges
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def verify_google_token(token_id: str) -> dict:
    """
    Verify a Google OAuth ID token and extract user information.

    This function receives a Google ID token from the client side, verifies its
    authenticity using Google's authentication services, and extracts user profile
    information like email, name, and profile picture.

    Args:
        token_id: The Google ID token to verify

    Returns:
        dict: User information extracted from the verified token

    Raises:
        HTTPException: If token verification fails
    """
    # Verify the token with Google
    try:
        idinfo = id_token.verify_oauth2_token(
            token_id, requests.Request(), settings.GOOGLE_CLIENT_ID)
        return idinfo

    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )
