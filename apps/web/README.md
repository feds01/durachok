# Durachok Web interface

## Installation

1. Configure instance to have all the required environment variables (see `.env.sample` for reference).:

```bash
# Application build information
REACT_APP_NAME=$npm_package_name
REACT_APP_VERSION=$npm_package_version
REACT_APP_DEV_VERSION=$npm_package_gitHead

# Build options
#GENERATE_SOURCEMAP=false

# API
REACT_APP_API_URL=

# Google reCAPTCHA's site key, the public one, for the register form ("" doesn't show it)
REACT_APP_RE_CAPTCHA_SITE_KEY=""
```

> **Note** You can copy the `.env.sample` file to `.env` and update the values accordingly. `cp .env.sample .env`

2. Run the following command to start the development server:

```bash
bun run dev
```

🎉 Congratulations! You have successfully started the development server.

## Build

1. Run the following command to build the application:

```bash
bun run build
```

2. The build artifacts will be available in the `dist` directory.
