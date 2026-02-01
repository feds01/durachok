# Durachok Sever

## Installation

1. Download and install MongoDB from [here](https://www.mongodb.com/try/download/community). Make sure MongoDB is running before starting the server.

2. Configure instance to have all the required environment variables (see `.env.sample` for reference).:

```bash
# Database
MONGODB_URI=

# Authentication
JWT_SECRET_KEY=
JWT_REFRESH_SECRET_KEY=

# Google ReCaptcha
RE_CAPTCHA_KEY=

# AWS for static resources like user avatars
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

```

> **Note** You can copy the `.env.sample` file to `.env` and update the values accordingly. `cp .env.sample .env`

2. Run the following command to start the development server:

```bash
npm run dev
```

🎉 Congratulations! You have successfully started the server.

## Build

1. Run the following command to build the application:

```bash
npm run build
```

2. The build artifacts will be available in the `dist` directory.
