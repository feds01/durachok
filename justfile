# Durachok development commands. Run `just` to list them.

set positional-arguments

# Run the tools that bun installed, as package.json scripts would.
export PATH := justfile_directory() / "node_modules/.bin" + ":" + env("PATH")

# List available recipes
default:
    @just --list --unsorted

# Install the dependencies and the pre-commit hooks, and make sure MongoDB is up
setup: install && db
    #!/usr/bin/env bash
    set -euo pipefail
    command -v pre-commit >/dev/null || { echo "pre-commit not found, install it with 'brew install pre-commit' or 'pipx install pre-commit'"; exit 1; }
    # pre-commit refuses to install while core.hooksPath is set, e.g. to a global
    # dispatcher that hands off to each repo's own hooks, so clear it for the install.
    hooks_path=$(git config core.hooksPath || true)
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0= pre-commit install
    if [ -n "$hooks_path" ]; then
        echo "note: core.hooksPath is $hooks_path, so git only runs the hook if that hands off to the repo's own hooks"
    fi

# Make sure the server can reach MongoDB as a replica set, and start the local one in Docker if it isn't running, or isn't one
db:
    #!/usr/bin/env bash
    set -euo pipefail
    ping() { (cd apps/server && bun src/scripts/ping-db.ts "$@"); }
    status=0
    ping || status=$?
    # 0: it's up; 2: a remote MongoDB is down, which Docker can't fix.
    if [ "$status" -ne 1 ]; then exit "$status"; fi
    if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
        echo "error: start Docker, so that 'just db' can run MongoDB in it, or run MongoDB yourself (see apps/server/README.md)" >&2
        exit 1
    fi
    echo "Starting MongoDB in Docker..."
    docker compose up --detach --wait mongo
    ping 10000

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

# Lint, check formatting and the architecture, type check, test and build, as CI does
ci: lint fmt-check architecture typecheck test build
