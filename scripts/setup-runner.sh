#!/bin/bash

# Config
REPO_URL="https://github.com/linh2206/livestream.git"
RUNNER_BASE_NAME="runner"  # tên cơ bản, sẽ tự động thêm số
WORK_BASE_DIR="$HOME/workspace"
GITHUB_PAT="${GITHUB_PAT:-AKVNP5C2L2XSC2H2EHWVGIDI4XDOM}"  # lấy từ environment variable hoặc dùng default

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
    echo "Please set your GitHub Personal Access Token:"
    echo "export GITHUB_PAT=ghp_xxxxx"
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

# Sử dụng token trực tiếp (đã là registration token)
echo "Using registration token..."
TOKEN="$GITHUB_PAT"

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
    echo "Error: Failed to get registration token"
    exit 1
fi

echo "Registration token obtained successfully"

# Đăng ký runner
echo "Registering runner: $RUNNER_NAME"
./config.sh --url "$REPO_URL" --token "$TOKEN" --name "$RUNNER_NAME" --unattended --work "_work"

# Cài như service
echo "Installing as service..."
sudo ./svc.sh install
sudo ./svc.sh start

echo "Runner $RUNNER_NAME setup completed!"
echo "Runner directory: $WORK_DIR"
