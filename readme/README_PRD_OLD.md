# DeepPurple — Project Requirements Document (PRD)

This document provides a structured and detailed specification for the DeepPurple platform. It includes functional and non-functional requirements, the underlying tech stack, and key product features. All entries follow consistent formatting to support clarity, traceability, and development readiness.

---

## Functional Requirements (FR)

| Requirement ID | Description                                            | User Story                                                                                                                                             | Expected Behaviour/Outcome                                                                          |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| FR001          | Account creation via Google authentication             | As an End-User, I want to create a DeepPurple account using Google authentication so that I can quickly sign up without managing separate credentials. | Google OAuth 2.0 triggers on click, creates account, stores ID, and redirects to the dashboard.     |
| FR002          | Sign in via Google Sign-In                             | As an End-User, I want to sign in via Google Sign-In so that I can securely access my account using single sign-on.                                    | Session token is issued and stored securely with silent refresh support.                            |
| FR003          | Sign out from portal                                   | As an End-User, I want to sign out from the portal so that I can protect my account on shared devices.                                                 | Session and refresh tokens are cleared, and the user is redirected to the landing page.             |
| FR004          | Change password                                        | As an End-User, I want to change my password so that I can maintain control over my account security.                                                  | Password form validates current and new passwords, then updates credentials and confirms via email. |
| FR005          | Update profile picture                                 | As an End-User, I want to update my profile picture so that my account reflects my identity.                                                           | Client-side preview shown; server stores optimised image and updates profile.                       |
| FR006          | Delete account and data                                | As an End-User, I want to delete my account and associated data so that I can remove myself from the system.                                           | Data purge is triggered; confirmation and receipt sent via email within 24 hours.                   |
| FR007          | Create chat/analysis session                           | As an End-User, I want to create a new chat or analysis session so that I can initiate sentiment and emotion analysis on client communication.         | A unique session is created, timestamped, and prepared for interaction.                             |
| FR008          | View insights (emotions, sentiment, summaries, topics) | As an End-User, I want to view extracted insights so that I can understand the tone and content of communications.                                     | Insights are visualised using charts, tags, and summaries, updated in real time.                    |
| FR009          | Submit follow-up questions                             | As an End-User, I want to ask follow-up questions in natural language so that I can explore insights further.                                          | Questions are routed to an LLM with session context; responses include citations.                   |
| FR010          | Rename session                                         | As an End-User, I want to rename a session so that I can better organise and identify it later.                                                        | Inline editing triggers an update to both the database and UI.                                      |
| FR011          | Delete session                                         | As an End-User, I want to delete a session so that I can remove outdated or irrelevant data.                                                           | Confirmation prompt initiates deletion of session data and removal from search index.               |
| FR012          | Upload communication files                             | As an End-User, I want to upload communication files (CSV, TXT, PDF) so that I can analyse relevant data.                                              | Files are uploaded, parsed, and attached to the active session.                                     |
| FR013          | Delete uploaded files                                  | As an End-User, I want to delete uploaded files from a session so that I can replace or remove incorrect data.                                         | File is removed from storage and associated insights are retracted.                                 |
| FR014          | Global search across sessions and insights             | As an End-User, I want to search across sessions and insights so that I can quickly find relevant information.                                         | Full-text search runs against indexed records and ranks results with highlights.                    |
| FR015          | Filter sessions by emotion                             | As an End-User, I want to filter sessions by emotion so that I can analyse emotional patterns.                                                         | Filter applies emotion threshold and refreshes relevant session views.                              |
| FR016          | Archive session                                        | As an End-User, I want to archive sessions so that I can declutter my workspace without deleting them permanently.                                     | Session is marked archived and removed from default view.                                           |
| FR017          | Unarchive session                                      | As an End-User, I want to unarchive sessions so that I can restore access to them.                                                                     | Session is unarchived and returns to the active list.                                               |
| FR018          | Export session reports                                 | As an End-User, I want to export reports in text, Markdown, or PDF format so that I can share insights.                                                | Reports are generated server-side and downloaded with metadata.                                     |
| FR019          | View all registered user accounts                      | As a System Admin, I want to view all registered user accounts, so that I can monitor who is using the platform.                                       | All user accounts are listed with pagination, sorting, and filtering options.                       |
| FR020          | Update user account details                            | As a System Admin, I want to update user account details, so that I can manage account information when needed.                                        | Admin can edit user profile information, with changes immediately reflected in the system.          |
| FR021          | Deactivate user accounts                               | As a System Admin, I want to deactivate user accounts, so that I can respond to account misuse.                                                        | User account is marked as inactive, preventing login while preserving data for compliance.          |

