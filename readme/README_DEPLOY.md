# README_DEPLOY.md

## Overview

This guide explains how to deploy:
- The frontend (Next.js in `client/`) to AWS Amplify.
- The backend (Dockerized API in `server/`) to AWS Elastic Beanstalk.
All steps use AWS Free Tier and are performed from the terminal using AWS CLI tools.

---

## 1. Prerequisites

Before starting, ensure you have:
- An AWS account with Free Tier enabled.
- AWS CLI, Amplify CLI, and EB CLI installed:
  ```sh
  # AWS CLI
  pip install awscli --upgrade --user

  # Amplify CLI (Node.js required)
  npm install -g @aws-amplify/cli

  # Elastic Beanstalk CLI
  pip install awsebcli --upgrade --user
  ```

- Docker installed locally (for building/testing containers).
- Git installed and a GitHub (or similar) repository for your code.

---

## 2. Project Structure

Your codebase should look like:
```
/project-root
  /client      # Next.js frontend
  /server      # Backend API (Dockerized)
  docker-compose.yml
  README_DEPLOY.md
```

---

## 3. Docker Compose Adjustments

**You do NOT need to split your Docker Compose file for deployment.**  
- Docker Compose is for local development only.
- For deployment:
  - Amplify does NOT use Docker; it builds Next.js directly.
  - Elastic Beanstalk uses its own Docker configuration (not Compose).

---

## 4. Deploying the Frontend to AWS Amplify

### 4.1. Prepare the Next.js App

- Ensure your frontend works locally:
  ```sh
  cd client
  npm install
  npm run build
  npm start
  ```

- Commit and push your latest code to your remote repository.

### 4.2. Configure AWS Amplify

1. **Initialize Amplify in your project directory:**
   ```sh
   cd client
   amplify configure
   amplify init
   ```

2. **Connect Amplify to your repository:**
   - Go to the AWS Amplify Console in your browser.
   - Click "New app" > "Host web app".
   - Connect your GitHub repo and select the `client` folder as the root.

3. **Set build settings:**
   - Amplify usually auto-detects Next.js.
   - If needed, edit the build settings in the Amplify Console to:
     ```yaml
     frontend:
       phases:
         preBuild:
           commands:
             - npm ci
         build:
           commands:
             - npm run build
       artifacts:
         baseDirectory: .next
         files:
           - '**/*'
       cache:
         paths:
           - node_modules/**/*
     ```

4. **Set environment variables:**
   - In the Amplify Console, add any required environment variables (e.g., `NEXT_PUBLIC_API_URL`).
   - Set the backend API URL to your Elastic Beanstalk endpoint once it’s deployed.

5. **Deploy:**
   - Amplify will automatically build and deploy the app.
   - On success, you’ll get a public URL.

---

## 5. Deploying the Backend to AWS Elastic Beanstalk

### 5.1. Prepare the Backend

- Ensure your backend works locally with Docker:
  ```sh
  cd server
  docker build -t my-backend .
  docker run -p 8000:8000 my-backend
  ```

- Commit and push your latest code.

### 5.2. Initialize Elastic Beanstalk

1. **Configure AWS CLI with your credentials:**
   ```sh
   aws configure
   ```

2. **Initialize Elastic Beanstalk:**
   ```sh
   cd server
   eb init
   # Choose region (e.g., ap-southeast-1)
   # Select "Docker" as the platform
   ```

3. **Create an environment and deploy:**
   ```sh
   eb create my-backend-env --instance_type t2.micro
   eb deploy
   ```

4. **Set environment variables:**
   ```sh
   eb setenv VAR_NAME=value
   # For example:
   eb setenv DEPLOYMENT_ENV=production
   ```

5. **Open the deployed API:**
   ```sh
   eb open
   # Note the public URL (e.g., http://my-backend-env.ap-southeast-1.elasticbeanstalk.com)
   ```

6. **Update frontend API URL:**
   - Go back to Amplify Console and update `NEXT_PUBLIC_API_URL` to point to your backend’s public URL.
   - Redeploy frontend if needed.

---

## 6. Best Practices & Tips

- **Free Tier:** Use `t2.micro` for Beanstalk and monitor usage to avoid charges.
- **Networking:** Ensure your backend security group allows inbound traffic on the required port (default: 8000 or 80).
- **Environment Variables:** Never hardcode secrets; use Amplify and Beanstalk’s environment variable features.
- **Monitoring:** Use AWS Console to monitor build/deploy status and logs.
- **Testing:** After deployment, test both endpoints and ensure the frontend can reach the backend.

---

## 7. Troubleshooting

- **Build errors:** Check logs in Amplify/Beanstalk Console.
- **CORS issues:** Ensure your backend allows requests from your Amplify domain.
- **Environment variables:** Double-check spelling and values in both Amplify and Beanstalk.

---

## 8. Cleanup

To avoid charges, delete unused environments:
```sh
# For Elastic Beanstalk
eb terminate my-backend-env

# For Amplify
# Delete the app from the Amplify Console
```

---

## 9. Resources

- [AWS Amplify CLI Docs](https://docs.amplify.aws/gen1/react/tools/cli/start/set-up-cli/)
- [Deploying Next.js to Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [Elastic Beanstalk CLI Docs](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install-osx.html)
- [Elastic Beanstalk Docker Deploy Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker_v2config.html)

