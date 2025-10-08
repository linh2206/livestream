#!/bin/bash

set -e

# Config
REPO_URL="${REPO_URL:-https://github.com/linh2206/livestream}"
RUNNER_BASE_NAME="${RUNNER_BASE_NAME:-runner}"
WORK_BASE_DIR="${WORK_BASE_DIR:-$HOME/workspace}"

# Get GitHub Personal Access Token for API calls
if [[ -z "$GITHUB_PAT" ]]; then
    echo "Enter your GitHub Personal Access Token (for API calls):"
    read GITHUB_PAT
fi

# Clean token from any whitespace/newlines - AGGRESSIVE CLEANING
GITHUB_PAT=$(printf '%s' "${GITHUB_PAT}" | tr -d '\n\r\t ' | sed 's/[[:space:]]//g')

if [[ -z "$GITHUB_PAT" ]]; then
    echo "Error: GitHub PAT is required"
    exit 1
fi

# Validate token format
if [[ ! "$GITHUB_PAT" =~ ^ghp_[A-Za-z0-9]{36}$ ]]; then
    echo "Error: Invalid PAT format. Expected: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "Your token: '$GITHUB_PAT'"
    echo "Token length: ${#GITHUB_PAT}"
    exit 1
fi

# Debug: Show cleaned token info
echo "Token info:"
echo "  Length: ${#GITHUB_PAT}"
echo "  First 10 chars: ${GITHUB_PAT:0:10}"
echo "  Last 10 chars: ${GITHUB_PAT: -10}"

# Check system time sync
echo "Checking system time sync..."
if ! ntpdate -q pool.ntp.org >/dev/null 2>&1; then
    echo "Warning: System time may not be synced. This can cause 401/404 errors."
    echo "Please sync system time: sudo ntpdate pool.ntp.org"
fi

# Test GitHub connectivity
echo "Testing GitHub connectivity..."
if ! curl -s --connect-timeout 10 https://api.github.com >/dev/null; then
    echo "Error: Cannot connect to GitHub API"
    echo "Check network connectivity and firewall settings"
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

# Use existing runner files if available, otherwise download
if [[ -d "$WORK_BASE_DIR/actions-runner" ]]; then
    echo "Using existing runner files from $WORK_BASE_DIR/actions-runner..."
    cp -r "$WORK_BASE_DIR/actions-runner"/* .
else
    echo "Downloading GitHub Actions runner (v2.328.0)..."
    
    # Download runner
    curl -o actions-runner-linux-x64-2.328.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
    
    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to download runner"
        exit 1
    fi
    
    # Extract the installer
    echo "Extracting runner..."
    tar xzf ./actions-runner-linux-x64-2.328.0.tar.gz
    
    if [[ $? -ne 0 ]]; then
        echo "Error: Failed to extract runner"
        exit 1
    fi
    
    # Clean up
    rm actions-runner-linux-x64-2.328.0.tar.gz
    
    echo "Runner downloaded and extracted successfully"
fi

# Get registration token from GitHub API
echo "Getting registration token from GitHub API..."

OWNER=$(echo "$REPO_URL" | sed 's|https://github.com/\([^/]*\)/\([^/]*\)|\1|')
REPO=$(echo "$REPO_URL" | sed 's|https://github.com/\([^/]*\)/\([^/]*\)|\2|')

echo "Repository: $OWNER/$REPO"

# Get registration token using PAT
echo "Making API call with token: ${GITHUB_PAT:0:10}..."

# Debug: Check token for hidden characters
echo "Token hex dump:"
printf '%s' "$GITHUB_PAT" | hexdump -C | head -2

API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: token ${GITHUB_PAT}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${OWNER}/${REPO}/actions/runners/registration-token")

HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

REG_TOKEN=$(echo "$RESPONSE_BODY" | sed 's/.*"token": *"\([^"]*\)".*/\1/')

if [[ -z "$REG_TOKEN" ]] || [[ "$HTTP_CODE" != "201" ]]; then
    echo "Error: Failed to get registration token"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

# Clean registration token aggressively
REG_TOKEN=$(printf '%s' "$REG_TOKEN" | tr -d '\n\r\t ' | sed 's/[[:space:]]//g')

echo "Registration token obtained: ${REG_TOKEN:0:10}..."
echo "Registration token length: ${#REG_TOKEN}"

# Debug: Check registration token for hidden characters
echo "Registration token hex dump:"
printf '%s' "$REG_TOKEN" | hexdump -C | head -2

# Patch config.sh to fix API endpoint (GitHub runner bug)
echo "Patching config.sh to fix API endpoint..."

# Backup original
cp ./config.sh ./config.sh.backup

# Patch the deprecated API endpoint
sed -i 's|https://api.github.com/actions/runner-registration|https://api.github.com/repos/'"$OWNER"'/'"$REPO"'/actions/runners/registration-token|g' ./config.sh

echo "Patched config.sh to use correct API endpoint"

# Configure runner with registration token
echo "Configuring runner..."

echo "Running config.sh with:"
echo "  URL: $REPO_URL"
echo "  Token: ${REG_TOKEN:0:10}..."
echo "  Name: $RUNNER_NAME"

# Create the runner and start the configuration experience
./config.sh --url "$REPO_URL" --token "$REG_TOKEN" --name "$RUNNER_NAME" --unattended

if [[ $? -eq 0 ]]; then
    echo "Runner configured successfully"
    # Keep the patched version
    rm ./config.sh.backup
else
    echo "Error: Failed to configure runner"
    # Restore original
    mv ./config.sh.backup ./config.sh
    exit 1
fi

# Last step, run it! (GitHub official way)
echo "Starting runner..."
echo "Runner will run in foreground. Press Ctrl+C to stop."
echo "To run in background, use: nohup ./run.sh &"

# Run the runner
./run.sh

echo ""
echo "✅ Runner $RUNNER_NAME setup completed!"
echo "   Directory: $WORK_DIR"