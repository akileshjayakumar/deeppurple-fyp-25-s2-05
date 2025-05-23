# DeepPurple Product Requirements Document (PRD)

This document provides a structured and detailed specification for the DeepPurple text analysis platform. It includes functional and non-functional requirements, technical specifications, and implementation details based on the current codebase architecture.

---

## Project Overview

| **Attribute**    | **Details**                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| **Project Name** | DeepPurple Text Analysis Platform                                         |
| **Version**      | 1.0.0                                                                     |
| **Last Updated** | January 2025                                                              |
| **Tech Stack**   | Next.js 15.3.2, React 19, FastAPI 0.104.0, Python 3.10, PostgreSQL/SQLite |
| **Deployment**   | AWS Elastic Beanstalk, Docker Compose                                     |
| **Repository**   | https://github.com/akileshjayakumar/deeppurple-fyp-25-s2-05               |

---

## Functional Requirements (FR)

| **Requirement ID** | **Feature**            | **Description**                           | **User Story**                                                                                                               | **Implementation Location**                                                                                                    | **Priority** | **Status**     | **Acceptance Criteria**                                                                |
| ------------------ | ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | -------------- | -------------------------------------------------------------------------------------- |
| **FR001**          | Email Authentication   | User account creation with email/password | As an End-User, I want to create a DeepPurple account using email authentication so that I can securely access the platform. | `server/src/api/auth.py:signup()` <br> `client/src/app/(auth)/signup/page.tsx`                                                 | Must         | ✅ Complete    | User can register with valid email, password validation, account creation confirmation |
| **FR002**          | User Login             | Secure login with JWT tokens              | As an End-User, I want to sign in with my credentials so that I can access my analysis sessions.                             | `server/src/api/auth.py:login_for_access_token()` <br> `client/src/app/(auth)/login/page.tsx`                                  | Must         | ✅ Complete    | JWT token issued, secure session management, redirect to dashboard                     |
| **FR003**          | User Logout            | Session termination and token cleanup     | As an End-User, I want to sign out from the portal so that I can protect my account on shared devices.                       | `server/src/api/auth.py:logout()` <br> `client/src/hooks/useAuth.tsx`                                                          | Must         | ✅ Complete    | Session tokens cleared, redirect to login page, blacklist token                        |
| **FR004**          | Password Management    | Change password functionality             | As an End-User, I want to change my password so that I can maintain control over my account security.                        | `server/src/api/users.py:change_password()` <br> `client/src/components/settings/PasswordChangeForm.tsx`                       | Should       | 🔄 In Progress | Current password verification, new password validation, bcrypt hashing                 |
| **FR005**          | Profile Picture Upload | Update user profile picture               | As an End-User, I want to update my profile picture so that my account reflects my identity.                                 | `server/src/api/users.py:update_profile_picture()` <br> `client/src/components/settings/ProfilePictureUpload.tsx`              | Could        | 🔄 In Progress | Image upload to S3, client-side preview, profile update confirmation                   |
| **FR006**          | Account Deletion       | Complete data purge                       | As an End-User, I want to delete my account and associated data so that I can remove myself from the system.                 | `server/src/api/users.py:delete_user_account()` <br> `client/src/components/settings/AccountDeletionForm.tsx`                  | Should       | 🔄 In Progress | Confirmation prompt, cascade delete all user data, email confirmation                  |
| **FR007**          | Session Creation       | Create analysis sessions                  | As an End-User, I want to create a new analysis session so that I can organize my text analysis work.                        | `server/src/api/sessions.py:create_session()` <br> `client/src/app/(dashboard)/sessions/page.tsx`                              | Must         | ✅ Complete    | Unique session ID, timestamp, user ownership, database persistence                     |
| **FR008**          | Text Analysis Results  | View sentiment, emotion, topic insights   | As an End-User, I want to view extracted insights so that I can understand the tone and content of communications.           | `server/src/utils/text_analyzer.py:analyze_text()` <br> `client/src/components/session/TextAnalysisResult.tsx`                 | Must         | ✅ Complete    | Sentiment scores, emotion detection, topic extraction, visual charts                   |
| **FR009**          | Interactive Q&A        | Ask questions about analyzed content      | As an End-User, I want to ask follow-up questions in natural language so that I can explore insights further.                | `server/src/api/text_analysis_api.py:ask_question()` <br> `client/src/components/session/ConversationPanel.tsx`                | Must         | ✅ Complete    | Natural language processing, context-aware responses, citation support                 |
| **FR010**          | Session Management     | Rename, archive, delete sessions          | As an End-User, I want to manage my sessions so that I can organize my work effectively.                                     | `server/src/api/sessions.py:update_session()` <br> `client/src/components/session/SessionHeader.tsx`                           | Should       | ✅ Complete    | Inline editing, archive/unarchive, soft delete with confirmation                       |
| **FR011**          | File Upload            | Upload TXT, CSV, PDF files                | As an End-User, I want to upload communication files so that I can analyze relevant data.                                    | `server/src/api/files.py:upload_file()` <br> `client/src/components/session/FileUpload.tsx`                                    | Must         | ✅ Complete    | File type validation, S3 storage, content extraction, progress tracking                |
| **FR012**          | File Management        | Delete uploaded files                     | As an End-User, I want to delete uploaded files from a session so that I can replace or remove incorrect data.               | `server/src/api/files.py:delete_file()` <br> `client/src/components/session/FilesList.tsx`                                     | Should       | ✅ Complete    | File removal from S3, metadata cleanup, insight retraction                             |
| **FR013**          | Global Search          | Search across sessions and insights       | As an End-User, I want to search across sessions and insights so that I can quickly find relevant information.               | `server/src/api/sessions.py:global_search()` <br> `client/src/components/dashboard/GlobalSearch.tsx`                           | Should       | 🔄 In Progress | Full-text search, result ranking, search highlights                                    |
| **FR014**          | Emotion Filtering      | Filter sessions by detected emotions      | As an End-User, I want to filter sessions by emotion so that I can analyze emotional patterns.                               | `server/src/api/sessions.py:filter_sessions_by_emotion()` <br> `client/src/app/(dashboard)/sessions/page.tsx`                  | Could        | 🔄 In Progress | Emotion threshold filters, dynamic session views                                       |
| **FR015**          | Report Export          | Export analysis reports                   | As an End-User, I want to export reports in multiple formats so that I can share insights.                                   | `server/src/api/sessions.py:export_session_report()` <br> `client/src/components/session/ExportButton.tsx`                     | Should       | ✅ Complete    | PDF, CSV, Markdown formats, comprehensive metadata                                     |
| **FR016**          | Admin User Management  | View and manage user accounts             | As a System Admin, I want to manage user accounts so that I can monitor platform usage.                                      | `server/src/api/admin.py:list_users()` <br> `client/src/app/(dashboard)/admin/page.tsx`                                        | Must         | ✅ Complete    | User listing, pagination, account activation/deactivation                              |
| **FR017**          | Real-time Analysis     | Instant file analysis with questions      | As an End-User, I want to upload a file and ask questions immediately so that I can get quick insights.                      | `server/src/api/text_analysis_api.py:ask_question_with_file()` <br> `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx` | Must         | ✅ Complete    | Single-step file upload and analysis, streaming responses                              |

