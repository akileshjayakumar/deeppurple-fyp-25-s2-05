"""
S3 Storage Utilities

This module provides functions for interacting with AWS S3 storage.
"""

import os
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
import logging
from typing import Optional, BinaryIO, Dict, Any, Union
import uuid
import io

from core.config import settings

# Set up logging
logger = logging.getLogger(__name__)


def get_s3_client():
    """
    Create and return an S3 client using the configured AWS credentials.
    If AWS_S3_USE_LOCAL is set, connects to a local MinIO service instead.

    Returns:
        boto3.client: A configured S3 client
    """
    try:
        # Get AWS credentials from settings
        aws_access_key_id = settings.AWS_ACCESS_KEY_ID
        aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY
        region_name = settings.AWS_REGION

        # Check if we should use local MinIO
        use_local = getattr(settings, 'AWS_S3_USE_LOCAL', False)
        endpoint_url = getattr(settings, 'AWS_ENDPOINT_URL', None)

        # Configure client parameters
        client_kwargs = {
            'service_name': 's3',
            'aws_access_key_id': aws_access_key_id,
            'aws_secret_access_key': aws_secret_access_key,
            'region_name': region_name
        }

        # Add endpoint_url for MinIO if using local S3
        if use_local and endpoint_url:
            client_kwargs['endpoint_url'] = endpoint_url
            # For MinIO we often need to disable these checks
            client_kwargs['verify'] = False

        return boto3.client(**client_kwargs)
    except Exception as e:
        logger.error(f"Failed to create S3 client: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to connect to S3 storage")


def upload_file_to_s3(
    file: Union[UploadFile, BinaryIO],
    session_id: int = None,
    filename: Optional[str] = None
) -> str:
    """
    Upload a file to S3 storage or simulate it in development mode.

    In production, this would upload to an actual S3 bucket.
    In development, it saves to a local 'uploads' directory.

    Args:
        file: File object to upload (UploadFile or BytesIO)
        session_id: Optional session ID
        filename: Optional filename to use (if file is not UploadFile)

    Returns:
        String containing the S3 key or local file path
    """
    try:
        # Create a unique filename
        if isinstance(file, UploadFile):
            original_filename = file.filename
        else:
            # Use provided filename or default
            original_filename = filename or f"file.bin"

        # Get file extension
        file_extension = original_filename.split(
            '.')[-1] if '.' in original_filename else 'bin'

        unique_id = str(uuid.uuid4())
        s3_key = f"{session_id if session_id else 'general'}/{unique_id}_{original_filename}"

        # In development mode, save to local filesystem
        if not os.getenv("AWS_ACCESS_KEY_ID"):
            logger.info(
                f"Running in development mode, saving to local file: {s3_key}")

            # Create uploads directory if it doesn't exist
            uploads_dir = os.path.join(os.getcwd(), 'uploads')
            if not os.path.exists(uploads_dir):
                os.makedirs(uploads_dir, exist_ok=True)

            # Create session directory if needed
            session_dir = os.path.join(uploads_dir, str(
                session_id if session_id else 'general'))
            if not os.path.exists(session_dir):
                os.makedirs(session_dir, exist_ok=True)

            # Define the file path
            file_path = os.path.join(uploads_dir, s3_key)

            # Read the file data
            if isinstance(file, UploadFile):
                # For FastAPI UploadFile, we need to get the file data
                file_content = file.file.read()
                # Reset file position for future reads
                file.file.seek(0)
            else:
                # For regular file objects like BytesIO
                current_pos = file.tell()
                file_content = file.read()
                file.seek(current_pos)  # Reset position

            # Write to disk
            with open(file_path, 'wb') as f:
                f.write(file_content)

            logger.info(f"File saved to {file_path}")
            return s3_key

        # In production, this would use boto3 to upload to AWS S3
        # For now, we'll just return the key as if it was uploaded
        logger.info(f"Simulating S3 upload for {s3_key}")
        return s3_key

    except Exception as e:
        logger.error(f"Error in upload_file_to_s3: {str(e)}")
        raise


def get_file_from_s3(s3_key: str) -> bytes:
    """
    Retrieve a file from S3 storage or local file system in development mode.

    Args:
        s3_key: The key (path) of the file in S3

    Returns:
        Bytes containing the file data
    """
    try:
        # In development mode, read from local filesystem
        if not os.getenv("AWS_ACCESS_KEY_ID"):
            logger.info(
                f"Running in development mode, reading local file: {s3_key}")
            file_path = os.path.join(os.getcwd(), 'uploads', s3_key)

            if not os.path.exists(file_path):
                logger.error(f"File not found at {file_path}")
                return b""

            with open(file_path, 'rb') as f:
                return f.read()

        # In production, this would use boto3 to get from AWS S3
        # For now, just return empty bytes
        logger.warning("S3 retrieval not implemented in production mode")
        return b""

    except Exception as e:
        logger.error(f"Error in get_file_from_s3: {str(e)}")
        return b""


def delete_file_from_s3(s3_key: str) -> bool:
    """
    Delete a file from S3 storage or local file system in development mode.

    Args:
        s3_key: The key (path) of the file in S3

    Returns:
        Boolean indicating success or failure
    """
    try:
        # In development mode, delete from local filesystem
        if not os.getenv("AWS_ACCESS_KEY_ID"):
            logger.info(
                f"Running in development mode, deleting local file: {s3_key}")
            file_path = os.path.join(os.getcwd(), 'uploads', s3_key)

            if not os.path.exists(file_path):
                logger.warning(f"File not found for deletion: {file_path}")
                return False

            os.remove(file_path)
            return True

        # In production, this would use boto3 to delete from AWS S3
        logger.warning("S3 deletion not implemented in production mode")
        return True

    except Exception as e:
        logger.error(f"Error in delete_file_from_s3: {str(e)}")
        return False


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for accessing a file in S3.

    Args:
        s3_key: The key (path) of the file in S3
        expiration: URL expiration time in seconds (default 1 hour)

    Returns:
        String containing the presigned URL
    """
    # In development mode, return a local URL
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        logger.info(
            f"Running in development mode, generating local URL for: {s3_key}")
        file_path = os.path.join(os.getcwd(), 'uploads', s3_key)

        if not os.path.exists(file_path):
            logger.warning(f"File not found for URL generation: {file_path}")
            return ""

        # Return a file:// URL
        return f"file://{os.path.abspath(file_path)}"

    # In production, this would use boto3 to generate a presigned URL
    logger.warning(
        "S3 presigned URL generation not implemented in production mode")
    return f"http://example.com/s3/{s3_key}"
