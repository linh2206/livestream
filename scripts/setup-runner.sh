#!/bin/bash

# Config
REPO_URL="https://github.com/linh2206/livestream"
RUNNER_BASE_NAME="runner"  # tên cơ bản, sẽ tự động thêm số
WORK_BASE_DIR="$HOME/workspace"
# GitHub Personal Access Token - Set this environment variable
# export RUNNER_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RUNNER_TOKEN="${RUNNER_TOKEN:-${GITHUB_PAT}}"

# Parse options
TEST_API_ONLY=false
GET_TOKEN_ONLY=false

if [[ "$1" == "--test-api" ]]; then
    TEST_API_ONLY=true
elif [[ "$1" == "--get-token" ]]; then
    GET_TOKEN_ONLY=true
fi

# Function để tìm số runner tiếp theo
find_next_runner_number() {
    local base_dir="$WORK_BASE_DIR"
    local num=1
    while [[ -d "$base_dir/${RUNNER_BASE_NAME}${num}" ]]; do
        ((num++))
    done
    echo $num
}

# Extract owner and repo from URL (needed for API test)
if [[ "$REPO_URL" =~ https://github.com/([^/]+)/([^/]+) ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
else
    echo "Error: Invalid repository URL format"
    echo "Expected: https://github.com/owner/repo"
    echo "Got: $REPO_URL"
    exit 1
fi

# Lấy số runner tiếp theo
RUNNER_NUM=$(find_next_runner_number)
RUNNER_NAME="${RUNNER_BASE_NAME}${RUNNER_NUM}"
WORK_DIR="$WORK_BASE_DIR/$RUNNER_NAME"

# Check if RUNNER_TOKEN is set
if [[ -z "$RUNNER_TOKEN" || "$RUNNER_TOKEN" == "null" ]]; then
    echo "Error: RUNNER_TOKEN environment variable is not set"
    echo "Please set your GitHub Personal Access Token with proper permissions:"
    echo "export RUNNER_TOKEN=ghp_xxxxx"
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

# If test API only mode, just test and exit
if [[ "$TEST_API_ONLY" == true ]]; then
    echo "==== Testing GitHub API Connection ===="
    echo "Repository: $OWNER/$REPO"
    echo "PAT: ${GITHUB_PAT:0:10}..."
    echo ""
    echo "Testing API call..."
    
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --max-time 30 -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: token $GITHUB_PAT" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token")
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    echo ""
    
    if [[ "$HTTP_CODE" == "201" ]] && echo "$RESPONSE_BODY" | grep -q '"token"'; then
        echo "✅ SUCCESS: API is working! Registration token obtained."
        TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo "Token: ${TOKEN:0:30}..."
        exit 0
    else
        echo "❌ FAILED: Could not get registration token"
        echo ""
        echo "Common issues:"
        echo "- HTTP 401/403: PAT lacks permissions (need 'repo' + 'admin:org' for org repos)"
        echo "- HTTP 404: Repository not found or PAT can't access it"
        echo "- HTTP 422: Invalid request"
        exit 1
    fi
fi

# If get token only mode, get token and print it
if [[ "$GET_TOKEN_ONLY" == true ]]; then
    echo "Getting registration token for $OWNER/$REPO..."
    
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --max-time 30 -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: token $GITHUB_PAT" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token")
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [[ "$HTTP_CODE" == "201" ]] && echo "$RESPONSE_BODY" | grep -q '"token"'; then
        TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        echo ""
        echo "Registration Token:"
        echo "$TOKEN"
        echo ""
        echo "This token expires in 1 hour."
        echo "Use it to register runner manually:"
        echo "./config.sh --url $REPO_URL --token $TOKEN --name runner1"
        exit 0
    else
        echo "Error: Failed to get registration token"
        echo "HTTP Code: $HTTP_CODE"
        echo "Response: $RESPONSE_BODY"
        exit 1
    fi
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
    echo "[DOWNLOAD] GitHub Actions runner (180MB)..."
    cd "$WORK_DIR"
    
    # Download với progress bar và timeout ngắn hơn
    if ! timeout 60 curl -L --progress-bar --connect-timeout 5 \
        -o actions-runner-linux-x64.tar.gz \
        https://github.com/actions/runner/releases/download/v2.316.1/actions-runner-linux-x64-2.316.1.tar.gz; then
        echo "Error: Download timeout or failed"
        exit 1
    fi
    
    echo "[EXTRACT] Extracting..."
    tar xzf actions-runner-linux-x64.tar.gz 2>/dev/null &
    TAR_PID=$!
    
    # Wait với timeout
    if ! timeout 30 wait $TAR_PID 2>/dev/null; then
        kill $TAR_PID 2>/dev/null
        echo "Error: Extract timeout"
        exit 1
    fi
    
    rm -f actions-runner-linux-x64.tar.gz
    echo "[DONE] ✓"
fi

cd "$WORK_DIR"

# Get registration token from GitHub API
echo "[API] Getting registration token..."

# API call với timeout ngắn
REG_TOKEN_RESPONSE=$(timeout 10 curl -sf -w "\nHTTP:%{http_code}" -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: token $RUNNER_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$OWNER/$REPO/actions/runners/registration-token" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: API timeout or connection failed"
    exit 1
fi

# Extract HTTP code
HTTP_CODE=$(echo "$REG_TOKEN_RESPONSE" | grep "HTTP:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$REG_TOKEN_RESPONSE" | sed '/HTTP:/d')

echo "[API] HTTP $HTTP_CODE"

# Check if request was successful
if ! echo "$RESPONSE_BODY" | grep -q '"token"'; then
    echo "Error: No token in response"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi

TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "[API] ✓ Token obtained"

# Đăng ký runner
echo "[REGISTER] Registering runner..."
if ! timeout 30 ./config.sh --url "$REPO_URL" --token "$TOKEN" --name "$RUNNER_NAME" --unattended --work "_work" 2>&1 | grep -E "(Connecting|Settings Saved)" ; then
    echo "Error: Registration failed"
    exit 1
fi

echo "[REGISTER] ✓ Done"

# Verify svc.sh exists
[[ ! -f "./svc.sh" ]] && echo "Error: svc.sh not found" && exit 1

# Cài service
echo "[SERVICE] Installing..."
timeout 20 sudo ./svc.sh install >/dev/null 2>&1 || { echo "Error: Install failed"; exit 1; }

echo "[SERVICE] Starting..."
timeout 20 sudo ./svc.sh start >/dev/null 2>&1 || { echo "Error: Start failed"; exit 1; }

echo ""
echo "✅ Runner $RUNNER_NAME setup completed!"
echo "   Directory: $WORK_DIR"
