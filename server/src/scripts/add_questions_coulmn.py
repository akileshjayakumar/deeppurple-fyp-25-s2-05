"""Script to add chart_data and chart_type columns to questions table."""
import os
import sys
import psycopg2
from psycopg2 import sql
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Create a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("POSTGRES_DB", "deeppurple_dev"),
            user=os.getenv("POSTGRES_USER", "deeppurple_user"),
            password=os.getenv("POSTGRES_PASSWORD", "deeppurple_password"),
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5432")
        )
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        raise

def add_question_columns():
    """Add chart_data and chart_type columns to questions table if they don't exist."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Add chart_data column if it doesn't exist
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'questions' AND column_name = 'chart_data';
            """)
            if not cur.fetchone():
                logger.info("Adding chart_data column to questions table...")
                cur.execute("""
                    ALTER TABLE questions 
                    ADD COLUMN chart_data JSON;
                """)
                logger.info("chart_data column added successfully.")
            else:
                logger.info("chart_data column already exists.")

            # Add chart_type column if it doesn't exist
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'questions' AND column_name = 'chart_type';
            """)
            if not cur.fetchone():
                logger.info("Adding chart_type column to questions table...")
                cur.execute("""
                    ALTER TABLE questions 
                    ADD COLUMN chart_type VARCHAR(50);
                """)
                logger.info("chart_type column added successfully.")
            else:
                logger.info("chart_type column already exists.")
            
            conn.commit()
            logger.info("Database migration completed successfully.")
            
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_question_columns()
