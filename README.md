# Durachok

![Durachok Game table](./docs/table.png "Table")

This is the repository that contains the sources to the Durachok game server, game client and the
library that is shared between the two.

## Structure

The repository is structured as follows:

- `apps/web` - The client for the game, a React application that serves as the client for the game.
- `apps/server` - The server for the game, a Node.js application that serves as the server for the game.
- `packages/engine` - The shared library for the game, a TypeScript library that contains the shared code between the client and the server.
- `packages/transport` - Shared data transport types used for communication between client and server.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v22 or later recommended)
- [pnpm](https://pnpm.io/) (v10 or later)
- [MongoDB](https://www.mongodb.com/try/download/community) (see [server README](./apps/server/README.md) for details)

## Installation

1. Install the dependencies for the repository:

```bash
pnpm install
```

2. Set up pre-commit hooks (see [Pre-commit Setup](#pre-commit-setup) below).

3. Configure the `apps/server` environment, read the [README.md](./apps/server/README.md) for more information.

4. Configure the `apps/web` environment, read the [README.md](./apps/web/README.md) for more information.

5. Run the following command to start the development server:

```bash
pnpm run dev
```

This will start the server and the client in development mode.

## Pre-commit Setup

This project uses [pre-commit](https://pre-commit.com/) to run linting, formatting, and type checking before each commit. This ensures code quality and consistency across the codebase.

### Installing pre-commit

**macOS (using Homebrew):**

```bash
brew install pre-commit
```

**Linux/macOS (using pip):**

```bash
pip install pre-commit
```

**Windows (using pip):**

```bash
pip install pre-commit
```

### Setting up the hooks

After installing pre-commit, run the following command from the repository root to install the git hooks:

```bash
pre-commit install
```

### What the hooks do

The pre-commit configuration runs three checks on staged files:

1. **oxlint** - Lints JavaScript/TypeScript files and auto-fixes issues where possible
2. **oxfmt** - Formats JavaScript/TypeScript/JSON files
3. **typecheck** - Runs TypeScript type checking via `pnpm turbo check`

### Running hooks manually

You can run the hooks manually on all files:

```bash
pre-commit run --all-files
```

Or run a specific hook:

```bash
pre-commit run oxlint --all-files
pre-commit run oxfmt --all-files
pre-commit run typecheck --all-files
```

### Skipping hooks (not recommended)

If you need to bypass the hooks for a specific commit:

```bash
git commit --no-verify -m "your message"
```

## Available Scripts

- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Run linting across all packages
- `pnpm fmt` - Format code across all packages
- `pnpm check` - Run TypeScript type checking
- `pnpm test` - Run tests across all packages
