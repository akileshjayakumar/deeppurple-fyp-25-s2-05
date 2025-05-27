# DeepPurple Setup Guide

DeepPurple is a text analysis platform that helps you understand the emotions and feelings behind written communication. Think of it as a smart assistant that can read text messages, emails, or documents and tell you whether the writer was happy, sad, angry, or expressing other emotions. This guide will help you set up and run DeepPurple on your computer.

## What You Will Need

Before starting, make sure you have these programs installed on your computer:

**Required for Easy Setup (Recommended):**

- Docker Desktop (version 20.10.0 or newer) - This packages everything you need
- Git - For downloading the project files

**Required for Manual Setup (Advanced Users):**

- Node.js (version 18.0.0 or newer) - For running the website interface
- Python (version 3.10 or newer) - For running the analysis engine
- PostgreSQL (version 14 or newer) - For storing your data

## Getting Started

### Step 1: Download the Project

First, copy the project files to your computer:

```bash
git clone https://github.com/akileshjayakumar/deeppurple-fyp-25-s2-05
cd deeppurple-fyp-25-s2-05
```

### Step 2: Set Up Your Configuration

The application needs some settings to work properly. Navigate to the server folder and rename the configuration file:

```bash
cd server
mv env_server .env
```

Open the `.env` file in a text editor and update these important settings:

- **OPENAI_API_KEY**: Add your OpenAI API key here. This is required for the text analysis to work. You can get one from https://platform.openai.com/api-keys
- **SECRET_KEY**: Change this to a secure random string for production use
- **DB_PASSWORD**: Update this if you want to change the database password

### Step 3: Choose Your Setup Method

You can run DeepPurple in two ways. We recommend the Docker method because it's easier.

## Easy Setup with Docker (Recommended)

Docker packages everything you need into containers, making setup much simpler.

### Start the Application

From the main project folder, run:

```bash
docker compose up --build
```

This command will:

- Download and set up the database
- Build and start the website (frontend) on port 3000
- Build and start the analysis engine (backend) on port 8000

### Access Your Application

Once everything is running, you can use DeepPurple by opening these links in your web browser:

- **Main Website**: http://localhost:3000 (This is where you'll do most of your work)
- **API Documentation**: http://localhost:8000/docs (Technical reference for developers)
- **API Health Check**: http://localhost:8000/health (Shows if the system is working)

### Stop the Application

When you're done using DeepPurple, stop it by pressing Ctrl+C in the terminal, then run:

```bash
docker compose down
```

To completely remove all data and start fresh:

```bash
docker compose down -v
```

## Manual Setup (Advanced Users)

If you prefer to set up each component separately, follow these steps:

### Backend Setup (Analysis Engine)

1. **Set up Python environment**

Navigate to the server folder and create a virtual environment:

```bash
cd server
python -m venv venv
```

Activate the virtual environment:

- On Windows: `venv\Scripts\activate`
- On Mac/Linux: `source venv/bin/activate`

Install the required Python packages:

```bash
pip install -r src/requirements.txt
```

2. **Start the analysis engine**

```bash
cd src
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The analysis engine will be available at http://localhost:8000

### Frontend Setup (Website Interface)

1. **Install website dependencies**

Open a new terminal window and navigate to the client folder:

```bash
cd client
npm install
```

2. **Start the website**

```bash
npm run dev
```

The website will be available at http://localhost:3000

## Understanding the Project Structure

DeepPurple is organized into several main parts:

**Client Folder (Website Interface)**

- Contains the user interface that you interact with
- Built with Next.js and React for a modern web experience
- Includes pages for login, dashboard, and analysis results

**Server Folder (Analysis Engine)**

- Contains the Python code that analyzes text
- Uses FastAPI to provide a web-based interface for the analysis
- Connects to OpenAI for advanced text understanding

**Key Features You Can Use:**

1. **User Accounts**: Create accounts and log in securely
2. **Text Analysis**: Upload files or paste text to analyze emotions and sentiment
3. **File Support**: Works with TXT, CSV, and PDF files
4. **Session Management**: Organize your analysis work into sessions
5. **Visual Results**: See your analysis results in charts and graphs
6. **Export Reports**: Download your results in different formats

## Default Login Accounts

DeepPurple creates some test accounts automatically:

**Regular User Account:**

- Email: user@example.com
- Password: password

**Admin Account (if configured):**

- Email: Set in your ADMIN_EMAIL environment variable
- Password: Set in your ADMIN_PASSWORD environment variable

## Troubleshooting Common Issues

**Problem: "Connection refused" or "Cannot connect to database"**

- Solution: Make sure Docker is running, or if using manual setup, ensure PostgreSQL is installed and running

**Problem: "OpenAI API key not found"**

- Solution: Make sure you've added your OpenAI API key to the .env file

**Problem: "Port already in use"**

- Solution: Another application might be using ports 3000 or 8000. Stop other applications or change the ports in the configuration

**Problem: Website loads but analysis doesn't work**

- Solution: Check that the backend is running on port 8000 and that your OpenAI API key is valid

## Getting Help

If you encounter issues:

1. Check the terminal output for error messages
2. Verify all required software is installed and running
3. Make sure your OpenAI API key is valid and has sufficient credits
4. Try stopping and restarting the application

## Next Steps

Once DeepPurple is running:

1. Open http://localhost:3000 in your web browser
2. Create a new account or log in with the test account
3. Create a new analysis session
4. Upload a text file or paste some text to analyze
5. Explore the emotion and sentiment analysis results

The system will analyze your text and show you insights about the emotions, sentiment (positive/negative), and key topics found in the content.
