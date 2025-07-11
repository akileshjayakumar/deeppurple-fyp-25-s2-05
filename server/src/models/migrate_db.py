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


def check_and_add_column(conn, table_name, column_name, column_type):
    """Check if a column exists and add it if it doesn't."""
    result = conn.execute(text(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = :table_name AND column_name = :column_name;
    """), {'table_name': table_name, 'column_name': column_name})

    if not result.fetchone():
        logger.info(f"Adding {column_name} column to {table_name} table...")
        conn.execute(text(f"""
            ALTER TABLE {table_name} 
            ADD COLUMN {column_name} {column_type};
        """))
        conn.commit()
        logger.info(f"{column_name} column added successfully to {table_name}.")
        return True
    else:
        logger.info(f"{column_name} column already exists in {table_name}.")
        return False


def migrate_db():
    """Run database migrations."""
    try:
        logger.info("Starting database migration...")
        with engine.connect() as conn:
            # Migrate users table
            check_and_add_column(conn, 'users', 'user_tier', "VARCHAR(50) DEFAULT 'basic' NOT NULL")
            
            # Migrate questions table
            check_and_add_column(conn, 'questions', 'chart_data', 'JSON')
            check_and_add_column(conn, 'questions', 'chart_type', 'VARCHAR(50)')
            
            logger.info("Database migration completed successfully.")
            
    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        raise
        sys.exit(1)


if __name__ == "__main__":
    logger.info("Starting database migration...")
    migrate_db()
    logger.info("Database migration completed.")
