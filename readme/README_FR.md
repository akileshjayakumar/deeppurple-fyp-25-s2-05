# DeepPurple Feature Implementation Guide

This document helps you understand where each feature is implemented in the DeepPurple codebase. If you're a developer or want to understand how the platform works technically, this guide shows you exactly where to find the code for each feature.

## How to Use This Guide

Each feature is organized by category and includes:

- A simple description of what the feature does
- Where to find the main code that makes it work
- Supporting files that help implement the feature
- Recent changes and updates

## User Authentication and Account Management

### Creating and Managing User Accounts

**Email-Based Account Creation**

- **What it does**: Allows new users to sign up with email and password
- **Main code location**: `server/src/api/auth.py` in the `signup()` function
- **Frontend interface**: `client/src/app/(auth)/signup/page.tsx`
- **How it works**: Users fill out a signup form, the system checks if the email is already used, then creates a secure account

**User Login**

- **What it does**: Lets existing users sign in with their credentials
- **Main code location**: `server/src/api/auth.py` in the `login_for_access_token()` function
- **Frontend interface**: `client/src/app/(auth)/login/page.tsx`
- **How it works**: Verifies email and password, then provides a secure token for accessing the platform

**User Logout**

- **What it does**: Safely signs users out and clears their session
- **Main code location**: `server/src/api/auth.py` in the `logout()` function
- **Frontend interface**: `client/src/components/dashboard/UserMenu.tsx`
- **How it works**: Removes the user's access token and redirects to the login page

**Password Management**

- **What it does**: Allows users to change their passwords for security
- **Main code location**: `server/src/api/users.py` in the `change_password()` function
- **Frontend interface**: `client/src/components/settings/PasswordChangeForm.tsx`
- **How it works**: Verifies the current password, then updates to the new one

**Profile Picture Updates**

- **What it does**: Users can upload and change their profile pictures
- **Main code location**: `server/src/api/users.py` in the `update_profile_picture()` function
- **Frontend interface**: `client/src/components/settings/ProfilePictureUpload.tsx`
- **How it works**: Uploads image files and stores them securely

**Account Deletion**

- **What it does**: Completely removes user accounts and all associated data
- **Main code location**: `server/src/api/users.py` in the `delete_user_account()` function
- **Frontend interface**: `client/src/components/settings/AccountDeletionForm.tsx`
- **How it works**: Permanently deletes all user data after confirmation

## Text Analysis Sessions

### Creating and Managing Analysis Sessions

**Create New Sessions**

- **What it does**: Users can create new workspaces for organizing their text analysis
- **Main code location**: `server/src/api/sessions.py` in the `create_session()` function
- **Frontend interface**: `client/src/app/(dashboard)/sessions/page.tsx`
- **How it works**: Creates a new session with a unique ID and timestamp

**Rename Sessions**

- **What it does**: Users can give their sessions meaningful names
- **Main code location**: `server/src/api/sessions.py` in the `update_session()` function
- **Frontend interface**: `client/src/components/session/SessionHeader.tsx`
- **How it works**: Updates the session name in the database and refreshes the interface

**Delete Sessions**

- **What it does**: Removes sessions and all their content permanently
- **Main code location**: `server/src/api/sessions.py` in the `delete_session()` function
- **Frontend interface**: `client/src/components/session/SessionMenu.tsx`
- **How it works**: Confirms deletion, then removes all session data

**Archive and Unarchive Sessions**

- **What it does**: Hide old sessions without deleting them, or restore them later
- **Main code location**: `server/src/api/sessions.py` in the `update_session()` function
- **Frontend interface**: `client/src/app/(dashboard)/sessions/page.tsx`
- **How it works**: Marks sessions as archived or active in the database

## Text Analysis and AI Features

### Core Analysis Capabilities

**Emotion and Sentiment Analysis**

- **What it does**: Analyzes text to identify emotions (joy, sadness, anger, etc.) and overall sentiment (positive/negative/neutral)
- **Main code location**: `server/src/utils/text_analyzer.py` in the `analyze_text()` function
- **Frontend display**: `client/src/components/insights/InsightsDashboard.tsx`
- **How it works**: Sends text to OpenAI's AI models, processes the response, and stores results

**Interactive Question Answering**

- **What it does**: Users can ask questions about their analyzed text in natural language
- **Main code location**: `server/src/api/text_analysis_api.py` in the `ask_question()` function
- **Frontend interface**: `client/src/components/session/ConversationPanel.tsx`
- **How it works**: Takes user questions, combines them with analyzed content, and generates AI-powered answers

**File Upload with Instant Analysis**

- **What it does**: Users can upload a file and ask questions about it in one step
- **Main code location**: `server/src/api/text_analysis_api.py` in the `ask_question_with_file()` function
- **Frontend interface**: `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`
- **How it works**: Processes the uploaded file and immediately analyzes it with the user's question

**Direct Text Analysis**

