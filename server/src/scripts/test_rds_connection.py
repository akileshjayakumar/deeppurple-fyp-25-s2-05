"""
RDS Connection Test Script.

This script tests the connection to the AWS RDS PostgreSQL instance.
Run this script after setting up the RDS instance to verify connectivity.
"""

from core.config import settings
from core.database import engine
import sys
import os
import logging
from sqlalchemy import text

# Add the parent directory to the path so we can import from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_connection():
    """Test the connection to the RDS database."""
    try:
        logger.info(
            f"Testing connection to database at: {settings.DATABASE_URL}")

        # Try to connect and run a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            for row in result:
                logger.info(f"Query result: {row[0]}")

        logger.info("✅ Successfully connected to the RDS PostgreSQL database!")

        # Print connection info for debugging
        logger.info(f"Connection details:")
        logger.info(f"  Database URL: {settings.DATABASE_URL}")
        logger.info(f"  Database Name: {settings.DB_NAME}")
        logger.info(f"  Username: {settings.DB_USERNAME}")

        return True
    except Exception as e:
        logger.error(f"❌ Error connecting to the database: {str(e)}")
        return False


if __name__ == "__main__":
    logger.info("Starting RDS connection test...")
    success = test_connection()
    if success:
        logger.info("RDS connection test completed successfully.")
        sys.exit(0)
    else:
        logger.error("RDS connection test failed.")
        sys.exit(1)
