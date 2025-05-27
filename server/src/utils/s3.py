"""
S3 Storage Utilities

This module provides functions for interacting with AWS S3 storage.
"""

import os
import boto3
import aioboto3
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
    logger.info(f"Starting S3 upload with file type: {type(file)}")
    try:
        # Create aioboto3 session for async operations
        bucket_name = settings.AWS_S3_BUCKET_NAME

        # Process the file based on its type
        if isinstance(file, UploadFile):
            original_filename = file.filename or "file.bin"
            logger.info(f"Processing UploadFile: {original_filename}, content_type: {getattr(file, 'content_type', 'unknown')}")
            
            # Read the file content directly
            try:
                file_content = await file.read()
                logger.info(f"Successfully read file content, type: {type(file_content)}, size: {len(file_content) if isinstance(file_content, bytes) else 'unknown'}")
                # Reset the file position for potential future reads
                await file.seek(0)
            except Exception as e:
                logger.error(f"Error reading file content: {str(e)}")
                raise ValueError(f"Failed to read file content: {str(e)}")
        elif isinstance(file, bytes):
            original_filename = filename or "file.bin"
            file_content = file
        elif hasattr(file, 'read'):
            original_filename = filename or "file.bin"
            read_method = getattr(file, "read", None)
            if callable(read_method):
                file_content = read_method()
            else:
                logger.error("Provided file-like object does not have a callable read method.")
                raise ValueError("Invalid file-like object for upload.")
            if hasattr(file, 'seek') and callable(file.seek):
                # Check if seek is a coroutine function
                if asyncio.iscoroutinefunction(file.seek):
                    await file.seek(0)
                else:
                    file.seek(0)
        else:
            logger.error(f"Unsupported file type for S3 upload: {type(file)}")
            raise ValueError("Unsupported file type. Must be UploadFile, bytes, or a file-like object.")

        if not file_content:
            logger.warning("Attempted to upload empty file content.")
            raise ValueError("Empty file content cannot be uploaded.")

        safe_filename = "".join(c if c.isalnum() or c in '._- ' else '_' for c in original_filename)
        unique_id = str(uuid.uuid4())
        s3_key_prefix = str(session_id) if session_id else 'general'
        s3_key = f"{s3_key_prefix}/{unique_id}_{safe_filename}"

        logger.info(f"Uploading file to S3 bucket: {bucket_name}, key: {s3_key}")

        s3_client_args = {
            'aws_access_key_id': settings.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': settings.AWS_SECRET_ACCESS_KEY,
            'region_name': settings.AWS_REGION
        }
        
        if settings.AWS_ENDPOINT_URL:
            s3_client_args['endpoint_url'] = settings.AWS_ENDPOINT_URL
            
        # Create aioboto3 session
        session = aioboto3.Session()
        
        # Ensure file_content is bytes before uploading
        if not isinstance(file_content, bytes):
            logger.warning(f"file_content is not bytes, it's {type(file_content)}. Converting if possible.")
            if asyncio.iscoroutine(file_content):
                logger.info("Awaiting coroutine to get bytes content")
                file_content = await file_content
            elif hasattr(file_content, 'read') and callable(file_content.read):
                logger.info("Reading from file-like object")
                file_content = file_content.read()
            elif isinstance(file_content, str):
                logger.info("Converting string to bytes")
                file_content = file_content.encode('utf-8')
                
        # Final check to ensure we have bytes
        if not isinstance(file_content, bytes):
            logger.error(f"Failed to convert file_content to bytes, type is {type(file_content)}")
            raise ValueError(f"Cannot upload content of type {type(file_content)} to S3")
        
        async with session.client("s3", **s3_client_args) as s3_client:
            logger.info(f"Uploading to S3 with content type: {getattr(file, 'content_type', 'application/octet-stream') if isinstance(file, UploadFile) else 'application/octet-stream'}")
            await s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=getattr(file, 'content_type', 'application/octet-stream') if isinstance(file, UploadFile) else 'application/octet-stream'
            )
        logger.info(f"File uploaded to S3 successfully: {s3_key}")
        return s3_key
    except ClientError as e:
        logger.error(f"S3 ClientError during upload: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error during S3 upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during file upload: {str(e)}")


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
