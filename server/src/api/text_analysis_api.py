from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import sys
import traceback
from pydantic import ValidationError
import asyncio
import io
import tempfile

from schemas import schemas
from core.auth import get_current_active_user
from core.database import get_db
from models.models import User, Session as SessionModel, File, FileContent, Insight, Question
from utils.text_analyzer import analyze_text, answer_question, answer_question_stream
from utils.logger import logger
from core.config import settings
from api.files import upload_file_to_s3, parse_file_content, SUPPORTED_MIME_TYPES, MIME_TYPE_TO_FILE_TYPE
import magic

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/text", response_model=schemas.AnalysisResponse)
async def analyze_text_content(
    request: Request,
    analysis_request: schemas.TextAnalysisRequest = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze raw text content.

    This endpoint analyzes the provided text and returns sentiment, emotions, topics, and a summary.
    If a session ID is provided, the analysis results are also stored in the database.
    """
    try:
        # Get the raw request to log for debugging
        body = await request.body()
        logger.debug(f"Raw request body: {body.decode()}")

        # Parse the request body
        try:
            if analysis_request is None:
                request_data = await request.json()
                logger.debug(f"Manual JSON parse: {request_data}")
                # Extract required fields
                session_id = request_data.get("session_id")
                text = request_data.get("text", "")
            else:
                logger.debug(f"Using Pydantic model: {analysis_request}")
                session_id = analysis_request.session_id
                text = analysis_request.text

            if not text:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Text content is required for analysis"
                )
        except Exception as e:
            logger.error(f"Error parsing request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid request format: {str(e)}"
            )

        # Verify session belongs to user
        if session_id:
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
        else:
            # If no session_id is provided, we'll still analyze the text but won't store the results
            logger.info(
                "No session_id provided, will analyze text without storing insights")
            session = None

        # Analyze the text
        logger.info(f"Beginning text analysis for user {current_user.id}")
        analysis_results = analyze_text(text)
        logger.info(f"Text analysis complete for user {current_user.id}")

        # If a session was provided, store the insights
        if session:
            logger.debug(f"Storing insights for session {session.id}")
            try:
                # Store sentiment analysis
                sentiment_value = analysis_results["sentiment"]
                if "overall" not in sentiment_value:
                    # Determine overall sentiment based on scores
                    pos = sentiment_value.get("positive", 0)
                    neg = sentiment_value.get("negative", 0)
                    neu = sentiment_value.get("neutral", 0)

                    if pos > neg and pos > neu:
                        sentiment_value["overall"] = "positive"
                    elif neg > pos and neg > neu:
                        sentiment_value["overall"] = "negative"
                    else:
                        sentiment_value["overall"] = "neutral"

                sentiment_insight = Insight(
                    session_id=session.id,
                    insight_type="sentiment",
                    value=sentiment_value
                )
                db.add(sentiment_insight)

                # Store emotion analysis
                emotion_value = analysis_results["emotions"]
                if "dominant_emotion" not in emotion_value:
                    # Find dominant emotion
                    dominant = "neutral"
                    max_score = 0
                    for emotion, score in emotion_value.items():
                        if emotion != "dominant_emotion" and score > max_score:
                            max_score = score
                            dominant = emotion

                    emotion_value["dominant_emotion"] = dominant

                emotion_insight = Insight(
                    session_id=session.id,
                    insight_type="emotion",
                    value=emotion_value
                )
                db.add(emotion_insight)

                # Store topics
                for topic_name in analysis_results["topics"]:
                    # Check if the topic is a dict or string
                    if isinstance(topic_name, dict) and "name" in topic_name:
                        topic_text = topic_name["name"]
                    else:
                        topic_text = str(topic_name)

                    topic_insight = Insight(
                        session_id=session.id,
                        insight_type="topic",
                        value={"name": topic_text}
                    )
                    db.add(topic_insight)

                # Commit all insights
                db.commit()
                logger.debug(
                    f"Insights stored successfully for session {session.id}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error storing insights: {str(e)}")
                logger.error(traceback.format_exc())
                # Continue so we can still return the analysis results

        # Return the analysis results
        return {
            "sentiment": analysis_results["sentiment"],
            "emotions": analysis_results["emotions"],
            "topics": [{"name": t} if isinstance(t, str) else t for t in analysis_results["topics"]],
            "summary": analysis_results["summary"]
        }

    except Exception as e:
        logger.error(f"Error in text analysis: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing text analysis: {str(e)}"
        )


@router.post("/files/{file_id}", response_model=schemas.AnalysisResponse)
async def analyze_file(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Analyze file content.

    This endpoint analyzes the content of a file and returns sentiment, emotions, topics, and a summary.
    The analysis results are also stored in the database.
    """
    logger.info(f"Starting file analysis for file_id {file_id}")
    # Get file from database, ensuring it belongs to the user
    file = db.query(File).join(SessionModel).filter(
        File.id == file_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not file:
        logger.warning(f"File not found: {file_id} for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Get file content
    file_content = db.query(FileContent).filter(
        FileContent.file_id == file.id).first()

    if not file_content:
        logger.warning(f"File content not found for file {file_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found"
        )

    # Analyze the content
    logger.info(f"Analyzing content for file {file.filename}")
    analysis_results = analyze_text(file_content.content)
    logger.info(f"Analysis complete for file {file.filename}")

    # Store insights
    logger.debug(f"Storing insights in session {file.session_id}")
    # Store sentiment analysis
    sentiment_insight = Insight(
        session_id=file.session_id,
        insight_type="sentiment",
        value=analysis_results["sentiment"]
    )
    db.add(sentiment_insight)

    # Store emotion analysis
    emotion_insight = Insight(
        session_id=file.session_id,
        insight_type="emotion",
        value=analysis_results["emotions"]
    )
    db.add(emotion_insight)

    # Store topics
    if analysis_results["topics"]:
        topics_insight = Insight(
            session_id=file.session_id,
            insight_type="topic",
            value={"topics": analysis_results["topics"]}
        )
        db.add(topics_insight)

    # Store summary
    summary_insight = Insight(
        session_id=file.session_id,
        insight_type="summary",
        value={"summary": analysis_results["summary"]}
    )
    db.add(summary_insight)

    db.commit()
    logger.debug(f"Successfully stored all insights for file {file.filename}")

    return analysis_results


@router.post("/question", response_model=schemas.QuestionResponse)
async def ask_question(
    question_request: schemas.QuestionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question about analyzed content.

    This endpoint takes a question and a session ID, finds all text content in the session,
    retrieves previous conversation history, and uses both as context to answer the question.
    If no files are uploaded, it will still attempt to provide helpful information based on the question.
    """
    logger.info(
        f"Processing question for session {question_request.session_id}")
    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == question_request.session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        logger.warning(
            f"Session not found: {question_request.session_id} for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get all file contents for the session to use as context
    file_contents = db.query(FileContent).join(File).filter(
        File.session_id == session.id
    ).all()

    # Get previous questions and answers for this session (conversation history)
    # Use the history_limit from the request, defaulting to 5
    history_limit = question_request.history_limit if question_request.history_limit is not None else 5

    previous_questions = db.query(Question).filter(
        Question.session_id == session.id,
        Question.answer_text.isnot(None)  # Only include answered questions
    ).order_by(Question.created_at.desc()).limit(history_limit).all()

    # Create conversation history in reverse chronological order (oldest first)
    conversation_history = [
        {"question": q.question_text, "answer": q.answer_text}
        for q in reversed(previous_questions)
    ]
    logger.debug(
        f"Found {len(conversation_history)} previous Q&A pairs for context")

    if not file_contents:
        logger.warning(f"No file contents found for session {session.id}")
        # No files uploaded, but we can still try to be helpful

        # Try to analyze the question text itself as if it were content
        try:
            # First check if the question is actually text to analyze
            if (len(question_request.question) > 30 and
                not question_request.question.endswith("?") and
                    "analyze" in question_request.question.lower()):
                # This looks like content to analyze rather than a question
                logger.info(
                    "Question appears to be text for analysis, processing as text")
                analysis_results = analyze_text(question_request.question)

                answer = f"""I've analyzed the text you provided:

Sentiment: {analysis_results["sentiment"].get("overall", "Neutral")}
- Positive: {analysis_results["sentiment"].get("positive", 0)*100:.1f}%
- Negative: {analysis_results["sentiment"].get("negative", 0)*100:.1f}%
- Neutral: {analysis_results["sentiment"].get("neutral", 0)*100:.1f}%

Dominant Emotion: {analysis_results["emotions"].get("dominant_emotion", "Neutral")}

Topics: {", ".join([t.get("name", t) if isinstance(t, dict) else t for t in analysis_results["topics"]]) if isinstance(analysis_results["topics"], list) else "None detected"}

Summary: {analysis_results["summary"]}"""
            else:
                # Try to provide a helpful response based on general sentiment analysis knowledge
                logger.info(
                    "Generating informative response about sentiment analysis")

                # Simplified context for common sentiment analysis questions
                general_context = """
                Sentiment analysis is the process of determining the emotional tone behind a series of words.
                It involves categorizing opinions in text into categories like "positive," "negative," and "neutral."
                
                Common sentiment analysis metrics include:
                - Polarity: How positive or negative the text is (usually from -1 to 1)
                - Subjectivity: How subjective or objective the text is
                - Emotion detection: Identifying emotions like joy, sadness, anger, fear
                
                Sentiment analysis uses techniques like:
                - Lexicon-based methods using dictionaries of words with sentiment scores
                - Machine learning approaches using labeled data
                - Deep learning models like BERT and transformers
                
                Applications include:
                - Brand monitoring and reputation management
                - Customer feedback analysis
                - Market research and competitive intelligence
                - Social media monitoring
                - Product review analysis
                """

                # If OpenAI is not available, provide a fallback response
                if not settings.OPENAI_API_KEY:
                    logger.warning(
                        "OpenAI API key not available, using fallback response")
                    answer = "I can help answer questions about sentiment analysis and emotion detection. To analyze text, you can either upload a file or paste your text directly in the chat."
                else:
                    try:
                        answer, _ = answer_question(
                            question_request.question,
                            general_context,
                            conversation_history
                        )
                    except Exception as e:
                        logger.error(
                            f"Error using OpenAI for question answering: {str(e)}")
                        # Fallback to a generic response
                        answer = "I can help analyze text for sentiment and emotions. You can either upload a file for analysis or enter text directly in your message."

        except Exception as e:
            logger.error(f"Error generating response without files: {str(e)}")
            logger.error(traceback.format_exc())
            answer = "I can help analyze text for sentiment and emotions. You can either upload a file for analysis or enter text directly in your message."

        # Store the question and answer
        question = Question(
            session_id=session.id,
            question_text=question_request.question,
            answer_text=answer
        )
        db.add(question)
        db.commit()

        return {
            "answer": answer,
            "sources": [],
            "conversation_history": conversation_history
        }

    # We have files, so proceed with normal processing
    # Combine all file contents into a single context
    context = "\n\n".join([fc.content for fc in file_contents])
    logger.debug(f"Combined context length: {len(context)} characters")

    # Answer the question with conversation history context
    logger.info(f"Processing question: {question_request.question[:50]}...")
    try:
        answer_text, sources = answer_question(
            question_request.question,
            context,
            conversation_history
        )

        # Ensure sources is always a valid list
        if not isinstance(sources, list):
            logger.warning(
                f"Sources is not a list: {sources}. Converting to list.")
            # If sources isn't a list, convert it to a list with one item or empty list
            if sources:
                sources = [str(sources)]
            else:
                sources = []

        logger.info(f"Question answered with {len(sources)} sources")
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        logger.error(traceback.format_exc())
        # Provide a fallback answer and empty sources list
        answer_text = f"I encountered an error processing your question about the uploaded content. Error: {str(e)}"
        sources = []

    # Store the question and answer
    question = Question(
        session_id=session.id,
        question_text=question_request.question,
        answer_text=answer_text
    )
    db.add(question)
    db.commit()
    logger.debug(f"Question and answer stored in database")

    return {
        "answer": answer_text,
        "sources": sources,
        "conversation_history": conversation_history
    }


@router.post("/question/stream")
async def stream_question_answer(
    question_request: schemas.QuestionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Stream answer to a question about analyzed content.

    This endpoint is similar to /question but streams the response token by token,
    enabling a more interactive user experience like ChatGPT.
    """
    logger.info(
        f"Processing streaming question for session {question_request.session_id}")

    # Verify session belongs to user
    session = db.query(SessionModel).filter(
        SessionModel.id == question_request.session_id,
        SessionModel.user_id == current_user.id
    ).first()

    if not session:
        logger.warning(
            f"Session not found: {question_request.session_id} for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Get all file contents for the session to use as context
    file_contents = db.query(FileContent).join(File).filter(
        File.session_id == session.id
    ).all()

    # Get previous questions and answers (conversation history)
    history_limit = question_request.history_limit if question_request.history_limit is not None else 5
    previous_questions = db.query(Question).filter(
        Question.session_id == session.id,
        Question.answer_text.isnot(None)
    ).order_by(Question.created_at.desc()).limit(history_limit).all()

    # Create conversation history in reverse chronological order (oldest first)
    conversation_history = [
        {"question": q.question_text, "answer": q.answer_text}
        for q in reversed(previous_questions)
    ]

    # Define the streaming response function
    async def generate_stream():
        complete_answer = ""

        if not file_contents:
            logger.warning(f"No file contents found for session {session.id}")
            # No files, provide a helpful response anyway
            async for token in mock_stream_response(question_request.question):
                complete_answer += token
                yield token
        else:
            # We have files, process normally
            # Combine all file contents into a single context
            context = "\n\n".join([fc.content for fc in file_contents])
            logger.debug(f"Combined context length: {len(context)} characters")
            logger.info(
                f"Streaming answer for question about {len(file_contents)} files")

            # Stream the answer
            try:
                async for token in answer_question_stream(
                    question_request.question,
                    context,
                    conversation_history
                ):
                    complete_answer += token
                    yield token
            except Exception as e:
                logger.error(f"Error streaming answer: {str(e)}")
                error_msg = f"Error: {str(e)}"
                complete_answer = error_msg
                yield error_msg

        # Store the complete question and answer after streaming is done
        try:
            question = Question(
                session_id=session.id,
                question_text=question_request.question,
                answer_text=complete_answer
            )
            db.add(question)
            db.commit()
            logger.debug(
                "Question and answer stored in database after streaming")
        except Exception as e:
            logger.error(f"Failed to store question in database: {str(e)}")

    # Helper function for mock streaming when no files are available
    async def mock_stream_response(question: str):
        intro = "I don't see any files in this session that I can reference. "
        for char in intro:
            yield char
            await asyncio.sleep(0.01)

        if "analyze" in question.lower() and len(question) > 20:
            msg = "I can analyze the text in your question instead. Would you like me to do that? Or you can upload a file for more comprehensive analysis."
        else:
            msg = "You can upload a file to analyze, or I can answer general questions about sentiment analysis and text processing."

        for char in msg:
            yield char
            await asyncio.sleep(0.01)

    # Return the streaming response
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain"
    )


@router.post("/test", response_model=dict)
async def test_analysis(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """Simple test endpoint that returns mocked data without any validation."""
    try:
        # Get raw request body to diagnose validation errors
        raw_body = await request.body()
        logger.debug(f"Raw test request body: {raw_body}")

        try:
            json_body = await request.json()
            logger.debug(f"JSON test request body: {json_body}")

            # Extract text for response
            text = json_body.get("text", "No text provided")
        except Exception as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            text = "No text provided"
            json_body = {}

        # Return data in the expected format
        logger.info("Returning mock analysis results")
        return {
            "sentiment": {"positive": 0.7, "negative": 0.1, "neutral": 0.2},
            "emotions": {
                "joy": 0.7,
                "sadness": 0.1,
                "anger": 0.05,
                "fear": 0.05,
                "surprise": 0.05,
                "disgust": 0.05
            },
            "topics": ["communication", "analysis", "testing", "development"],
            "summary": f"Analysis of your message: '{text[:30]}...'. This message appears to express positive sentiment with joy being the dominant emotion."
        }
    except Exception as e:
        logger.error(f"Error in test_analysis: {str(e)}")
        logger.debug(traceback.format_exc())
        raise


@router.post("/test-question", response_model=dict)
async def test_question(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """Simple test endpoint for question answering that returns mocked data without any validation."""
    try:
        # Get raw request body to diagnose validation errors
        raw_body = await request.body()
        logger.debug(f"Raw test question request body: {raw_body}")

        try:
            json_body = await request.json()
            logger.debug(f"JSON test question request body: {json_body}")

            # Extract question for response
            question = json_body.get("question", "No question provided")
        except Exception as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            question = "No question provided"
            json_body = {}

        # Return data in the expected format for question answering
        logger.info("Returning mock question answer")
        return {
            "answer": f"This is a mock answer to your question: '{question}'. In a real implementation, I would analyze the context and provide a detailed response based on the content.",
            "sources": ["Mock source 1", "Mock source 2", "Mock source 3"],
            "conversation_history": []
        }
    except Exception as e:
        logger.error(f"Error in test_question: {str(e)}")
        logger.debug(traceback.format_exc())
        raise


@router.post("/question/with-file", response_model=schemas.QuestionResponse)
async def ask_question_with_file(
    file: UploadFile,
    session_id: str = Form(...),
    question: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question about a file's content directly.

    This endpoint allows the user to upload a file and ask a question about it in a single request,
    similar to the ChatGPT workflow. The file is uploaded, processed, and the question is answered
    all in one step.
    """
    logger.info(
        f"Processing question with file upload for session {session_id}")

    # Verify session belongs to user
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

    # Process file upload first
    try:
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

        # Get file content as bytes
        content = await file.read()
        file_size = len(content)
        logger.debug(f"File size: {file_size} bytes")

        # Map MIME type to file type
        file_type = MIME_TYPE_TO_FILE_TYPE.get(mime_type, "txt")

        # Parse the file content directly for immediate use
        logger.debug(f"Parsing file content, type: {file_type}")
        parsed_content = parse_file_content(content, file_type)

        # Need to reset file to upload to S3
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp.write(content)
            temp_path = temp.name

        # Upload file to S3
        try:
            s3_key = upload_file_to_s3(io.BytesIO(
                content), int(session_id), file.filename)
            logger.info(f"File uploaded to S3, key: {s3_key}")

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

            # Store file content
            file_content = FileContent(
                file_id=new_file.id,
                content=parsed_content
            )
            db.add(file_content)
            db.commit()
            logger.info("File content stored successfully")

        except Exception as e:
            logger.error(f"Error storing file in database: {str(e)}")
            # Continue with analysis even if file storage fails

        # Get previous questions and answers for this session (conversation history)
        previous_questions = db.query(Question).filter(
            Question.session_id == session.id,
            Question.answer_text.isnot(None)  # Only include answered questions
        ).order_by(Question.created_at.desc()).limit(5).all()

        # Create conversation history in reverse chronological order (oldest first)
        conversation_history = [
            {"question": q.question_text, "answer": q.answer_text}
            for q in reversed(previous_questions)
        ]

        # Analyze using the parsed content immediately
        logger.info(
            f"Processing question with immediate file content: {question[:50]}...")
        try:
            answer_text, sources = answer_question(
                question,
                parsed_content,
                conversation_history
            )
            logger.info(f"Question answered")
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            logger.error(traceback.format_exc())
            answer_text = f"I encountered an error processing your question about the uploaded content. Error: {str(e)}"
            sources = []

        # Store the question and answer
        question_record = Question(
            session_id=session.id,
            question_text=question,
            answer_text=answer_text
        )
        db.add(question_record)
        db.commit()
        logger.debug(f"Question and answer stored in database")

        return {
            "answer": answer_text,
            "sources": sources,
            "conversation_history": conversation_history
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error processing question with file: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing question with file: {str(e)}"
        )
