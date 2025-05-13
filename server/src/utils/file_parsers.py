"""
File Parsing Utilities

This module handles parsing content from various file formats.
"""

from typing import Dict, Any, Optional
import os
import logging
import io
import csv
import traceback
import PyPDF2
from fastapi import HTTPException

# Setup logging
logger = logging.getLogger(__name__)


def parse_txt_file(content: bytes) -> str:
    """
    Parse a text file and return its content as a string.

    Args:
        content (bytes): The file content as bytes

    Returns:
        str: The file content as a string
    """
    try:
        return content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            # Try a different encoding if utf-8 fails
            return content.decode('latin-1')
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decode text file: {str(e)}"
            )


def parse_csv_file(content: bytes) -> str:
    """
    Parse a CSV file and convert it to a string representation.

    Args:
        content (bytes): The file content as bytes

    Returns:
        str: The CSV content as a formatted string
    """
    try:
        # Create a text stream from bytes
        text_stream = io.StringIO(content.decode('utf-8'))

        # Read the CSV
        csv_reader = csv.reader(text_stream)

        # Convert the CSV to a list of rows
        rows = list(csv_reader)

        # If the CSV is empty, return an empty string
        if not rows:
            return ""

        # Format the CSV as a string (tab-separated for easier reading)
        formatted_text = []
        for row in rows:
            formatted_text.append("\t".join(row))

        return "\n".join(formatted_text)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse CSV file: {str(e)}"
        )


def parse_pdf_file(content: bytes) -> str:
    """
    Extract text from a PDF file.

    Args:
        content (bytes): The file content as bytes

    Returns:
        str: The extracted text from the PDF
    """
    try:
        # Create a binary stream from bytes
        pdf_stream = io.BytesIO(content)

        # Create a PDF reader
        pdf_reader = PyPDF2.PdfReader(pdf_stream)

        # Extract text from each page
        text = ""
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n\n"

        return text
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse PDF file: {str(e)}"
        )


def parse_file_content(content: bytes, file_type: str) -> str:
    """
    Parse content from file bytes based on its type.

    This function extracts content from binary file data based on the given file type.
    Supported file types include PDF, CSV, and TXT.

    Args:
        content: Binary file content as bytes
        file_type: File type (e.g., 'pdf', 'csv', 'txt')

    Returns:
        Extracted text content as a string

    Raises:
        HTTPException: If the file type is unsupported or file cannot be parsed
    """
    try:
        logger.info(f"Parsing file content of type {file_type}")

        # Check if content is empty
        if not content or len(content) == 0:
            logger.warning("Empty file content received")
            return "This file appears to be empty. Please upload a file with content to analyze."

        # Parse based on file type
        if file_type.lower() == 'txt':
            logger.debug("Parsing TXT file")
            parsed_content = parse_txt_file(content)
            if not parsed_content or not parsed_content.strip():
                return "This file appears to be empty. Please upload a file with content to analyze."
            logger.info(
                f"Successfully parsed TXT file: {len(parsed_content)} characters")
            return parsed_content
        elif file_type.lower() == 'csv':
            logger.debug("Parsing CSV file")
            parsed_content = parse_csv_file(content)
            if not parsed_content or not parsed_content.strip():
                return "This CSV file appears to be empty. Please upload a file with content to analyze."
            logger.info(
                f"Successfully parsed CSV file: {len(parsed_content)} characters")
            return parsed_content
        elif file_type.lower() == 'pdf':
            logger.debug("Parsing PDF file")
            parsed_content = parse_pdf_file(content)
            if not parsed_content or not parsed_content.strip():
                return "This PDF file appears to be empty. Please upload a file with content to analyze."
            logger.info(
                f"Successfully parsed PDF file: {len(parsed_content)} characters")
            return parsed_content
        else:
            logger.warning(f"Unsupported file type: {file_type}")
            return f"File content extraction not supported for {file_type} files. Please use TXT, CSV, or PDF formats."

    except Exception as e:
        logger.error(f"Error parsing file content: {str(e)}")
        logger.error(traceback.format_exc())
        return f"Error parsing file: {str(e)}. Please check the file content and try again."
