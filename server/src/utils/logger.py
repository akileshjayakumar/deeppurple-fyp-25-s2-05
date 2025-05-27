"""
Logging Configuration

This module sets up logging for the DeepPurple application.
"""

import logging
import logging.handlers
import os
import sys
from pathlib import Path

# In a real implementation, this would import from core.config
# but to avoid circular imports, we'll define default values here
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()


def configure_logging():
    """
    Configure the application's logging.

    Sets up console and file logging with appropriate log levels and formatting.
    """
    # Determine log level from environment or use INFO as default
    log_level_name = LOG_LEVEL
    log_level = getattr(logging, log_level_name, logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    if root_logger.handlers:
        root_logger.handlers.clear()

    # Create formatters
    standard_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(standard_formatter)
    root_logger.addHandler(console_handler)

    # Create application logger
    logger = logging.getLogger("deeppurple")

    # Set level based on DEBUG setting
    if DEBUG:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(log_level)

    return logger


# Export the logger for use in other modules
logger = configure_logging()
