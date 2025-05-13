"""
Admin Utilities

This module provides utility functions for administrative tasks.
"""

import logging
from sqlalchemy.orm import Session
from models.models import User
from core.auth import get_password_hash

logger = logging.getLogger(__name__)


def create_admin_user(
    db: Session,
    email: str,
    password: str,
    full_name: str = "System Administrator",
) -> User:
    """
    Create an admin user in the database.

    This function is useful for bootstrapping the application with an initial
    admin account. It checks if the user already exists, and if not, creates
    a new user with admin privileges.

    Args:
        db: Database session
        email: Admin user email
        password: Admin user password (will be hashed)
        full_name: Admin user full name (defaults to "System Administrator")

    Returns:
        User: The created or existing admin user

    Raises:
        Exception: If there's an error creating the admin user
    """
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            # If user exists but isn't an admin, make them an admin
            if not existing_user.is_admin:
                existing_user.is_admin = True
                db.commit()
                db.refresh(existing_user)
                logger.info(f"User {email} promoted to admin")
            else:
                logger.info(f"Admin user {email} already exists")

            return existing_user

        # Create new admin user
        hashed_password = get_password_hash(password)
        new_admin = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
            is_admin=True
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        logger.info(f"Admin user {email} created successfully")
        return new_admin

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating admin user: {str(e)}")
        raise
