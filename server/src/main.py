import os
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from core.database import engine, Base, SQLALCHEMY_DATABASE_URL, get_db
from api import auth, users, sessions, files, analysis, admin
from utils.admin import create_admin_user
from utils.logger import logger
from core.auth import get_password_hash
from models.models import User

# Print some diagnostic information at startup
logger.info(f"DeepPurple API Starting - Version: {settings.APP_VERSION}")
logger.info(f"Debug mode: {settings.DEBUG}")
logger.info(f"Deployment environment: {settings.DEPLOYMENT_ENV}")
logger.info(f"OpenAI API Key present: {bool(settings.OPENAI_API_KEY)}")

# Create database tables on startup


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI application.

    This function handles application startup and shutdown events.
    On startup, it initializes the database connection and creates tables.
    On shutdown, it performs cleanup operations if needed.

    Args:
        app: The FastAPI application instance
    """
    try:
        # Log database connection attempt
        logger.debug(
            f"Attempting to connect to database with URL: {SQLALCHEMY_DATABASE_URL}")

        # Create database tables - skip in Lambda environment
        if not settings.IS_LAMBDA:
            Base.metadata.create_all(bind=engine)
            logger.debug("Database tables created successfully")
        else:
            logger.debug(
                "Running in Lambda environment - skipping database table creation")

        # Create initial admin user if environment variables are set and not in Lambda
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if admin_email and admin_password and not settings.IS_LAMBDA:
            # Get a database session
            from sqlalchemy.orm import sessionmaker
            SessionLocal = sessionmaker(
                autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()

            try:
                # Create admin user
                admin_user = create_admin_user(
                    db=db,
                    email=admin_email,
                    password=admin_password
                )
                logger.info(f"Admin user setup completed for {admin_email}")
            except Exception as e:
                logger.error(f"Failed to create admin user: {str(e)}")
            finally:
                db.close()
        else:
            logger.info(
                "Admin credentials not provided or running in Lambda, skipping admin user creation")

        # Always create a test user for development, whether admin is created or not
        try:
            from sqlalchemy.orm import sessionmaker
            SessionLocal = sessionmaker(
                autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()

            from core.auth import get_password_hash
            from models.models import User

            test_user = db.query(User).filter(
                User.email == "user@example.com").first()
            if not test_user:
                test_user = User(
                    email="user@example.com",
                    hashed_password=get_password_hash("password"),
                    full_name="Test User",
                    is_active=True
                )
                db.add(test_user)
                db.commit()
                logger.info("Test user created: user@example.com / password")
            else:
                logger.info("Test user already exists")

            db.close()
        except Exception as e:
            logger.error(f"Failed to create test user: {str(e)}")

    except Exception as e:
        logger.error(f"Error during database initialization: {str(e)}")

    yield
    # Clean up resources at shutdown if needed
    pass

# Initialize FastAPI app with appropriate configuration for Lambda/Beanstalk
root_path = "" if not settings.API_BASE_URL else settings.API_BASE_URL

app = FastAPI(
    title="DeepPurple API",
    description="API for DeepPurple text analysis platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    root_path=root_path,
)

# Add CORS middleware with more restricted origin settings for production
origins = ["*"]  # Default for development
if settings.DEPLOYMENT_ENV == "production":
    # In production, specify exact allowed origins
    client_domain = os.getenv("CLIENT_DOMAIN", "")
    origins = [
        f"https://{client_domain}",
        f"https://www.{client_domain}",
    ]
    if settings.API_BASE_URL:
        origins.append(settings.API_BASE_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for all HTTPExceptions


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Global exception handler for all HTTP exceptions.

    Args:
        request: The incoming request that caused the exception
        exc: The HTTP exception that was raised

    Returns:
        JSONResponse: A properly formatted JSON response with the error details
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# Exception handler for general exceptions


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for all unhandled exceptions.

    This handler ensures that any unhandled exception is properly logged and
    returns a generic error message to prevent exposing sensitive information.

    Args:
        request: The incoming request that caused the exception
        exc: The exception that was raised

    Returns:
        JSONResponse: A generic 500 error response
    """
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Include routers
app.include_router(auth)
app.include_router(users)
app.include_router(sessions)
app.include_router(files)
app.include_router(analysis)
app.include_router(admin)

# Root endpoint


@app.get("/")
async def root():
    """
    Root endpoint that provides basic API information.

    This endpoint is primarily used to verify that the API is running and
    to display basic version information.

    Returns:
        dict: Basic application information including name, version and welcome message
    """
    env_info = {
        "environment": settings.DEPLOYMENT_ENV,
        "is_lambda": settings.IS_LAMBDA
    }

    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "Welcome to DeepPurple API",
        "environment": env_info
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and deployment systems.

    This endpoint verifies connectivity to the database and reports the
    current status of the API, making it suitable for use in health checks
    for container orchestration, load balancers, etc.

    Returns:
        dict: The health status of the API and its dependencies
    """
    # Check if database is connected
    try:
        # Try a simple query
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "database": db_status,
        "deployment_env": settings.DEPLOYMENT_ENV,
        "is_lambda": settings.IS_LAMBDA
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
