from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator
from typing import List, Dict, Optional, Any, Union

# User schemas


class UserTier(str, Enum):
    """User subscription tier options"""
    BASIC = "basic"
    PREMIUM = "premium"


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None


class UserCreate(UserBase):
    password: str
    is_admin: bool = False
    user_tier: Optional[UserTier] = UserTier.BASIC


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None
    user_tier: Optional[UserTier] = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    user_tier: UserTier
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# Admin-specific schemas
class UserListItem(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    user_tier: UserTier
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class UserList(BaseModel):
    items: List[UserListItem]
    total: int


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

# Authentication schemas


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class GoogleAuthRequest(BaseModel):
    """
    Schema for Google OAuth authentication request.

    Contains the token ID received from Google Sign-In on the client side.
    """
    token_id: str


# Session schemas


class SessionBase(BaseModel):
    name: str


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    is_archived: Optional[bool] = None


class SessionResponse(SessionBase):
    id: int
    user_id: int
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    total_count: int


class SessionMessage(BaseModel):
    """
    Schema for retrieving message history from a session.
    Matches the fields in the database Question model structure.
    """
    id: int
    session_id: int
    question_text: str
    answer_text: Optional[str] = None
    created_at: datetime
    answered_at: Optional[datetime] = None

    class Config:
        orm_mode = True  # For compatibility with SQLAlchemy models

# File schemas


class FileBase(BaseModel):
    filename: str
    file_type: str


class FileCreate(FileBase):
    session_id: int
    file_size: int
    s3_key: str


class FileResponse(FileBase):
    id: int
    session_id: int
    file_size: int
    s3_key: str
    created_at: datetime
    content: Optional[str] = None

    class Config:
        orm_mode = True

# Insight schemas


class InsightBase(BaseModel):
    insight_type: str
    value: Dict[str, Any]


class InsightCreate(InsightBase):
    session_id: int


class InsightResponse(InsightBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Emotion schemas


class EmotionBase(BaseModel):
    emotion_type: str
    score: float


class EmotionCreate(EmotionBase):
    insight_id: int


class EmotionResponse(EmotionBase):
    id: int
    insight_id: int

    class Config:
        orm_mode = True

# Question schemas


class QuestionBase(BaseModel):
    question_text: str


class QuestionCreate(QuestionBase):
    session_id: int


class QuestionUpdate(BaseModel):
    answer_text: str
    answered_at: datetime = Field(default_factory=datetime.now)


class QuestionResponse(QuestionBase):
    id: int
    session_id: int
    answer_text: Optional[str] = None
    created_at: datetime
    answered_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Analysis schemas


class TextAnalysisRequest(BaseModel):
    text: str
    session_id: Optional[int] = None


class FileAnalysisRequest(BaseModel):
    session_id: int
    file_id: int


class Topic(BaseModel):
    name: str
    id: Optional[int] = None


class AnalysisResponse(BaseModel):
    sentiment: Dict[str, Any]
    emotions: Dict[str, Any]
    topics: List[Union[str, Topic, Dict[str, str]]]
    summary: str


class QuestionRequest(BaseModel):
    session_id: int
    question: str
    history_limit: Optional[int] = 5  # Default to 5 previous Q&A pairs


class QuestionResponse(BaseModel):
    answer: str
    sources: List[str]
    # Include history in response
    conversation_history: Optional[List[Dict[str, str]]] = None

# Search result schemas


class SessionSearchResult(BaseModel):
    id: int
    name: str
    created_at: datetime
    is_archived: bool


class FileSearchResult(BaseModel):
    id: int
    filename: str
    session_id: int
    session_name: str
    file_type: str
    created_at: datetime
    matched_content: Optional[str] = None


class InsightSearchResult(BaseModel):
    id: int
    session_id: int
    session_name: str
    insight_type: str
    created_at: datetime
    matched_content: Optional[str] = None


class GlobalSearchResponse(BaseModel):
    sessions: List[SessionSearchResult]
    files: List[FileSearchResult]
    insights: List[InsightSearchResult]
