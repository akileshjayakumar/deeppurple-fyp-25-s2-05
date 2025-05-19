from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.responses import StreamingResponse
import io
import csv
import json
import markdown2
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

from schemas import schemas
from core.auth import get_current_active_user
from core.database import get_db
from models.models import User, Session as SessionModel, File, Insight, Question, FileContent

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

    # Delete session (cascade will delete associated files, insights, and questions)
    db.delete(session)
    db.commit()

    return None


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


@router.get("/{session_id}/export")
async def export_session_report(
    session_id: int,
    format: str = "markdown",  # Options: markdown, pdf, csv
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export session report.

    This endpoint generates a report of session insights in the specified format.
    Supported formats: markdown, pdf, csv.
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

    # Get all insights for the session
    insights = db.query(Insight).filter(
        Insight.session_id == session_id
    ).order_by(Insight.created_at).all()

    # Get all questions for the session
    questions = db.query(Question).filter(
        Question.session_id == session_id
    ).order_by(Question.created_at).all()

    # Get all files for the session
    files = db.query(File).filter(
        File.session_id == session_id
    ).all()

    # Generate report based on format
    if format.lower() == "markdown":
        return export_markdown(session, insights, questions, files)
    elif format.lower() == "pdf":
        return export_pdf(session, insights, questions, files)
    elif format.lower() == "csv":
        return export_csv(session, insights, questions, files)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format. Supported formats: markdown, pdf, csv"
        )


def export_markdown(session, insights, questions, files):
    """Generate a Markdown report"""
    report = f"# Session Report: {session.name}\n\n"
    report += f"**Created on:** {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Files section
    report += "## Files\n\n"
    if files:
        for file in files:
            report += f"- {file.filename} ({file.file_type}, {file.file_size} bytes)\n"
    else:
        report += "No files uploaded.\n"

    report += "\n"

    # Insights section
    report += "## Insights\n\n"

    # Sentiment
    sentiment_insights = [i for i in insights if i.insight_type == "sentiment"]
    if sentiment_insights:
        report += "### Sentiment Analysis\n\n"
        for insight in sentiment_insights:
            sentiment = insight.value
            report += f"- **Score:** {sentiment.get('score', 'N/A')}\n"
            report += f"- **Label:** {sentiment.get('label', 'N/A')}\n"
            report += f"- **Created on:** {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Emotions
    emotion_insights = [i for i in insights if i.insight_type == "emotion"]
    if emotion_insights:
        report += "### Emotion Analysis\n\n"
        for insight in emotion_insights:
            emotions = insight.value
            report += "| Emotion | Score |\n|---------|-------|\n"
            for emotion, score in emotions.items():
                report += f"| {emotion} | {score:.2f} |\n"
            report += f"\n**Created on:** {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Topics
    topic_insights = [i for i in insights if i.insight_type == "topic"]
    if topic_insights:
        report += "### Topics\n\n"
        for insight in topic_insights:
            if "topics" in insight.value:
                topics = insight.value["topics"]
                for topic in topics:
                    report += f"- {topic}\n"
                report += f"\n**Created on:** {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Summaries
    summary_insights = [i for i in insights if i.insight_type == "summary"]
    if summary_insights:
        report += "### Summaries\n\n"
        for insight in summary_insights:
            if "summary" in insight.value:
                summary = insight.value["summary"]
                report += f"{summary}\n\n"
                report += f"**Created on:** {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Q&A section
    if questions:
        report += "## Questions & Answers\n\n"
        for question in questions:
            report += f"### Q: {question.question_text}\n\n"
            report += f"A: {question.answer_text}\n\n"
            report += f"**Asked on:** {question.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

    # Create a streaming response
    stream = io.StringIO()
    stream.write(report)
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename=session_report_{session.id}.md"}
    )


