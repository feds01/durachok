# Durachok Server

## Prerequisites

- Node.js (v22 or later)
- pnpm (v10 or later)
- MongoDB (v6 or later)

## MongoDB Installation

### macOS (using Homebrew)

```bash
# Install MongoDB Community Edition
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB as a service
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Ubuntu/Debian

```bash
# Import the public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add the repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

### Windows

1. Download the MongoDB Community Server installer from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Select "Complete" installation
4. Ensure "Install MongoDB as a Service" is checked
5. MongoDB will start automatically after installation

Alternatively, using winget:

```powershell
winget install MongoDB.Server
```

### Using Docker (Alternative)

If you prefer using Docker:

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7
```

## Installation

1. Copy the `.env.sample` file to `.env`:

```bash
cp .env.sample .env
```

2. Configure the environment variables in `.env`:

```bash
# Database - MongoDB connection string
# Default: mongodb://localhost:27017/db
MONGODB_URI=mongodb://localhost:27017/durachok

# Authentication - JWT secrets for token signing
# Generate secure random strings for production
JWT_SECRET_KEY=your-secret-key-here
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key-here

# Google ReCaptcha (optional for development)
RE_CAPTCHA_KEY=

# AWS S3 for user avatars (optional - falls back to local storage)
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

# Image storage mode: "s3" or "local" (default: local)
IMAGE_STORAGE=local

# Server configuration (optional)
PORT=8080
NODE_ENV=dev
APP_URL=http://localhost:8080
```

> **Note:** For local development, only `MONGODB_URI` and the JWT secrets are required. AWS and ReCaptcha settings are optional.

3. Run the following command to start the development server:

```bash
pnpm run dev
```

The server will start on `http://localhost:8080` by default.

## Development Features

### API Playground

In development mode (`NODE_ENV=dev`), the server exposes an interactive API playground powered by [tRPC Panel](https://github.com/iway1/trpc-panel).

**Access the playground at:** `http://localhost:8080/playground`

The playground allows you to:

- Browse all available tRPC procedures (queries, mutations, subscriptions)
- View input/output schemas for each procedure
- Execute API calls directly from the browser
- Test authentication flows
- Debug request/response payloads

This is useful for exploring the API without needing the web client, testing endpoints during development, and debugging issues.

### API Endpoints

The server uses [tRPC](https://trpc.io/) for type-safe API communication. All API routes are available at:

- **tRPC API:** `http://localhost:8080/api/trpc`
- **Static uploads:** `http://localhost:8080/uploads/`

## Build

1. Run the following command to build the application:

```bash
pnpm run build
```

2. The build artifacts will be available in the `dist` directory.

3. Run the production build:

```bash
NODE_ENV=production node dist/index.js
```