---

## Non-Functional Requirements (NFR)

| **Requirement ID** | **Category**   | **Description**       | **Metric/Target**                     | **Verification Method**            | **Implementation**                          | **Priority** | **Status**     |
| ------------------ | -------------- | --------------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------- | ------------ | -------------- |
| **NFR001**         | Performance    | API Response Time     | < 2 seconds for text analysis         | Load testing with concurrent users | FastAPI async endpoints, connection pooling | Must         | ✅ Complete    |
| **NFR002**         | Performance    | File Upload Speed     | < 5 seconds for 10MB files            | File upload benchmarking           | Streaming uploads, S3 direct upload         | Must         | ✅ Complete    |
| **NFR003**         | Scalability    | Concurrent Users      | Support 1,000 concurrent users        | AWS load testing                   | Elastic Beanstalk auto-scaling              | Should       | 🔄 In Progress |
| **NFR004**         | Security       | Data Encryption       | TLS 1.3 for data in transit           | SSL certificate validation         | HTTPS enforcement, secure headers           | Must         | ✅ Complete    |
| **NFR005**         | Security       | Authentication        | JWT token-based auth with expiration  | Security audit                     | bcrypt password hashing, token blacklisting | Must         | ✅ Complete    |
| **NFR006**         | Reliability    | System Uptime         | 99.5% availability                    | Health monitoring                  | AWS health checks, auto-restart             | Should       | ✅ Complete    |
| **NFR007**         | Usability      | Browser Compatibility | Support Chrome, Firefox, Safari, Edge | Cross-browser testing              | Responsive design, progressive enhancement  | Must         | ✅ Complete    |
| **NFR008**         | Data Integrity | Backup & Recovery     | Daily automated backups               | Backup restoration testing         | PostgreSQL automated backups                | Must         | ✅ Complete    |
| **NFR009**         | Performance    | Database Connections  | 10 base connections, 20 overflow      | Connection pool monitoring         | SQLAlchemy connection pooling               | Must         | ✅ Complete    |
| **NFR010**         | Security       | Access Control        | Role-based permissions (User/Admin)   | Permission testing                 | JWT role validation, endpoint protection    | Must         | ✅ Complete    |

