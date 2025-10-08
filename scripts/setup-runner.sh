#!/bin/bash

set -e

# Config
REPO_URL="${REPO_URL:-https://github.com/linh2206/livestream}"
RUNNER_BASE_NAME="${RUNNER_BASE_NAME:-runner}"
WORK_BASE_DIR="${WORK_BASE_DIR:-$HOME/workspace}"

# Get token from user if not set
if [[ -z "$RUNNER_TOKEN" ]]; then
    echo "Enter your GitHub Personal Access Token:"
    read RUNNER_TOKEN
fi

# Clean token from any whitespace/newlines - FORCE CLEAN
RUNNER_TOKEN=$(printf '%s' "${RUNNER_TOKEN}" | tr -d '\n\r\t ')

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

# Use existing runner files (version 2.328.0)
echo "Using existing runner files (v2.328.0)..."

# Get registration token from GitHub API
echo "Getting registration token from GitHub API..."

OWNER=$(echo "$REPO_URL" | sed 's|https://github.com/\([^/]*\)/\([^/]*\)|\1|')
REPO=$(echo "$REPO_URL" | sed 's|https://github.com/\([^/]*\)/\([^/]*\)|\2|')

# Clean API call with proper token handling
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: token ${RUNNER_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${OWNER}/${REPO}/actions/runners/registration-token")

HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

REG_TOKEN=$(echo "$RESPONSE_BODY" | sed 's/.*"token": *"\([^"]*\)".*/\1/')

echo "Parsed token: '$REG_TOKEN'"

if [[ -z "$REG_TOKEN" ]]; then
    echo "Error: Failed to get registration token"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

echo "Registration token obtained"

# Register runner
echo "Registering runner..."
# Clean registration token before passing to config.sh
REG_TOKEN=$(printf '%s' "$REG_TOKEN" | tr -d '\n\r\t ')
./config.sh --url "$REPO_URL" --token "$REG_TOKEN" --name "$RUNNER_NAME" --unattended --work "_work"

# Install service
echo "Installing as service..."
sudo ./svc.sh install
sudo ./svc.sh start

echo ""
echo "✅ Runner $RUNNER_NAME setup completed!"
echo "   Directory: $WORK_DIR"
echo "   Service: actions.runner.$RUNNER_NAME.service"