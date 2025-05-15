# DeepPurple - Functional Requirements Implementation Map

This document maps each functional requirement to its specific implementation location in the codebase. Use it to quickly find where features are implemented.

## How to Use This Map

1. Find the requirement by ID or functional category
2. Navigate to the primary implementation file and function
3. Check supporting files for related code

## Authentication & User Management

| FR ID | Description                                | Primary Implementation                             | Supporting Files                                          |
| ----- | ------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------- |
| FR001 | Account creation via Google authentication | `server/src/api/auth.py:login_with_google()`       | `client/src/components/auth/GoogleLoginButton.tsx`        |
| FR002 | Sign in via Google Sign-In                 | `server/src/api/auth.py:login_with_google()`       | `client/src/pages/login.tsx`                              |
| FR003 | Sign out from portal                       | `server/src/api/auth.py:logout()`                  | `client/src/components/dashboard/UserMenu.tsx`            |
| FR004 | Change password                            | `server/src/api/users.py:change_password()`        | `client/src/components/settings/PasswordChangeForm.tsx`   |
| FR005 | Update profile picture                     | `server/src/api/users.py:update_profile_picture()` | `client/src/components/settings/ProfilePictureUpload.tsx` |
| FR006 | Delete account and data                    | `server/src/api/users.py:delete_user_account()`    | `client/src/components/settings/AccountDeletionForm.tsx`  |

## Session Management

| FR ID | Description                  | Primary Implementation                        | Supporting Files                                  |
| ----- | ---------------------------- | --------------------------------------------- | ------------------------------------------------- |
| FR007 | Create chat/analysis session | `server/src/api/sessions.py:create_session()` | `client/src/app/(dashboard)/sessions/page.tsx`    |
| FR010 | Rename session               | `server/src/api/sessions.py:update_session()` | `client/src/components/session/SessionHeader.tsx` |
| FR011 | Delete session               | `server/src/api/sessions.py:delete_session()` | `client/src/components/session/SessionMenu.tsx`   |
| FR016 | Archive session              | `server/src/api/sessions.py:update_session()` | `client/src/app/(dashboard)/sessions/page.tsx`    |
| FR017 | Unarchive session            | `server/src/api/sessions.py:update_session()` | `client/src/app/(dashboard)/sessions/page.tsx`    |

## Content Analysis & Insights

| FR ID | Description                                            | Primary Implementation                                         | Supporting Files                                                                                                  |
| ----- | ------------------------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| FR008 | View insights (emotions, sentiment, summaries, topics) | `server/src/api/sessions.py:list_session_insights()`           | `client/src/components/insights/InsightsDashboard.tsx`                                                            |
| FR009 | Submit follow-up questions                             | `server/src/api/text_analysis_api.py:ask_question()`           | `client/src/components/session/ConversationPanel.tsx`                                                             |
| OR001 | Upload file and ask question in same prompt            | `server/src/api/text_analysis_api.py:ask_question_with_file()` | `client/src/lib/api/index.ts:askQuestionWithFile()`<br>`client/src/app/(dashboard)/sessions/[sessionId]/page.tsx` |
| OR002 | Ask question without uploading file                    | `server/src/api/text_analysis_api.py:ask_question()`           | `client/src/lib/api/index.ts:askQuestion()`                                                                       |
| OR006 | Auto labelling of emotions and sentiment               | `server/src/utils/text_analyzer.py:analyze_text()`             | `server/src/api/text_analysis_api.py:analyze_text_content()`                                                      |

## File Management

| FR ID | Description                       | Primary Implementation                                                                          | Supporting Files                                                                             |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| FR012 | Upload communication files        | `server/src/api/files.py:upload_file()`                                                         | `client/src/lib/api/index.ts:uploadFile()`<br>`client/src/components/session/FileUpload.tsx` |
| FR013 | Delete uploaded files             | `server/src/api/files.py:delete_file()`                                                         | `client/src/lib/api/index.ts:deleteFile()`                                                   |
| OR003 | Upload file first, then ask later | `server/src/api/files.py:upload_file()`<br>`server/src/api/text_analysis_api.py:ask_question()` | `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`                                   |

## Search & Filters

| FR ID | Description                                | Primary Implementation                                    | Supporting Files                                   |
| ----- | ------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------- |
| FR014 | Global search across sessions and insights | `server/src/api/sessions.py:global_search()`              | `client/src/components/dashboard/GlobalSearch.tsx` |
| FR015 | Filter sessions by emotion                 | `server/src/api/sessions.py:filter_sessions_by_emotion()` | `client/src/app/(dashboard)/sessions/page.tsx`     |

## Export

| FR ID | Description            | Primary Implementation                               | Supporting Files                                 |
| ----- | ---------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| FR018 | Export session reports | `server/src/api/sessions.py:export_session_report()` | `client/src/components/session/ExportButton.tsx` |

## Admin Functions

| FR ID | Description                       | Primary Implementation                      | Supporting Files                                    |
| ----- | --------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| FR019 | View all registered user accounts | `server/src/api/admin.py:list_users()`      | `client/src/app/(dashboard)/admin/users/page.tsx`   |
| FR020 | Update user account details       | `server/src/api/admin.py:update_user()`     | `client/src/components/admin/UserEditForm.tsx`      |
| FR021 | Deactivate user accounts          | `server/src/api/admin.py:deactivate_user()` | `client/src/components/admin/UserActionButtons.tsx` |

## Real-time Feature Implementation

| Feature               | Description                                 | Primary Implementation                                       | Supporting Files                                                                                                 |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Streaming Responses   | Token-by-token streaming for chat responses | `server/src/utils/text_analyzer.py:answer_question_stream()` | `server/src/api/text_analysis_api.py:stream_question_answer()`<br>`client/src/lib/api/index.ts:streamQuestion()` |
| ChatGPT-style File UI | File attachment in the chat interface       | `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`   | `client/src/components/session/ConversationPanel.tsx`                                                            |

## Core Files Reference

### Server-side (Backend)

- Text analysis: `server/src/utils/text_analyzer.py`
- File handling: `server/src/utils/file_parsers.py`, `server/src/utils/s3.py`
- API endpoints: `server/src/api/text_analysis_api.py`

### Client-side (Frontend)

- API client: `client/src/lib/api/index.ts`
- Chat interface: `client/src/components/session/ConversationPanel.tsx`
- Session page: `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx`

## Recent Changes

| Date       | Description                                         | Files Modified                                             |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------- |
| 2025-05-13 | Fixed imports in utils/**init**.py                  | `server/src/utils/__init__.py`                             |
| 2025-05-13 | Updated ConversationPanel UI to match ChatGPT style | `client/src/components/session/ConversationPanel.tsx`      |
| 2025-05-13 | Improved session page with file upload in chat      | `client/src/app/(dashboard)/sessions/[sessionId]/page.tsx` |
| 2025-05-12 | Consolidated text analysis functions                | `server/src/utils/text_analyzer.py`                        |
