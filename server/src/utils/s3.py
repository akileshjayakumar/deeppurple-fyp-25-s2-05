"""
S3 Storage Utilities

This module provides functions for interacting with AWS S3 storage.
"""

import os
import boto3
import asyncio
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
import logging
from typing import Optional, BinaryIO, Dict, Any, Union
import uuid
import io

from core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

# Global S3 client for reuse
_s3_client = None


def get_s3_client():
    """
    Create and return an S3 client using the configured AWS credentials.
    Uses a global client for better performance.

    Returns:
        boto3.client: A configured S3 client
    """
    global _s3_client

    if _s3_client is not None:
        return _s3_client

    try:
        # Validate required AWS credentials
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            raise HTTPException(
                status_code=500,
                detail="AWS credentials not configured"
            )

        # Configure client parameters
        client_kwargs = {
            'service_name': 's3',
            'aws_access_key_id': settings.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': settings.AWS_SECRET_ACCESS_KEY,
            'region_name': settings.AWS_REGION
        }

        # Add endpoint_url for MinIO if using local S3 (for testing)
        if settings.AWS_ENDPOINT_URL:
            client_kwargs['endpoint_url'] = settings.AWS_ENDPOINT_URL
            client_kwargs['verify'] = False

        _s3_client = boto3.client(**client_kwargs)
        return _s3_client
    except Exception as e:
        logger.error(f"Failed to create S3 client: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to connect to S3 storage")


async def upload_file_to_s3(
    file: Union[UploadFile, BinaryIO, bytes],
    session_id: int = None,
    filename: Optional[str] = None
) -> str:
    """
    Upload a file to S3 storage.

    Args:
        file: File object to upload (UploadFile, BytesIO, or bytes)
        session_id: Optional session ID
        filename: Optional filename to use (if file is not UploadFile)

    Returns:
        String containing the S3 key
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

        # Use boto3 to upload to AWS S3
        s3_client = get_s3_client()
        bucket_name = settings.AWS_S3_BUCKET_NAME

        logger.info(
            f"Uploading file to S3 bucket: {bucket_name}, key: {s3_key}")

        # Read the file content based on the input type
        if isinstance(file, bytes):
            # Already have bytes
            file_content = file
        elif isinstance(file, UploadFile):
            file_content = await file.read()
            # Reset file position for future reads
            await file.seek(0)
        else:
            # For regular file objects like BytesIO
            if hasattr(file, 'tell') and hasattr(file, 'seek'):
                current_pos = file.tell()
                file_content = file.read()
                file.seek(current_pos)  # Reset position
            else:
                # Handle raw bytes
                file_content = file if isinstance(file, bytes) else file.read()

        # Upload to S3 using a thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_content
            )
        )

        logger.info(f"File uploaded to S3: {s3_key}")
        return s3_key

    except Exception as e:
        logger.error(f"Error in upload_file_to_s3: {str(e)}")
        raise


async def get_file_from_s3(s3_key: str) -> bytes:
    """
    Retrieve a file from S3 storage.

    Args:
        s3_key: The key (path) of the file in S3

    Returns:
        Bytes containing the file data
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_S3_BUCKET_NAME

        logger.info(f"Retrieving file from S3: {s3_key}")

        # Use thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: s3_client.get_object(
                Bucket=bucket_name,
                Key=s3_key
            )
        )

        # Read the response body
        body = response['Body']
        file_content = await loop.run_in_executor(None, body.read)
        body.close()

        logger.debug(f"Read {len(file_content)} bytes from S3: {s3_key}")
        return file_content

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            logger.error(f"File not found in S3: {s3_key}")
        else:
            logger.error(f"S3 client error: {str(e)}")
        return b""
    except Exception as e:
        logger.error(f"Error in get_file_from_s3: {str(e)}")
        return b""


async def delete_file_from_s3(s3_key: str) -> bool:
    """
    Delete a file from S3 storage.

    Args:
        s3_key: The key (path) of the file in S3

    Returns:
        Boolean indicating success or failure
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_S3_BUCKET_NAME

        logger.info(f"Deleting file from S3: {s3_key}")

        # Use thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: s3_client.delete_object(
                Bucket=bucket_name,
                Key=s3_key
            )
        )

        logger.info(f"File deleted from S3: {s3_key}")
        return True

    except ClientError as e:
        logger.error(f"S3 client error during deletion: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error in delete_file_from_s3: {str(e)}")
        return False


async def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for accessing a file in S3.

    Args:
        s3_key: The key (path) of the file in S3
        expiration: URL expiration time in seconds (default 1 hour)

    Returns:
        String containing the presigned URL
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_S3_BUCKET_NAME

        logger.info(f"Generating presigned URL for S3 file: {s3_key}")

        # Use thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        presigned_url = await loop.run_in_executor(
            None,
            lambda: s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
        )

        logger.debug(f"Generated presigned URL: {presigned_url}")
        return presigned_url

    except ClientError as e:
        logger.error(f"S3 client error during URL generation: {str(e)}")
        return ""
    except Exception as e:
        logger.error(f"Error in generate_presigned_url: {str(e)}")
        return ""