---

## Technical Specifications (TS)

| **Component**              | **Technology**               | **Version** | **Configuration**              | **Purpose**                          | **Dependencies**      | **Status**  |
| -------------------------- | ---------------------------- | ----------- | ------------------------------ | ------------------------------------ | --------------------- | ----------- |
| **Frontend Framework**     | Next.js                      | 15.3.2      | SSR enabled, TypeScript        | User interface and client-side logic | React 19, Node.js 18+ | ✅ Complete |
| **UI Components**          | Radix UI + Tailwind CSS      | Latest      | Custom design system           | Accessible, responsive components    | PostCSS, Autoprefixer | ✅ Complete |
| **Backend Framework**      | FastAPI                      | 0.104.0     | Async ASGI with Uvicorn        | REST API and business logic          | Python 3.10, Pydantic | ✅ Complete |
| **Database (Production)**  | PostgreSQL                   | 14+         | Connection pooling, Multi-AZ   | Persistent data storage              | AWS RDS, SQLAlchemy   | ✅ Complete |
| **Database (Development)** | SQLite                       | 3.x         | File-based storage             | Local development                    | SQLAlchemy ORM        | ✅ Complete |
| **File Storage**           | AWS S3                       | Latest      | Versioning, lifecycle policies | Secure file storage                  | boto3, presigned URLs | ✅ Complete |
| **AI/ML Processing**       | OpenAI API                   | GPT-4       | Text analysis and Q&A          | Natural language processing          | OpenAI Python SDK     | ✅ Complete |
| **Authentication**         | JWT                          | Latest      | HS256 algorithm                | Secure user sessions                 | python-jose, bcrypt   | ✅ Complete |
| **Containerization**       | Docker                       | 20.10+      | Multi-stage builds             | Development and deployment           | Docker Compose        | ✅ Complete |
| **Cloud Platform**         | AWS Elastic Beanstalk        | Latest      | Auto-scaling, load balancing   | Production hosting                   | AWS CLI, IAM roles    | ✅ Complete |
| **Monitoring**             | AWS CloudWatch               | Latest      | Logging and metrics            | System monitoring                    | AWS SDK               | ✅ Complete |
| **File Processing**        | PyPDF2, pandas, python-magic | Latest      | Content extraction             | File parsing and validation          | Python libraries      | ✅ Complete |

---

## API Endpoints Specification

