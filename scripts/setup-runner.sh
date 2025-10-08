#!/bin/bash

# Config
REPO_URL="https://github.com/linh2206/livestream"
RUNNER_BASE_NAME="runner"  # tên cơ bản, sẽ tự động thêm số
WORK_BASE_DIR="$HOME/workspace"
# Remove hardcoded token - must be provided via environment variable
GITHUB_PAT="${GITHUB_PAT:-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}"

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
if [[ -z "$GITHUB_PAT" ]]; then
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

echo "Setting up runner: $RUNNER_NAME"
echo "Work directory: $WORK_DIR"

# Tạo thư mục riêng
mkdir -p "$WORK_DIR"

# Copy từ thư mục actions-runner gốc (nếu có)
if [[ -d "$HOME/actions-runner" ]]; then
    cp -r "$HOME/actions-runner"/* "$WORK_DIR"
else
    echo "Downloading GitHub Actions runner..."
    # Download runner nếu chưa có
    cd "$WORK_DIR"
    curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz
    tar xzf actions-runner-linux-x64.tar.gz
    rm actions-runner-linux-x64.tar.gz
fi

cd "$WORK_DIR"

# Validate token format
if [[ ! "$GITHUB_PAT" =~ ^ghp_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^gho_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghu_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghs_[A-Za-z0-9]{36}$ ]] && [[ ! "$GITHUB_PAT" =~ ^ghr_[A-Za-z0-9]{76}$ ]]; then
    echo "Error: Invalid GitHub token format"
    echo "Expected format: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "Your token: ${GITHUB_PAT:0:10}..."
    exit 1
fi

echo "Using GitHub Personal Access Token..."
TOKEN="$GITHUB_PAT"

# Test token validity by making a simple API call
echo "Validating GitHub token..."
if ! curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep -q '"login"'; then
    echo "Error: Invalid or expired GitHub token"
    echo "Please generate a new token with proper permissions at: https://github.com/settings/tokens"
    exit 1
fi

echo "GitHub token validated successfully"

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
