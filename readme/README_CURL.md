# DeepPurple API Testing Guide with cURL

This document provides comprehensive examples of how to test the DeepPurple API endpoints using cURL commands. These commands can be copied and pasted directly into your terminal to verify that the API is functioning correctly.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Session Management](#session-management)
4. [File Management](#file-management)
5. [Text Analysis](#text-analysis)
6. [Question & Answer](#question--answer)
7. [Admin Operations](#admin-operations)

## Base URL

For local development, the API is available at:

```
http://localhost:8000
```

For production, the API is available at your deployed domain.

## Authentication

### Register a New User

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "Test User",
    "is_admin": false
  }'
```

### Login (Get Access Token)

```bash
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=Password123"
```

Response will include an access token that you'll need for subsequent requests:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User Profile

```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout (Blacklist Token)

```bash
curl -X POST http://localhost:8000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Google Authentication

```bash
curl -X POST http://localhost:8000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token_id": "GOOGLE_TOKEN_ID"
  }'
```

## User Management

### Get User Profile

```bash
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update User Profile

```bash
curl -X PUT http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "profile_picture": "https://example.com/profile.jpg"
  }'
```

### Update Profile Picture

```bash
curl -X PUT http://localhost:8000/users/me/profile-picture \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/profile.jpg"
```

### Change Password

```bash
curl -X PUT http://localhost:8000/users/me/password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Password123",
    "new_password": "NewPassword123"
  }'
```

### Delete User Account

```bash
curl -X DELETE http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Session Management

### Create a New Session

```bash
curl -X POST http://localhost:8000/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Analysis Session"
  }'
```

### List All Sessions

```bash
curl -X GET "http://localhost:8000/sessions?skip=0&limit=10&archived=false" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get a Specific Session

```bash
curl -X GET http://localhost:8000/sessions/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update a Session

```bash
curl -X PATCH http://localhost:8000/sessions/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Session Name",
    "is_archived": true
  }'
```

### Delete a Session

```bash
curl -X DELETE http://localhost:8000/sessions/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Files in a Session

```bash
curl -X GET http://localhost:8000/sessions/1/files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Insights in a Session

```bash
curl -X GET http://localhost:8000/sessions/1/insights \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Questions in a Session

```bash
curl -X GET http://localhost:8000/sessions/1/questions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Global Search Across Sessions

```bash
curl -X GET "http://localhost:8000/sessions/search?query=important" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Filter Sessions by Emotion

```bash
curl -X GET "http://localhost:8000/sessions/filter/emotion?emotion=joy&min_score=0.5" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Export Session Report

```bash
curl -X GET "http://localhost:8000/sessions/1/export?format=markdown" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o "session_report.md"
```

Available formats: `markdown`, `pdf`, `csv`

## File Management

### Upload a File to a Session

```bash
curl -X POST http://localhost:8000/files \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/document.txt" \
  -F "session_id=1"
```

### Get File Details

```bash
curl -X GET "http://localhost:8000/files/1?include_content=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Delete a File

```bash
curl -X DELETE http://localhost:8000/files/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get File Download URL

```bash
curl -X GET http://localhost:8000/files/1/download-url \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Text Analysis

### Analyze Raw Text

```bash
curl -X POST http://localhost:8000/analysis/text \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "text": "I am very happy with the service provided. The team was responsive and professional."
  }'
```

### Analyze a File

```bash
curl -X POST http://localhost:8000/analysis/files/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test Analysis (Mock Data)

```bash
curl -X POST http://localhost:8000/analysis/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test message."
  }'
```

## Question & Answer

### Ask a Question About Session Content

```bash
curl -X POST http://localhost:8000/analysis/question \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "question": "What is the main sentiment in these documents?",
    "history_limit": 5
  }'
```

### Stream a Question Answer

```bash
curl -X POST http://localhost:8000/analysis/question/stream \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "question": "What is the main sentiment in these documents?",
    "history_limit": 5
  }'
```

### Test Question Answering (Mock Data)

```bash
curl -X POST http://localhost:8000/analysis/test-question \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main sentiment?"
  }'
```

### Ask a Question with File Upload

```bash
curl -X POST http://localhost:8000/analysis/question/with-file \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/document.txt" \
  -F "session_id=1" \
  -F "question=What is the main sentiment in this document?"
```

## Admin Operations

### List All Users (Admin Only)

```bash
curl -X GET "http://localhost:8000/admin/users?skip=0&limit=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Get User Details (Admin Only)

```bash
curl -X GET http://localhost:8000/admin/users/1 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Update User (Admin Only)

```bash
curl -X PUT http://localhost:8000/admin/users/1 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated User Name",
    "is_active": true,
    "is_admin": false
  }'
```

### Deactivate User (Admin Only)

```bash
curl -X PUT http://localhost:8000/admin/users/1/deactivate \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Activate User (Admin Only)

```bash
curl -X PUT http://localhost:8000/admin/users/1/activate \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## Health Check and API Information

### API Root Endpoint

```bash
curl -X GET http://localhost:8000/
```

### Health Check

```bash
curl -X GET http://localhost:8000/health
```

## Tips for Using These Commands

1. Replace `YOUR_ACCESS_TOKEN` with the actual token received from the login endpoint.
2. For admin operations, use an admin user's token.
3. Replace file paths (e.g., `/path/to/document.txt`) with actual file paths on your system.
4. Replace IDs (e.g., `session_id=1`) with actual IDs from your system.
5. For production use, replace `http://localhost:8000` with your actual API URL.

## Troubleshooting

If you encounter issues with these commands, check the following:

1. Ensure the API server is running and accessible.
2. Verify that your access token is valid and not expired.
3. Check that the content type headers match the data you're sending.
4. For file uploads, ensure the file exists at the specified path.
5. For admin operations, verify that your user has admin privileges.
