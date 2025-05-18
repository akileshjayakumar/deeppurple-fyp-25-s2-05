import os
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings configuration.

    This class defines all settings used by the application. Values can be set
    via environment variables. For example, to set DATABASE_URL, set the
    environment variable `DATABASE_URL`.

    For security-sensitive values, they can also be loaded from a .env file
    which should be kept out of version control.
    """
    # App settings
    APP_NAME: str = "DeepPurple"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "t")

    # Deployment environment
    # development, staging, production
    DEPLOYMENT_ENV: str = os.getenv("DEPLOYMENT_ENV", "development")
    IS_LAMBDA: bool = os.environ.get("AWS_LAMBDA_FUNCTION_NAME") is not None

    # Security settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "your-super-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database settings
    USE_SQLITE: bool = os.getenv(
        "USE_SQLITE", "false").lower() in ("true", "1", "t")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "")
    DB_USERNAME: str = os.getenv("DB_USERNAME", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "deeppurple")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    # AWS RDS Proxy settings for Lambda
    AWS_RDS_PROXY_ENDPOINT: Optional[str] = os.getenv(
        "AWS_RDS_PROXY_ENDPOINT", None)

    # AWS settings
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET_NAME: str = os.getenv("AWS_S3_BUCKET_NAME", "deeppurple")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")

    # MinIO / Local S3 settings
    AWS_S3_USE_LOCAL: bool = os.getenv(
        "AWS_S3_USE_LOCAL", "false").lower() in ("true", "1", "t")
    AWS_ENDPOINT_URL: Optional[str] = os.getenv("AWS_ENDPOINT_URL", None)

    # Lambda settings
    LAMBDA_FUNCTION_NAME: Optional[str] = os.getenv(
        "AWS_LAMBDA_FUNCTION_NAME", None)

    # API Base URL (for Lambda and Beanstalk)
    API_BASE_URL: Optional[str] = os.getenv("API_BASE_URL", None)

    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        """Pydantic settings configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"  # Allow extra fields in the settings


# Create settings instance that will be imported from this module
settings = Settings()
