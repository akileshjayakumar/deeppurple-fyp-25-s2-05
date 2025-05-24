"""
Database configuration and connection management module.

This module handles database setup, connection management, and provides
a dependency for database sessions in FastAPI endpoints. It supports both
PostgreSQL and SQLite databases, with automatic fallback to SQLite if
PostgreSQL connection fails.

The module configures database connection pools, handles connection timeouts,
and ensures proper session lifecycle management. It also creates the base class
for SQLAlchemy ORM models.
"""

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from contextvars import ContextVar

from core.config import settings

# Set up logging
logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)
logger = logging.getLogger(__name__)

# Context variable to track request context for session management
request_id_ctx_var = ContextVar("request_id", default=None)

# Check if this is a local development environment
# For local development, use SQLite by default
if settings.USE_SQLITE or (settings.DATABASE_URL == "postgresql://postgres:postgres@localhost/deeppurple"):
    # Use SQLite for local development
    logger.debug("Using SQLite for local development")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./deeppurple.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}  # Needed for SQLite
    )
else:
    # Format PostgreSQL connection string for production
    if settings.DATABASE_URL and '://' not in settings.DATABASE_URL:
        # It's just a hostname, format it as a proper PostgreSQL URL
        db_host = settings.DATABASE_URL
        db_username = os.getenv("DB_USERNAME", settings.DB_USERNAME)
        db_password = os.getenv("DB_PASSWORD", settings.DB_PASSWORD)
        db_name = os.getenv("DB_NAME", settings.DB_NAME)
        db_port = os.getenv("DB_PORT", settings.DB_PORT)
        SQLALCHEMY_DATABASE_URL = f"postgresql://{db_username}:{db_password}@{db_host}:{db_port}/{db_name}"
    else:
        SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

    logger.debug(f"Database URL: {SQLALCHEMY_DATABASE_URL}")

    # Create engine with connection pool settings optimized for Elastic Beanstalk
    try:
        engine_args = {
            "pool_pre_ping": True,  # Test connections before using them
            "pool_recycle": 3600,   # Recycle connections after 1 hour
            "pool_size": 10,        # Connection pool size for Elastic Beanstalk
            "max_overflow": 20,     # Allow up to 20 connections to be created beyond pool_size
            "connect_args": {
                "connect_timeout": 10  # 10 second connection timeout
            }
        }

        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            **engine_args
        )

        # Test connection
        with engine.connect() as conn:
            logger.debug("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        # Create a sqlite engine to allow application to start
        logger.warning(
            "Using SQLite as fallback due to PostgreSQL connection error")
        SQLALCHEMY_DATABASE_URL = "sqlite:///./fallback.db"
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False}  # Needed for SQLite
        )

# Create session factory with scoped_session for better thread safety
SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)

# Create base class for models
Base = declarative_base()

# Dependency for database session


def get_db():
    """
    Get a database session.

    This function yields a database session that will be closed after use.
    It should be used as a FastAPI dependency to ensure proper session
    lifecycle management across request/response cycles.

    The function creates a new session from the SessionLocal factory, yields
    it to the caller, and ensures it is properly closed after use, even if
    an exception occurs during the request handling.

    Example:
        @app.get("/items/")
        async def read_items(db: Session = Depends(get_db)):
            items = db.query(Item).all()
            return items

    Yields:
        Session: A SQLAlchemy session object
    """
    # Create a new session for this request
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
