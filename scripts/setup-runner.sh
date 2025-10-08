#!/bin/bash

set -e

# Config
REPO_URL="${REPO_URL:-https://github.com/linh2206/livestream}"
RUNNER_BASE_NAME="${RUNNER_BASE_NAME:-runner}"
WORK_BASE_DIR="${WORK_BASE_DIR:-$HOME/workspace}"

# Get token from user
if [[ -z "$RUNNER_TOKEN" ]]; then
    echo "Enter your GitHub Personal Access Token:"
    read RUNNER_TOKEN
fi

# Clean token from any newlines/carriage returns
RUNNER_TOKEN=$(echo "$RUNNER_TOKEN" | tr -d '\n\r' | tr -d ' ')

if [[ -z "$RUNNER_TOKEN" ]]; then
    echo "Error: Token is required"
    exit 1
fi

# Validate token format
if [[ ! "$RUNNER_TOKEN" =~ ^ghp_[A-Za-z0-9]{36}$ ]]; then
    echo "Error: Invalid token format. Expected: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

echo "Setting up GitHub Actions runner..."

# Find next runner number
find_next_runner_number() {
    local num=1
    while [[ -d "$WORK_BASE_DIR/${RUNNER_BASE_NAME}${num}" ]]; do
        ((num++))
    done
    echo $num
}

RUNNER_NUM=$(find_next_runner_number)
RUNNER_NAME="${RUNNER_BASE_NAME}${RUNNER_NUM}"
WORK_DIR="$WORK_BASE_DIR/$RUNNER_NAME"

echo "Runner name: $RUNNER_NAME"
echo "Work directory: $WORK_DIR"

# Create work directory
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Use existing runner files only
if [[ ! -d "$WORK_BASE_DIR/actions-runner" ]]; then
    echo "Error: $WORK_BASE_DIR/actions-runner not found"
    echo "Please download runner first:"
    echo "mkdir -p $WORK_BASE_DIR/actions-runner && cd $WORK_BASE_DIR/actions-runner"
    echo "curl -L -o actions-runner-linux-x64.tar.gz https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz"
    echo "tar xzf actions-runner-linux-x64.tar.gz && rm actions-runner-linux-x64.tar.gz"
    exit 1
fi

echo "Using existing runner files..."
cp -r "$WORK_BASE_DIR/actions-runner"/* .

# Use token directly for registration
echo "Using token for runner registration..."
REG_TOKEN="$RUNNER_TOKEN"

# Register runner
echo "Registering runner..."
./config.sh --url "$REPO_URL" --token "$REG_TOKEN" --name "$RUNNER_NAME" --unattended --work "_work"

# Install service
echo "Installing as service..."
sudo ./svc.sh install
sudo ./svc.sh start

echo ""
echo "✅ Runner $RUNNER_NAME setup completed!"
echo "   Directory: $WORK_DIR"
echo "   Service: actions.runner.$RUNNER_NAME.service"