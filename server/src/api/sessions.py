from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.responses import StreamingResponse
import io
import csv
import json
import markdown2
import pandas as pd
from datetime import datetime

from utils.sessions import markdown_to_reportlab_paragraphs, generate_chart_from_data, create_reportlab_image
from utils.logger import logger

from schemas import schemas
from core.auth import get_current_active_user
from core.database import get_db
from models.models import User, Session as SessionModel, File, Insight, Question, FileContent

# Reportlab imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER,TA_RIGHT
from reportlab.lib import colors
from reportlab.lib.units import inch

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=schemas.SessionResponse)
async def create_session(
    session_create: schemas.SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new analysis session.

    This endpoint allows the authenticated user to create a new session for analyzing
    client communications.
    """
    # Create new session
    new_session = SessionModel(
        name=session_create.name,
        user_id=current_user.id
    )

    # Add session to database
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return new_session


@router.get("", response_model=schemas.SessionListResponse)
async def list_sessions(
    skip: int = 0,
    limit: int = 10,
    archived: Optional[bool] = False,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List user's sessions.

    This endpoint returns a paginated list of the authenticated user's sessions.
    It supports filtering by archive status and text search.
    """
    # Build query
    query = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id)

    # Filter by archive status
    query = query.filter(SessionModel.is_archived == archived)

    # Apply text search if provided
    if search:
        query = query.filter(SessionModel.name.ilike(f"%{search}%"))

    # Get total count
    total_count = query.count()

    # Apply pagination
    sessions = query.order_by(SessionModel.created_at.desc()).offset(
        skip).limit(limit).all()

    return {"sessions": sessions, "total_count": total_count}


