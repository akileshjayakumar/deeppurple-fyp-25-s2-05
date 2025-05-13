import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from sqlalchemy.orm import Session
import magic
import traceback

from schemas import schemas
from core.auth import get_current_active_user
from core.database import get_db
from models.models import User, Session as SessionModel, File, FileContent
from utils.s3 import upload_file_to_s3, get_file_from_s3, delete_file_from_s3, generate_presigned_url
from utils.file_parsers import parse_file_content
from utils.logger import logger

router = APIRouter(prefix="/files", tags=["files"])

# List of supported MIME types
SUPPORTED_MIME_TYPES = [
    "text/plain",  # TXT
    "text/csv",    # CSV
    "application/csv",  # Alternative CSV
    "application/pdf",  # PDF
]

# Map MIME types to file types for storage
MIME_TYPE_TO_FILE_TYPE = {
    "text/plain": "txt",
    "text/csv": "csv",
    "application/csv": "csv",
    "application/pdf": "pdf",
}


@router.post("", response_model=schemas.FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    session_id: int = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload a file to a session.

    This endpoint allows the authenticated user to upload a file (TXT, CSV, or PDF)
    to a specific session. The file is stored in S3 and its content is parsed and 
    stored in the database for analysis.
    """
    logger.info(
        f"Starting file upload for user {current_user.id}, session {session_id}")
    try:
        # Verify session exists and belongs to user
        if not session_id:
            logger.warning("No session ID provided in upload request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session ID is required"
            )

        logger.debug(
            f"Verifying session exists: {session_id} for user {current_user.id}")
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id
        ).first()

        if not session:
            logger.warning(
                f"Session not found: {session_id} for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Read a small portion of the file to determine its MIME type
        logger.debug(f"Reading file header: {file.filename}")
        file_header = await file.read(2048)
        mime_type = magic.from_buffer(file_header, mime=True)

        # Reset file position after reading the header
        await file.seek(0)
        logger.debug(f"File MIME type: {mime_type}")

        # Check if file type is supported
        if mime_type not in SUPPORTED_MIME_TYPES:
            logger.warning(f"Unsupported file type: {mime_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {mime_type} is not supported. Supported types are TXT, CSV, and PDF."
            )

        # Get file size
        file_size = 0
        content = await file.read()
        file_size = len(content)
        logger.debug(f"File size: {file_size} bytes")

        # Reset file position
        await file.seek(0)

        # Map MIME type to file type
        file_type = MIME_TYPE_TO_FILE_TYPE.get(mime_type, "txt")

        # Upload file to S3
        logger.debug(f"Uploading file to S3, session ID: {session_id}")
        try:
            s3_key = upload_file_to_s3(file, session_id)
            logger.info(f"File uploaded to S3, key: {s3_key}")
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"File storage error: {str(e)}"
            )

        # Create file record in database
        logger.debug(f"Creating file record in database")
        new_file = File(
            session_id=session_id,
            filename=file.filename,
            file_type=file_type,
            s3_key=s3_key,
            file_size=file_size
        )

        db.add(new_file)
        db.commit()
        db.refresh(new_file)
        logger.info(f"File record created, ID: {new_file.id}")

        # Parse file content and store it
        try:
            # Get file from S3 since we've already uploaded it
            logger.debug(f"Retrieving file content from S3")
            file_content_bytes = get_file_from_s3(s3_key)

            # Parse the content based on file type
            logger.debug(f"Parsing file content, type: {file_type}")
            parsed_content = parse_file_content(file_content_bytes, file_type)

            # Store the content in the database
            logger.debug(f"Storing file content in database")
            file_content = FileContent(
                file_id=new_file.id,
                content=parsed_content
            )

            db.add(file_content)
            db.commit()
            logger.info(f"File content stored successfully")
        except Exception as e:
            # Log the error but don't fail the upload
            logger.error(f"Error parsing file content: {str(e)}")
            logger.error(traceback.format_exc())

            # Try to store at least something
            try:
                # Store error message in the content
                error_message = f"Error parsing file: {str(e)}"
                file_content = FileContent(
                    file_id=new_file.id,
                    content=error_message
                )
                db.add(file_content)
                db.commit()
                logger.info(f"Stored error message as file content")
            except Exception as inner_e:
                logger.error(f"Failed to store error message: {str(inner_e)}")

        return new_file

    except HTTPException:
        # Re-raise HTTP exceptions as is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_file: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/{file_id}", response_model=schemas.FileResponse)
async def get_file(
    file_id: int,
    include_content: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get file details.

    This endpoint returns details for a specific file, optionally including its content.
    It ensures that the file belongs to the current user by checking the session ownership.

    Args:
        file_id: The ID of the file to retrieve
        include_content: Whether to include the file content in the response
        current_user: The authenticated user from the get_current_active_user dependency
        db: Database session dependency

    Returns:
        FileResponse: The file metadata and optionally its content

    Raises:
        HTTPException: If the file doesn't exist or doesn't belong to the user
    """
    # Get file from database, ensuring it belongs to the user
    file = db.query(File).join(SessionModel).filter(
        File.id == file_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Create response with base file info
    response = schemas.FileResponse(
        id=file.id,
        session_id=file.session_id,
        filename=file.filename,
        file_type=file.file_type,
        file_size=file.file_size,
        s3_key=file.s3_key,
        created_at=file.created_at,
        content=None
    )

    # Include content if requested
    if include_content and file.contents:
        response.content = file.contents.content

    return response


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a file.

    This endpoint allows the authenticated user to delete a file from a session.
    It removes the file from both S3 storage and the database, ensuring that
    the file belongs to the current user by checking the session ownership.

    Args:
        file_id: The ID of the file to delete
        current_user: The authenticated user from the get_current_active_user dependency
        db: Database session dependency

    Returns:
        None: Returns 204 No Content on successful deletion

    Raises:
        HTTPException: If the file doesn't exist or doesn't belong to the user
    """
    # Get file from database, ensuring it belongs to the user
    file = db.query(File).join(SessionModel).filter(
        File.id == file_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Delete file from S3
    try:
        delete_file_from_s3(file.s3_key)
    except Exception as e:
        # Log the error but continue with database deletion
        logger.error(f"Error deleting file from S3: {str(e)}")

    # Delete file from database
    db.delete(file)
    db.commit()

    return None


@router.get("/{file_id}/download-url")
async def get_file_download_url(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a presigned URL to download a file.

    This endpoint generates a temporary URL that can be used to download a file directly from S3.
    It ensures that the file belongs to the current user by checking the session ownership.

    Args:
        file_id: The ID of the file to generate a download URL for
        current_user: The authenticated user from the get_current_active_user dependency
        db: Database session dependency

    Returns:
        dict: A dictionary containing the presigned download URL and its expiration time

    Raises:
        HTTPException: If the file doesn't exist or doesn't belong to the user
    """
    # Get file from database, ensuring it belongs to the user
    file = db.query(File).join(SessionModel).filter(
        File.id == file_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Generate presigned URL
    url = generate_presigned_url(file.s3_key)

    return {"download_url": url, "expires_in": 3600}