---

## Non-Functional Requirements (NFR)

| Requirement ID | Description                       | User Story                                                                                      | Expected Behaviour/Outcome                                                 |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| NFR001         | Getting Started guide             | As an End-User, I want access to a guide so that I can onboard quickly.                         | Modal appears after login or a link is shown in the interface.             |
| NFR002         | In-app guidance and tooltips      | As an End-User, I want contextual help so that I can navigate the app without formal training.  | Tooltips and a searchable help sidebar are available.                      |
| NFR003         | Browser-based access              | As an End-User, I want to access the platform in a browser so I don't need to install anything. | Full support for Chrome, Firefox, Edge, Safari—no plugins required.        |
| NFR004         | Multi-authentication support      | As an End-User, I want flexible login options so I can use either email or Google SSO.          | Both authentication methods funnel into the same session framework.        |
| NFR005         | Performance under load            | The system must remain responsive during typical use.                                           | P95 page load <2s; insight queries <1s under 1,000 concurrent users.       |
| NFR006         | Graceful recovery                 | The system must recover gracefully from service interruptions.                                  | Retry logic and cached input ensure continuity.                            |
| NFR007         | Data durability and backups       | User data must be backed up securely with regular recovery options.                             | Encrypted daily backups stored with 30-day retention and quarterly drills. |
| NFR008         | Encryption at rest and in transit | All data must be encrypted during storage and transmission.                                     | TLS 1.3 enforced; data encrypted with KMS-managed keys.                    |

---

## Other Requirements (OR)

| Requirement ID | Description                                 | Expected Behaviour/Outcome                                                              |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| OR001          | Upload file and ask question in same prompt | File is parsed, analysed, and responded to in a single interaction.                     |
| OR002          | Ask question without uploading file         | Query bypasses file system and goes directly to the LLM.                                |
| OR003          | Upload file first, then ask later           | Uploaded file is indexed and recalled contextually for later prompts.                   |
| OR004          | Paste raw text and ask question             | Text is tokenised and processed similarly to uploaded files.                            |
| OR005          | Asynchronous processing                     | Large files are queued; users are notified upon completion.                             |
| OR006          | Auto labelling of emotions and sentiment    | Emotion and sentiment scores are computed and attached to each message.                 |
| OR007          | Insight browsing, search and filters        | Insights can be filtered by sentiment, emotion, or topic with faceted controls.         |
| OR008          | Export insights in multiple formats         | Insights are exported in Markdown, PDF, or CSV formats.                                 |
| OR009          | Secure storage and access control           | File and data access is scoped per user session with strict token validation.           |
| OR010          | Sensitive data masking                      | Personally identifiable data is redacted in summaries and exports, not in source files. |

---

## Core Product Features

| Feature            | Definition                                                  | Importance                                                         | Usage                                                     | Benefits                                                                 |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Sentiment Analysis | Identifies text polarity—positive, negative, or neutral.    | Enables contextual understanding and large-scale opinion tracking. | Applied to user feedback using rule-based and LLM models. | Scales insight generation, supports monitoring, enhances product design. |
| Emotion Detection  | Detects specific human emotions (e.g. joy, sadness, anger). | Reveals user state and supports wellbeing analytics.               | Enhances sentiment analysis with emotional granularity.   | Enables empathetic UX, dynamic responses, and emotional mapping.         |
| Text Summarisation | Produces concise summaries while retaining meaning.         | Reduces reading fatigue and aids understanding.                    | Summarises transcripts and long feedback.                 | Boosts productivity and supports quick decision-making.                  |
| Topic Modelling    | Groups content by detected themes or subjects.              | Helps organise large text datasets.                                | Applies to communication analysis for segmentation.       | Uncovers hidden patterns and thematic insights.                          |
| Syntax Analysis    | Parses sentence structure and grammar.                      | Enhances understanding of complex language.                        | Refines sentiment analysis and entity linking.            | Improves accuracy and linguistic robustness.                             |