@router.get("/{session_id}", response_model=schemas.SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific session.

    This endpoint returns details for a specific session belonging to the authenticated user.
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    # Check if session exists
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return session


@router.patch("/{session_id}", response_model=schemas.SessionResponse)
async def update_session(
    session_id: int,
    session_update: schemas.SessionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a session.

    This endpoint allows the authenticated user to update a session's name or archive status.
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    # Check if session exists
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Update session fields if provided
    if session_update.name is not None:
        session.name = session_update.name

    if session_update.is_archived is not None:
        session.is_archived = session_update.is_archived

    # Commit changes to database
    db.commit()
    db.refresh(session)

    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a session.

    This endpoint allows the authenticated user to delete a session and all associated data.
    Deletion is idempotent - requesting deletion of an already deleted session will return success.
    """
    try:
        # Get session from database
        session = db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id
        ).first()

        # Check if session exists
        if not session:
            # Return success even if session doesn't exist (idempotent delete)
            return None

        # Delete session (cascade will delete associated files, insights, and questions)
        db.delete(session)
        db.commit()

        return None
    except Exception as e:
        # Roll back transaction in case of error
        db.rollback()
        # Log the error for debugging
        print(f"Error deleting session {session_id}: {str(e)}")
        # Return a 500 error with details
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )


@router.get("/{session_id}/files", response_model=List[schemas.FileResponse])
async def list_session_files(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List files in a session.

    This endpoint returns a list of files associated with a specific session.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get files for session
    files = db.query(File).filter(File.session_id == session_id).all()

    return files

# TODO: update this endpoint for the new visualization system (INSIGHTS TAB)
@router.get("/{session_id}/insights", response_model=List[schemas.InsightResponse])
async def list_session_insights(
    session_id: int,
    insight_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List insights in a session.

    This endpoint returns a list of insights associated with a specific session.
    It supports filtering by insight type.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Build query
    query = db.query(Insight).filter(Insight.session_id == session_id)

    # Filter by insight type if provided
    if insight_type:
        query = query.filter(Insight.insight_type == insight_type)

    # Get insights
    insights = query.order_by(Insight.created_at.desc()).all()

    return insights


@router.get("/{session_id}/questions", response_model=List[schemas.QuestionResponse])
async def list_session_questions(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List questions in a session.

    This endpoint returns a list of questions and answers associated with a specific session.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get questions for session
    questions = db.query(Question).filter(
        Question.session_id == session_id).order_by(Question.created_at.desc()).all()

    return questions


@router.get("/search", response_model=schemas.GlobalSearchResponse)
async def global_search(
    query: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Search across all sessions, files, and insights.

    This endpoint allows users to perform a global search across all their data.
    """
    results = {
        "sessions": [],
        "files": [],
        "insights": []
    }

    # Search sessions by name
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.name.ilike(f"%{query}%")
    ).limit(10).all()

    results["sessions"] = [
        schemas.SessionSearchResult(
            id=session.id,
            name=session.name,
            created_at=session.created_at,
            is_archived=session.is_archived
        ) for session in sessions
    ]

    # Search files by filename
    files = db.query(File).join(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        File.filename.ilike(f"%{query}%")
    ).limit(10).all()

    results["files"] = [
        schemas.FileSearchResult(
            id=file.id,
            filename=file.filename,
            session_id=file.session_id,
            session_name=file.session.name,
            file_type=file.file_type,
            created_at=file.created_at
        ) for file in files
    ]

    # Search in file contents
    file_contents = db.query(FileContent).join(File).join(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        FileContent.content.ilike(f"%{query}%")
    ).limit(10).all()

    # Add matching file contents to results
    for content in file_contents:
        file = content.file
        # Only add if not already added by filename search
        if not any(f.id == file.id for f in results["files"]):
            results["files"].append(
                schemas.FileSearchResult(
                    id=file.id,
                    filename=file.filename,
                    session_id=file.session_id,
                    session_name=file.session.name,
                    file_type=file.file_type,
                    created_at=file.created_at,
                    matched_content=content.content[:200] + "..." if len(
                        content.content) > 200 else content.content
                )
            )

    # Search in insights (summaries, topics)
    insights = db.query(Insight).join(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        Insight.insight_type.in_(["summary", "topic"]),
    ).all()

    # Filter insights that match the query
    matching_insights = []
    for insight in insights:
        insight_text = ""
        if insight.insight_type == "summary" and "summary" in insight.value:
            insight_text = insight.value["summary"]
        elif insight.insight_type == "topic" and "topics" in insight.value:
            insight_text = ", ".join(insight.value["topics"])

        if query.lower() in insight_text.lower():
            matching_insights.append(
                schemas.InsightSearchResult(
                    id=insight.id,
                    session_id=insight.session_id,
                    session_name=insight.session.name,
                    insight_type=insight.insight_type,
                    created_at=insight.created_at,
                    matched_content=insight_text[:200] +
                    "..." if len(insight_text) > 200 else insight_text
                )
            )

    results["insights"] = matching_insights[:10]  # Limit to 10 results

    return results


@router.get("/filter/emotion", response_model=schemas.SessionListResponse)
async def filter_sessions_by_emotion(
    emotion: str,
    min_score: float = 0.5,
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Filter sessions by emotion.

    This endpoint filters sessions based on detected emotions in their insights.
    The minimum score parameter sets a threshold for emotion intensity.
    """
    # Get all insights with the specified emotion type
    emotion_insights = db.query(Insight).join(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        Insight.insight_type == "emotion"
    ).all()

    # Extract session IDs with matching emotion above threshold
    session_ids = set()
    for insight in emotion_insights:
        emotions = insight.value
        if emotion in emotions and emotions[emotion] >= min_score:
            session_ids.add(insight.session_id)

    if not session_ids:
        return {"sessions": [], "total_count": 0}

    # Query sessions with matching emotions
    query = db.query(SessionModel).filter(
        SessionModel.id.in_(session_ids),
        SessionModel.user_id == current_user.id
    )

    # Get total count
    total_count = query.count()

    # Apply pagination
    sessions = query.order_by(SessionModel.created_at.desc()).offset(
        skip).limit(limit).all()

    return {"sessions": sessions, "total_count": total_count}


@router.get("/{session_id}/messages", response_model=List[schemas.SessionMessage])
async def list_session_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List messages (questions and answers) in a session.

    This endpoint returns a chronological list of messages in a session,
    including both questions asked by the user and answers provided by the system.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get questions and answers for session
    messages = db.query(Question).filter(
        Question.session_id == session_id
    ).order_by(Question.created_at.asc()).offset(skip).limit(limit).all()

    # Format the messages as question-answer pairs
    return messages


@router.get("/{session_id}/export/csv")
async def export_session_to_csv(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export session messages to CSV format.

    This endpoint allows the authenticated user to export all messages from a session
    in CSV format for download.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get messages for session
    messages = db.query(Question).filter(
        Question.session_id == session_id
    ).order_by(Question.created_at.asc()).all()

    # Convert to pandas DataFrame
    data = []
    for msg in messages:
        data.append({
            "timestamp": msg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "role": "user",
            "content": msg.question_text
        })

        # Include chart data only if available -> Visualization message
        if msg.chart_data:
            data.append({
                "timestamp": msg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "role": "assistant",
                "content": msg.chart_type + ": " + json.dumps(msg.chart_data),
            })

        elif msg.answer_text:
            data.append({
                "timestamp": msg.answered_at.strftime("%Y-%m-%d %H:%M:%S") if msg.answered_at else msg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "role": "assistant",
                "content": msg.answer_text,
            })

    df = pd.DataFrame(data)

    # Create a string buffer to store the CSV
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)

    # Generate a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"session_{session_id}_{timestamp}.csv"

    # Return the CSV as a streaming response
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{session_id}/export/md")
async def export_session_to_markdown(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export session messages to Markdown format.

    This endpoint allows the authenticated user to export all messages from a session
    in Markdown format for download.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get messages for session
    messages = db.query(Question).filter(
        Question.session_id == session_id
    ).order_by(Question.created_at.asc()).all()

    # Create markdown content
    md_content = f"# Session: {session.name}\n\n"
    md_content += f"*Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"

    for msg in messages:
        # Add user question
        md_content += f"## User ({msg.created_at.strftime('%Y-%m-%d %H:%M:%S')})\n\n"
        md_content += f"{msg.question_text}\n\n"

        # Include chart data if available
        if msg.chart_data:
            md_content += f"## Visualization: {msg.chart_type} ({msg.created_at.strftime('%Y-%m-%d %H:%M:%S')})\n\n"
            md_content += f"```json\n{json.dumps(msg.chart_data, indent=2)}\n```\n\n"
            md_content += "---\n\n"

        # Add assistant response if available
        elif msg.answer_text:
            timestamp = msg.answered_at.strftime("%Y-%m-%d %H:%M:%S") if msg.answered_at else msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            md_content += f"## Assistant ({timestamp})\n\n"
            md_content += f"{msg.answer_text}\n\n"
            md_content += "---\n\n"

    # Generate a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"session_{session_id}_{timestamp}.md"

    # Return the markdown content as a downloadable file
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{session_id}/export/pdf")
async def export_session_to_pdf(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export session messages to PDF format.

    This endpoint allows the authenticated user to export all messages from a session
    in PDF format for download.
    """
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get messages for session
    messages = db.query(Question).filter(
        Question.session_id == session_id
    ).order_by(Question.created_at.asc()).all()

    # Create a buffer for the PDF
    buffer = io.BytesIO()

    # Create the PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Custom style
    centered_style = ParagraphStyle(
        name="Centered",
        parent=styles["Normal"],
        alignment=TA_CENTER,
    )


    small_grey_right_style = ParagraphStyle(
        name="SmallGreyRight",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_RIGHT,
        spaceBefore=2,
        spaceAfter=8,
    )

    # Add title and timestamp
    title_style = styles["Title"]
    elements.append(Paragraph(f"Session: {session.name}", title_style))
    elements.append(Paragraph(f"Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", centered_style))
    elements.append(Spacer(1, 6))

    # Add conversation content
    for msg in messages:
        # Add user question
        user_question_formatted = msg.question_text.replace('\n','<br/>')
        elements.append(Paragraph("<b>User</b>", styles["Heading2"]))
        elements.append(Paragraph(user_question_formatted, styles["Normal"]))

        # Footer
        elements.append(Paragraph(msg.created_at.strftime('%Y-%m-%d %H:%M:%S'), small_grey_right_style))
        elements.append(Spacer(1, 6))


        # Include chart data if available
        if msg.chart_data:
            # Add visualization message
            elements.append(Paragraph(f"<b>Visualization: {msg.chart_type.replace('_', ' ')}</b>", styles["Heading2"]))

            # Chart
            elements.append(Spacer(1,3))
            image_bytes = generate_chart_from_data(msg.chart_data, msg.chart_type)
            elements.append(create_reportlab_image(image_bytes=image_bytes))
            elements.append(Spacer(1,3))

            # Footer
            elements.append(Paragraph(msg.created_at.strftime('%Y-%m-%d %H:%M:%S'), small_grey_right_style))
            elements.append(Spacer(1, 6))

        # Add assistant response if available
        elif msg.answer_text:
            timestamp = msg.answered_at.strftime("%Y-%m-%d %H:%M:%S") if msg.answered_at else msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            elements.append(Paragraph(f"<b>Assistant</b>", styles["Heading2"]))
            formatted_elements = markdown_to_reportlab_paragraphs(msg.answer_text, styles)
            elements.extend(formatted_elements)

            # Footer
            elements.append(Paragraph(timestamp,small_grey_right_style))
            elements.append(Spacer(1, 6))

    # Build the PDF
    doc.build(elements)

    # Get the PDF content from the buffer
    buffer.seek(0)
    pdf_content = buffer.getvalue()

    # Generate a filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"session_{session_id}_{timestamp}.pdf"

    # Return the PDF as a streaming response
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
