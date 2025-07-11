// User-related interfaces
export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_picture?: string;
  is_active: boolean;
  is_admin: boolean;
  is_google:boolean;
  user_tier: string;
  created_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  profile_picture?: string;
  is_active: boolean;
  is_admin: boolean;
  user_tier: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Session-related interfaces
export interface Session {
  id: string;
  name: string;
  user_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionWithInsights extends Session {
  insights: {
    emotion_summary: EmotionSummary;
    sentiment_summary: SentimentSummary;
    topics: Topic[];
    file_count: number;
  };
}

export interface SessionListResponse {
  sessions: SessionWithInsights[];
  total: number;
}

// Analysis-related interfaces
export interface EmotionSummary {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
  dominant_emotion: string;
}

export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  overall: "positive" | "negative" | "neutral";
}

export interface Topic {
  id: string;
  name: string;
  relevance: number;
}

export interface TextAnalysisResult {
  session_id: string;
  text_id: string;
  emotions: EmotionSummary;
  sentiment: SentimentSummary;
  topics: Topic[];
  summary: string;
}

// * Visualization-related interfaces 

export interface Actor {
  /**
   * Schema for actor data in text visualization.
   */
  actor_name: string;
  sentiment_score: string;
  emotion_distribution: { [emotion: string]: number };
  key_topics: Array<{ [key: string]: any }>;
  sentiment_intensity: number;
  emotion_categories: { [category: string]: string[] };
}

export interface Overview {
  /**
   * Schema for overview data in text visualization.
   */
  sentiment_score: string;
  emotion_distribution: { [emotion: string]: number };
  key_topics: Array<{ [key: string]: any }>;
  sentiment_intensity: number;
  emotion_categories: { [category: string]: string[] };
}

export interface QuestionDataVisualization {
  /**
   * Schema for visualizing question data.
   */
  overview: Overview;
  actors?: Actor[];
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  message: ConversationMessage;
  sources?: string[];
}

// File-related interfaces
export interface FileInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  session_id: string;
  created_at: string;
  status: "processing" | "complete" | "error";
}

export interface FileListResponse {
  files: FileInfo[];
  total: number;
}

// Error interface
export interface ApiError {
  detail: string;
  status_code: number;
}
