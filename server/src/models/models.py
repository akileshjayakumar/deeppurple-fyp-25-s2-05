from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class User(Base):
    """
    User model for authentication and profile information.

    This model stores user account data including authentication details
    (email and password), profile information, and account status.
    It serves as the parent model for all user-specific data.

    Fields:
        id: Unique identifier for the user
        email: User's email address (used as username for login)
        hashed_password: Securely hashed password
        full_name: User's full name
        profile_picture: URL or path to user's profile picture
        is_active: Account status flag (active/inactive)
        is_admin: Admin status flag (admin privileges)
        created_at: Timestamp when the account was created
        updated_at: Timestamp when the account was last updated

    Relationships:
        sessions: One-to-many relationship with Session model
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    profile_picture = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """
    Analysis session that contains uploads and results.

    This model represents a container for analysis activities. Each session
    belongs to a user and can contain multiple files, insights generated from
    those files, and questions asked by the user about the content.

    Fields:
        id: Unique identifier for the session
        name: User-defined name for the session
        user_id: Reference to the user who owns this session
        is_archived: Flag indicating if the session is archived (hidden from default views)
        created_at: Timestamp when the session was created
        updated_at: Timestamp when the session was last updated

    Relationships:
        user: Many-to-one relationship with User model
        files: One-to-many relationship with File model
        insights: One-to-many relationship with Insight model
        questions: One-to-many relationship with Question model
    """
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")
    files = relationship("File", back_populates="session",
                         cascade="all, delete-orphan")
    insights = relationship(
        "Insight", back_populates="session", cascade="all, delete-orphan")
    questions = relationship(
        "Question", back_populates="session", cascade="all, delete-orphan")

    # Helper methods
    def get_all_file_contents(self):
        """Get all file contents for this session using direct relationship navigation.

        This avoids join issues when querying file contents directly.

        Returns:
            List of FileContent objects for all files in this session.
        """
        contents = []
        for file in self.files:
            if file.contents:
                contents.append(file.contents)
        return contents


class File(Base):
    """
    Uploaded file metadata.

    This model stores metadata about files uploaded by users for analysis.
    The actual file content is stored in S3, while the extracted text content
    is stored in the associated FileContent record.

    Fields:
        id: Unique identifier for the file
        session_id: Reference to the session this file belongs to
        filename: Original name of the uploaded file
        file_type: Type of file (CSV, TXT, PDF)
        s3_key: Path to the file in S3 storage
        file_size: Size of the file in bytes
        created_at: Timestamp when the file was uploaded

    Relationships:
        session: Many-to-one relationship with Session model
        contents: One-to-one relationship with FileContent model
    """
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # e.g., CSV, TXT, PDF
    s3_key = Column(String(512), nullable=False)  # Path in S3 storage
    file_size = Column(Integer, nullable=False)  # Size in bytes
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="files")
    contents = relationship("FileContent", back_populates="file",
                            cascade="all, delete-orphan", uselist=False)


class FileContent(Base):
    """
    Content extracted from uploaded files.

    This model stores the parsed text content extracted from uploaded files.
    It maintains a one-to-one relationship with the File model and stores
    the text that will be used for analysis.

    Fields:
        id: Unique identifier for the content record
        file_id: Reference to the file this content belongs to
        content: Extracted text content from the file
        processed_at: Timestamp when the content was extracted

    Relationships:
        file: One-to-one relationship with File model
    """
    __tablename__ = "file_contents"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"),
                     nullable=False, unique=True)
    content = Column(Text, nullable=False)  # Extracted text content
    processed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    file = relationship("File", back_populates="contents")


class Insight(Base):
    """
    Analysis insights extracted from files.

    This model stores various types of insights generated by analyzing file content.
    Insights can include sentiment analysis, emotion detection, topic extraction,
    and text summarization. The specific type is indicated by the insight_type field,
    and the structured data is stored in the value JSON field.

    Fields:
        id: Unique identifier for the insight
        session_id: Reference to the session this insight belongs to
        insight_type: Type of insight (emotion, sentiment, topic, summary)
        value: JSON-structured data containing the insight details
        created_at: Timestamp when the insight was generated

    Relationships:
        session: Many-to-one relationship with Session model
    """
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    # emotion, sentiment, topic, summary
    insight_type = Column(String(50), nullable=False)
    value = Column(JSON, nullable=False)  # Structured insight data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("Session", back_populates="insights")


class Emotion(Base):
    """
    Emotional analysis results.

    This model stores individual emotion scores detected in analyzed content.
    Each record represents a specific emotion (joy, sadness, anger, etc.) with
    a confidence score between 0 and 1.

    Fields:
        id: Unique identifier for the emotion record
        insight_id: Reference to the insight this emotion belongs to
        emotion_type: Type of emotion (joy, sadness, anger, fear, surprise, disgust)
        score: Confidence score for the emotion (0-1)

    Relationships:
        insight: Many-to-one relationship with Insight model
    """
    __tablename__ = "emotions"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"), nullable=False)
    # joy, sadness, anger, etc.
    emotion_type = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)  # 0-1 confidence score

    # Relationships
    insight = relationship("Insight")


class Question(Base):
    """
    User questions about analyzed content.

    This model stores questions asked by users about their analyzed content
    along with the generated answers. It maintains the conversation history
    within a session for context-aware question answering.

    Fields:
        id: Unique identifier for the question
        session_id: Reference to the session this question belongs to
        question_text: The text of the user's question
        answer_text: The generated answer text (null until answered)
        created_at: Timestamp when the question was asked
        answered_at: Timestamp when the question was answered

    Relationships:
        session: Many-to-one relationship with Session model
    """
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)  # Null until answered
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    answered_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    session = relationship("Session", back_populates="questions")