- **What it does**: Users can paste text directly and get immediate analysis without uploading files
- **Main code location**: `server/src/api/text_analysis_api.py` in the `ask_question()` function
- **Frontend interface**: `client/src/lib/api/index.ts` in the `askQuestion()` function
- **How it works**: Takes pasted text and runs it through the same analysis pipeline as uploaded files

**Automatic Emotion and Sentiment Labeling**

- **What it does**: Every piece of analyzed text automatically gets emotion and sentiment scores
- **Main code location**: `server/src/utils/text_analyzer.py` in the `analyze_text()` function
- **Backend processing**: `server/src/api/text_analysis_api.py` in the `analyze_text_content()` function
- **How it works**: AI models process text and assign numerical scores for different emotions and sentiment

## File Management

### File Upload and Processing

**File Upload System**

- **What it does**: Users can upload TXT, CSV, and PDF files for analysis
- **Main code location**: `server/src/api/files.py` in the `upload_file()` function
- **Frontend interface**: `client/src/components/session/FileUpload.tsx`
- **How it works**: Validates file types, stores files securely, and extracts text content

**File Deletion**

- **What it does**: Users can remove uploaded files from their sessions
- **Main code location**: `server/src/api/files.py` in the `delete_file()` function
- **Frontend interface**: `client/src/lib/api/index.ts` in the `deleteFile()` function
- **How it works**: Removes files from storage and deletes associated analysis results

**Upload Then Analyze Workflow**

- **What it does**: Users can upload files first, then ask questions about them later
- **Main code locations**: `server/src/api/files.py` for upload, `server/src/api/text_analysis_api.py` for analysis
- **Frontend interface**: `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`
- **How it works**: Stores uploaded files and makes them available for future analysis requests

## Search and Organization

### Finding and Filtering Content

**Global Search**

- **What it does**: Users can search across all their sessions and analysis results
- **Main code location**: `server/src/api/sessions.py` in the `global_search()` function
- **Frontend interface**: `client/src/components/dashboard/GlobalSearch.tsx`
- **How it works**: Searches through session names, file content, and analysis results

**Emotion-Based Filtering**

- **What it does**: Users can filter sessions based on the emotions detected in their content
- **Main code location**: `server/src/api/sessions.py` in the `filter_sessions_by_emotion()` function
- **Frontend interface**: `client/src/app/(dashboard)/sessions/page.tsx`
- **How it works**: Queries the database for sessions containing specific emotion scores

## Export and Reporting

### Sharing Analysis Results

**Export Session Reports**

- **What it does**: Users can download comprehensive reports of their analysis in multiple formats
- **Main code location**: `server/src/api/sessions.py` in the `export_session_report()` function
- **Frontend interface**: `client/src/components/session/ExportButton.tsx`
- **How it works**: Generates formatted reports (PDF, CSV, Markdown) containing all session insights

## Administrative Features

### User Management for Administrators

**View All Users**

- **What it does**: Administrators can see a list of all registered users
- **Main code location**: `server/src/api/admin.py` in the `list_users()` function
- **Frontend interface**: `client/src/app/(dashboard)/admin/users/page.tsx`
- **How it works**: Queries the database for all user accounts with pagination and filtering

**Update User Information**

- **What it does**: Administrators can modify user account details
- **Main code location**: `server/src/api/admin.py` in the `update_user()` function
- **Frontend interface**: `client/src/components/admin/UserEditForm.tsx`
- **How it works**: Allows admins to change user names, status, and permissions

**Activate and Deactivate Users**

- **What it does**: Administrators can enable or disable user accounts
- **Main code location**: `server/src/api/admin.py` in the `deactivate_user()` function
- **Frontend interface**: `client/src/components/admin/UserActionButtons.tsx`
- **How it works**: Changes user account status to prevent or allow login

## Real-Time Features

### Interactive User Experience

**Streaming AI Responses**

- **What it does**: AI answers appear word-by-word as they're generated, like ChatGPT
- **Main code location**: `server/src/utils/text_analyzer.py` in the `answer_question_stream()` function
- **Supporting files**: `server/src/api/text_analysis_api.py` and `client/src/lib/api/index.ts`
- **How it works**: Streams AI responses in real-time instead of waiting for complete answers

**ChatGPT-Style File Interface**

- **What it does**: Users can attach files directly in the chat interface
- **Main code location**: `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`
- **Supporting interface**: `client/src/components/session/ConversationPanel.tsx`
- **How it works**: Integrates file upload with the conversation interface for seamless interaction

## Important Technical Files

### Backend (Server-Side) Core Files

- **Text Analysis Engine**: `server/src/utils/text_analyzer.py` - The main AI processing logic
- **File Processing**: `server/src/utils/file_parsers.py` and `server/src/utils/s3.py` - Handles file uploads and storage
- **API Endpoints**: `server/src/api/text_analysis_api.py` - Main interface for analysis features

### Frontend (Client-Side) Core Files

- **API Communication**: `client/src/lib/api/index.ts` - Handles all communication with the backend
- **Chat Interface**: `client/src/components/session/ConversationPanel.tsx` - Main user interaction component
- **Session Management**: `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx` - Core session functionality