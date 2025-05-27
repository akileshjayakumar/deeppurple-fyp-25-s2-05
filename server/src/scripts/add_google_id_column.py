#!/usr/bin/env python3
"""
Migration script to add google_id column to users table.

This script adds the missing google_id column to the users table
in the PostgreSQL database.
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

def add_google_id_column():
    """Add google_id column to users table if it doesn't exist."""
    try:
        # Create engine with the same connection parameters as the application
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Connect to the database
        with engine.connect() as connection:
            # Check if the column already exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'google_id';
            """)
            result = connection.execute(check_query)
            column_exists = result.fetchone() is not None
            
            if column_exists:
                logger.info("google_id column already exists in users table")
                return
            
            # Add the column
            alter_query = text("""
                ALTER TABLE users 
                ADD COLUMN google_id VARCHAR(255);
            """)
            connection.execute(alter_query)
            connection.commit()
            
            logger.info("Successfully added google_id column to users table")
    
    except Exception as e:
        logger.error(f"Error adding google_id column: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("Starting migration to add google_id column")
    add_google_id_column()
    logger.info("Migration completed")
