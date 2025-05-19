"""
Database initialization script.

This script creates all necessary tables in the database.
Run this script after setting up the RDS instance to initialize the schema.
"""

from models.models import Base
from core.database import engine
import sys
import os
import logging

# Add src to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db():
    """Initialize the database by creating all tables."""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    logger.info("Starting database initialization...")
    init_db()
    logger.info("Database initialization completed.")
