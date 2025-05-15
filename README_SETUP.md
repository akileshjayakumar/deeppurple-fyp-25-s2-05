# DeepPurple - Text Analysis Platform

DeepPurple is a text analysis software that automates the process of analyzing client communications, deciphering the emotions they express, and providing a deep understanding of what they are saying and how they feel. This solution is designed to scale to millions of communications and customers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Environment Setup](#environment-setup)
  - [Docker Setup](#docker-setup)
  - [Manual Setup](#manual-setup)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Docker](https://www.docker.com/get-started) (v20.10.0 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0.0 or higher)
- [Git](https://git-scm.com/downloads)

For manual setup:

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v8.0.0 or higher) or [Yarn](https://yarnpkg.com/) (v1.22.0 or higher)
- [Python](https://www.python.org/downloads/) (v3.10 or higher)
- [pip](https://pip.pypa.io/en/stable/installation/) (v21.0.0 or higher)
- [PostgreSQL](https://www.postgresql.org/download/) (v14 or higher)

## Getting Started

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/akileshjayakumar/deeppurple-fyp-25-s2-05
cd deeppurple-fyp-25-s2-05
```

2. **Set up environment variables**

Rename the `env_server` file in the server directory to `.env`:

```bash
cd server
mv env_server .env
```

Then, open the `.env` file and update the following values:

- `OPENAI_API_KEY`: Add your OpenAI API key (required for text analysis)
- `SECRET_KEY`: Update with a secure secret key for production environments
- `DB_PASSWORD`: Change from the default if needed


### Docker Setup

The easiest way to run DeepPurple is using Docker Compose:

1. **Start the application**

```bash
docker compose up --build
```

This command will:

- Build and start the client container on port 3000
- Build and start the server container on port 8000
- Start a PostgreSQL database container on port 5432

2. **Access the application**

Once the containers are running, you can access:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

3. **Stop the application**

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

### Manual Setup

#### Backend (Server)

1. **Set up Python environment**

```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
pip install -r src/requirements.txt
```

2. **Start the server**

```bash
cd src
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend (Client)

1. **Install dependencies**

```bash
cd client
npm install  # or yarn install
```

2. **Start the development server**

```bash
npm run dev  # or yarn dev
```

The frontend will be available at http://localhost:3000

## Development

### Project Structure

- `client/` - Next.js frontend application

  - `src/` - Source code
    - `app/` - Next.js app directory (routes and pages)
    - `components/` - React components
    - `features/` - Feature-specific components and hooks
    - `lib/` - Utilities and API clients
    - `hooks/` - Custom React hooks
    - `types/` - TypeScript type definitions

- `server/` - FastAPI backend application
  - `src/` - Source code
    - `api/` - API endpoints
    - `core/` - Core application code (config, database, auth)
    - `models/` - Database models
    - `schemas/` - Pydantic schemas
    - `utils/` - Utility functions
    - `main.py` - Application entry point

