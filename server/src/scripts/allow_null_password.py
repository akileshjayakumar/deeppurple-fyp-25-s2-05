#!/usr/bin/env python3
"""
Migration script to allow NULL values in the hashed_password column.

This script modifies the hashed_password column in the users table
to allow NULL values, which is necessary for users who authenticate
via OAuth providers like Google.
"""

import sys
import logging
import os

# Add the parent directory to sys.path to import from src
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, text
from core.config import settings
from core.database import SQLALCHEMY_DATABASE_URL

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def allow_null_password():
    """Modify the hashed_password column to allow NULL values."""
    try:
        # Create engine with the same connection parameters as the application
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Connect to the database
        with engine.connect() as connection:
            # Check if the column is already nullable
            check_query = text("""
                SELECT is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'hashed_password';
            """)
            result = connection.execute(check_query)
            row = result.fetchone()
            
            if row and row[0] == 'YES':
                logger.info("hashed_password column already allows NULL values")
                return
            
            # Alter the column to allow NULL values
            alter_query = text("""
                ALTER TABLE users 
                ALTER COLUMN hashed_password DROP NOT NULL;
            """)
            connection.execute(alter_query)
            connection.commit()
            
            logger.info("Successfully modified hashed_password column to allow NULL values")
    
    except Exception as e:
        logger.error(f"Error modifying hashed_password column: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("Starting migration to allow NULL values in hashed_password column")
    allow_null_password()
    logger.info("Migration completed")
