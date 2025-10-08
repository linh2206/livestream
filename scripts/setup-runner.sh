#!/bin/bash

# Config
REPO_URL="https://github.com/linh2206/livestream"
RUNNER_BASE_NAME="runner"  # tên cơ bản, sẽ tự động thêm số
WORK_BASE_DIR="$HOME/workspace"
# GitHub Personal Access Token - Set this environment variable
# export GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_PAT="${GITHUB_PAT}"

# Function để tìm số runner tiếp theo
find_next_runner_number() {
    local base_dir="$WORK_BASE_DIR"
    local num=1
    while [[ -d "$base_dir/${RUNNER_BASE_NAME}${num}" ]]; do
        ((num++))
    done
    echo $num
}

# Lấy số runner tiếp theo
RUNNER_NUM=$(find_next_runner_number)
RUNNER_NAME="${RUNNER_BASE_NAME}${RUNNER_NUM}"
WORK_DIR="$WORK_BASE_DIR/$RUNNER_NAME"

# Check if GITHUB_PAT is set
if [[ -z "$GITHUB_PAT" || "$GITHUB_PAT" == "null" ]]; then
    echo "Error: GITHUB_PAT environment variable is not set"
    echo "Please set your GitHub Personal Access Token with proper permissions:"
    echo "export GITHUB_PAT=ghp_xxxxx"
    echo ""
    echo "Required permissions for the token:"
    echo "- repo (for private repositories)"
    echo "- admin:org (for organization runners)"
    echo "- admin:repo_hook (for repository runners)"
    echo ""
    echo "Generate token at: https://github.com/settings/tokens"
    exit 1
fi

# Validate token format
if [[ ! "$GITHUB_PAT" =~ ^ghp_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^gho_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghu_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghs_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghr_[A-Za-z0-9]{76}$ ]]; then
    echo "Error: Invalid GitHub token format"
    echo "Expected format: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "Your token: ${GITHUB_PAT:0:10}..."
    exit 1
fi

echo "Setting up runner: $RUNNER_NAME"
echo "Work directory: $WORK_DIR"

# Tạo thư mục riêng
mkdir -p "$WORK_DIR"

# Copy từ thư mục actions-runner gốc (nếu có)
if [[ -d "$HOME/actions-runner" ]]; then
    echo "Copying existing runner files..."
    if ! cp -r "$HOME/actions-runner"/* "$WORK_DIR"; then
        echo "Error: Failed to copy runner files"
        exit 1
    fi
else
    echo "Downloading GitHub Actions runner..."
    # Download runner nếu chưa có
    cd "$WORK_DIR"
    if ! curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz; then
        echo "Error: Failed to download GitHub Actions runner"
        exit 1
    fi
    
    if ! tar xzf actions-runner-linux-x64.tar.gz; then
        echo "Error: Failed to extract runner archive"
        exit 1
    fi
    
    rm actions-runner-linux-x64.tar.gz
fi

cd "$WORK_DIR"

# Get registration token from GitHub API using PAT
echo "Getting registration token from GitHub API..."

# Extract owner and repo from URL
if [[ "$REPO_URL" =~ https://github.com/([^/]+)/([^/]+) ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
else
    echo "Error: Invalid repository URL format"
    echo "Expected: https://github.com/owner/repo"
    echo "Got: $REPO_URL"
    exit 1
fi

# Get registration token from GitHub API
echo "Requesting registration token for $OWNER/$REPO..."
REG_TOKEN_RESPONSE=$(curl -s -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: token $GITHUB_PAT" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token")

# Check if request was successful
if echo "$REG_TOKEN_RESPONSE" | grep -q '"token"'; then
    TOKEN=$(echo "$REG_TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Registration token obtained successfully"
else
    echo "Error: Failed to get registration token"
    echo "Response: $REG_TOKEN_RESPONSE"
    echo ""
    echo "Check that:"
    echo "1. Personal Access Token has 'repo' permission"
    echo "2. Repository exists and is accessible"
    echo "3. Token is not expired"
    echo ""
    echo "Generate token at: https://github.com/settings/tokens"
    exit 1
fi

# Đăng ký runner
echo "Registering runner: $RUNNER_NAME"
if ! ./config.sh --url "$REPO_URL" --token "$TOKEN" --name "$RUNNER_NAME" --unattended --work "_work"; then
    echo "Error: Failed to register runner"
    echo "Check that:"
    echo "1. Repository URL is correct: $REPO_URL"
    echo "2. Token has proper permissions"
    echo "3. Repository exists and is accessible"
    exit 1
fi

echo "Runner registered successfully"

# Verify svc.sh exists before trying to install
if [[ ! -f "./svc.sh" ]]; then
    echo "Error: svc.sh script not found. Runner configuration may have failed."
    exit 1
fi

# Cài như service
echo "Installing as service..."
if ! sudo ./svc.sh install; then
    echo "Error: Failed to install runner service"
    exit 1
fi

echo "Starting runner service..."
if ! sudo ./svc.sh start; then
    echo "Error: Failed to start runner service"
    echo "Check service status with: sudo ./svc.sh status"
    exit 1
fi

echo "Runner $RUNNER_NAME setup completed!"
echo "Runner directory: $WORK_DIR"