def export_pdf(session, insights, questions, files):
    """Generate a PDF report"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(
        Paragraph(f"Session Report: {session.name}", styles["Title"]))
    elements.append(Paragraph(
        f"Created on: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    # Files section
    elements.append(Paragraph("Files", styles["Heading2"]))
    if files:
        file_data = []
        file_data.append(["Filename", "Type", "Size (bytes)"])
        for file in files:
            file_data.append(
                [file.filename, file.file_type, str(file.file_size)])

        table = Table(file_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), '#CCCCCC'),
            ('TEXTCOLOR', (0, 0), (-1, 0), '#000000'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), '#FFFFFF'),
            ('GRID', (0, 0), (-1, -1), 1, '#000000')
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No files uploaded.", styles["Normal"]))

    elements.append(Spacer(1, 12))

    # Insights section
    elements.append(Paragraph("Insights", styles["Heading2"]))

    # Sentiment
    sentiment_insights = [i for i in insights if i.insight_type == "sentiment"]
    if sentiment_insights:
        elements.append(Paragraph("Sentiment Analysis", styles["Heading3"]))
        for insight in sentiment_insights:
            sentiment = insight.value
            elements.append(
                Paragraph(f"Score: {sentiment.get('score', 'N/A')}", styles["Normal"]))
            elements.append(
                Paragraph(f"Label: {sentiment.get('label', 'N/A')}", styles["Normal"]))
            elements.append(Paragraph(
                f"Created on: {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
            elements.append(Spacer(1, 12))

    # Emotions
    emotion_insights = [i for i in insights if i.insight_type == "emotion"]
    if emotion_insights:
        elements.append(Paragraph("Emotion Analysis", styles["Heading3"]))
        for insight in emotion_insights:
            emotions = insight.value
            emotion_data = [["Emotion", "Score"]]
            for emotion, score in emotions.items():
                emotion_data.append([emotion, f"{score:.2f}"])

            table = Table(emotion_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), '#CCCCCC'),
                ('TEXTCOLOR', (0, 0), (-1, 0), '#000000'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), '#FFFFFF'),
                ('GRID', (0, 0), (-1, -1), 1, '#000000')
            ]))
            elements.append(table)
            elements.append(Paragraph(
                f"Created on: {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
            elements.append(Spacer(1, 12))

    # Topics
    topic_insights = [i for i in insights if i.insight_type == "topic"]
    if topic_insights:
        elements.append(Paragraph("Topics", styles["Heading3"]))
        for insight in topic_insights:
            if "topics" in insight.value:
                topics = insight.value["topics"]
                for topic in topics:
                    elements.append(Paragraph(f"• {topic}", styles["Normal"]))
                elements.append(Paragraph(
                    f"Created on: {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
                elements.append(Spacer(1, 12))

    # Summaries
    summary_insights = [i for i in insights if i.insight_type == "summary"]
    if summary_insights:
        elements.append(Paragraph("Summaries", styles["Heading3"]))
        for insight in summary_insights:
            if "summary" in insight.value:
                summary = insight.value["summary"]
                elements.append(Paragraph(summary, styles["Normal"]))
                elements.append(Paragraph(
                    f"Created on: {insight.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
                elements.append(Spacer(1, 12))

    # Q&A section
    if questions:
        elements.append(Paragraph("Questions & Answers", styles["Heading2"]))
        for question in questions:
            elements.append(
                Paragraph(f"Q: {question.question_text}", styles["Heading4"]))
            elements.append(
                Paragraph(f"A: {question.answer_text}", styles["Normal"]))
            elements.append(Paragraph(
                f"Asked on: {question.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
            elements.append(Spacer(1, 12))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=session_report_{session.id}.pdf"}
    )


def export_csv(session, insights, questions, files):
    """Generate a CSV report"""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    # Write session info
    writer.writerow(["Session Report"])
    writer.writerow(["Name", session.name])
    writer.writerow(
        ["Created on", session.created_at.strftime('%Y-%m-%d %H:%M:%S')])
    writer.writerow([])

    # Write files
    writer.writerow(["Files"])
    writer.writerow(["Filename", "Type", "Size (bytes)"])
    for file in files:
        writer.writerow([file.filename, file.file_type, file.file_size])
    writer.writerow([])

    # Write sentiment insights
    writer.writerow(["Sentiment Analysis"])
    sentiment_insights = [i for i in insights if i.insight_type == "sentiment"]
    for insight in sentiment_insights:
        sentiment = insight.value
        writer.writerow(["Score", sentiment.get('score', 'N/A')])
        writer.writerow(["Label", sentiment.get('label', 'N/A')])
        writer.writerow(
            ["Created on", insight.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])

    # Write emotion insights
    writer.writerow(["Emotion Analysis"])
    emotion_insights = [i for i in insights if i.insight_type == "emotion"]
    for insight in emotion_insights:
        emotions = insight.value
        writer.writerow(["Emotion", "Score"])
        for emotion, score in emotions.items():
            writer.writerow([emotion, f"{score:.2f}"])
        writer.writerow(
            ["Created on", insight.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])

    # Write topic insights
    writer.writerow(["Topics"])
    topic_insights = [i for i in insights if i.insight_type == "topic"]
    for insight in topic_insights:
        if "topics" in insight.value:
            topics = insight.value["topics"]
            for topic in topics:
                writer.writerow(["Topic", topic])
            writer.writerow(
                ["Created on", insight.created_at.strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])

    # Write summary insights
    writer.writerow(["Summaries"])
    summary_insights = [i for i in insights if i.insight_type == "summary"]
    for insight in summary_insights:
        if "summary" in insight.value:
            summary = insight.value["summary"]
            writer.writerow(["Summary", summary])
            writer.writerow(
                ["Created on", insight.created_at.strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])

    # Write Q&A
    writer.writerow(["Questions & Answers"])
    for question in questions:
        writer.writerow(["Question", question.question_text])
        writer.writerow(["Answer", question.answer_text])
        writer.writerow(
            ["Asked on", question.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])

    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=session_report_{session.id}.csv"}
    )


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
