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

# Google ReCaptcha Authentication (setting to "" will disable ReCaptcha)
REACT_APP_RE_CAPTCHA_SECRET=""
```

> **Note** You can copy the `.env.sample` file to `.env` and update the values accordingly. `cp .env.sample .env`

2. Run the following command to start the development server:

```bash
npm run dev
```

🎉 Congratulations! You have successfully started the development server.

## Build

1. Run the following command to build the application:

```bash
npm run build
```

2. The build artifacts will be available in the `dist` directory.

<!-- # React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list -->
