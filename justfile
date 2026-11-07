# Durachok development commands. Run `just` to list them.

set positional-arguments

# Run the tools that bun installed, as package.json scripts would.
export PATH := justfile_directory() / "node_modules/.bin" + ":" + env("PATH")

# List available recipes
default:
    @just --list --unsorted

# Install the dependencies and the pre-commit hooks
setup: install
    @command -v pre-commit >/dev/null || { echo "pre-commit not found, install it with 'brew install pre-commit' or 'pipx install pre-commit'"; exit 1; }
    pre-commit install

# Install the dependencies from the lockfile, which also builds the internal packages
install:
    bun install --frozen-lockfile

# Start the server and the web app in development mode
dev:
    turbo dev

# Build every package and app
build:
    turbo build

# Run the tests
test:
    turbo test

# Type check every package and app
typecheck:
    turbo check

# Lint with oxlint, extra args go to it, e.g. `just lint --fix`
lint *args:
    oxlint "$@"

# Format with oxfmt, extra args go to it, e.g. `just fmt apps/web`
fmt *args:
    oxfmt "$@"

# Check formatting without changing files
fmt-check:
    oxfmt --check

# Check the architecture contracts in zenith.toml, e.g. `just architecture --tracked`
architecture *args:
    zenith check "$@"

# Regenerate the web app's socket client from the server's socket actions
socket-client:
    bun run --cwd apps/server build:client
    oxfmt apps/web/src/interface/socket-client.ts

# Lint, check formatting and the architecture, type check, test and build, as CI does
ci: lint fmt-check architecture typecheck test build
