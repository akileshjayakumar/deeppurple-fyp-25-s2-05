"""
Database migration script.

This script adds the user_tier column to the users table for existing databases.
"""

from core.database import engine
import sys
import os
import logging
from sqlalchemy import text

# Add src to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '../..')))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_db():
    """Add user_tier column to users table if it doesn't exist."""
    try:
        logger.info("Checking if user_tier column exists...")
        with engine.connect() as conn:
            # Check if user_tier column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='user_tier';
            """))

            if not result.fetchone():
                logger.info("Adding user_tier column to users table...")
                conn.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN user_tier VARCHAR(50) NOT NULL DEFAULT 'basic';
                """))
                conn.commit()
                logger.info("user_tier column added successfully.")
            else:
                logger.info("user_tier column already exists.")
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    logger.info("Starting database migration...")
    migrate_db()
    logger.info("Database migration completed.")