| **Endpoint**         | **Method** | **Purpose**        | **Implementation**                                           | **Authentication** | **Request/Response**       |
| -------------------- | ---------- | ------------------ | ------------------------------------------------------------ | ------------------ | -------------------------- |
| `/auth/token`        | POST       | User login         | `server/src/api/auth.py:login_for_access_token()`            | None               | Form data → JWT token      |
| `/auth/signup`       | POST       | User registration  | `server/src/api/auth.py:signup()`                            | None               | JSON → User object         |
| `/auth/logout`       | POST       | User logout        | `server/src/api/auth.py:logout()`                            | JWT Required       | None → Success message     |
| `/sessions`          | GET/POST   | Session management | `server/src/api/sessions.py`                                 | JWT Required       | JSON → Session list/object |
| `/files`             | POST       | File upload        | `server/src/api/files.py:upload_file()`                      | JWT Required       | Multipart → File metadata  |
| `/analysis/text`     | POST       | Text analysis      | `server/src/api/text_analysis_api.py:analyze_text_content()` | JWT Required       | JSON → Analysis results    |
| `/analysis/question` | POST       | Q&A processing     | `server/src/api/text_analysis_api.py:ask_question()`         | JWT Required       | JSON → AI response         |
| `/admin/users`       | GET        | User management    | `server/src/api/admin.py:list_users()`                       | Admin JWT          | Query params → User list   |
| `/health`            | GET        | Health check       | `server/src/main.py`                                         | None               | None → System status       |

---

## Database Schema

| **Table**       | **Purpose**       | **Key Fields**                                  | **Relationships**                        | **Implementation**                        |
| --------------- | ----------------- | ----------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| `users`         | User accounts     | id, email, hashed_password, is_admin, user_tier | One-to-many with sessions                | `server/src/models/models.py:User`        |
| `sessions`      | Analysis sessions | id, name, user_id, created_at, is_archived      | Belongs to user, has many files/insights | `server/src/models/models.py:Session`     |
| `files`         | Uploaded files    | id, session_id, filename, file_type, s3_key     | Belongs to session, has file_contents    | `server/src/models/models.py:File`        |
| `file_contents` | Extracted text    | id, file_id, content, processing_status         | Belongs to file                          | `server/src/models/models.py:FileContent` |
| `insights`      | Analysis results  | id, session_id, insight_type, value (JSON)      | Belongs to session                       | `server/src/models/models.py:Insight`     |
| `questions`     | Q&A history       | id, session_id, question_text, answer_text      | Belongs to session                       | `server/src/models/models.py:Question`    |

---

## Core Product Features

| **Feature**            | **Definition**                                              | **Importance**                                                    | **Usage**                                                | **Benefits**                                                            | **Implementation**                  |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| **Sentiment Analysis** | Identifies text polarity (positive, negative, neutral)      | Enables contextual understanding and large-scale opinion tracking | Applied to user feedback using rule-based and LLM models | Scales insight generation, supports monitoring, enhances product design | `server/src/utils/text_analyzer.py` |
| **Emotion Detection**  | Detects specific human emotions (joy, sadness, anger, etc.) | Reveals user state and supports wellbeing analytics               | Enhances sentiment analysis with emotional granularity   | Enables empathetic UX, dynamic responses, emotional mapping             | OpenAI API integration              |
| **Text Summarization** | Produces concise summaries while retaining meaning          | Reduces reading fatigue and aids understanding                    | Summarizes transcripts and long feedback                 | Boosts productivity, supports quick decision-making                     | GPT-4 summarization                 |
| **Topic Modeling**     | Groups content by detected themes or subjects               | Helps organize large text datasets                                | Applied to communication analysis for segmentation       | Uncovers hidden patterns and thematic insights                          | AI-powered topic extraction         |
| **Interactive Q&A**    | Natural language question answering about analyzed content  | Enables deep exploration of insights                              | Users ask questions about their data in plain English    | Democratizes data analysis, improves accessibility                      | Context-aware AI responses          |

---

## Success Metrics

| **Metric**               | **Target**                      | **Measurement Method**                 | **Current Status** |
| ------------------------ | ------------------------------- | -------------------------------------- | ------------------ |
| **User Adoption**        | 100+ active users in 3 months   | User registration analytics            | 📊 Tracking        |
| **Analysis Accuracy**    | 95% sentiment analysis accuracy | Manual validation against ground truth | 📊 Tracking        |
| **System Performance**   | <2s average response time       | CloudWatch metrics                     | ✅ Meeting target  |
| **User Satisfaction**    | 4.5/5 user rating               | User feedback surveys                  | 📊 Tracking        |
| **Platform Reliability** | 99.5% uptime                    | AWS monitoring                         | ✅ Meeting target  |

---

**Legend:**

- ✅ Complete
- 🔄 In Progress
- 📋 Planned
- 📊 Tracking
