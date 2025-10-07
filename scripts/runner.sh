#!/usr/bin/env bash
set -euo pipefail

# GitHub Actions self-hosted runner manager
# - Purge existing runner installation in ~/actions-runner
# - Install and register new runner for a repo or org

# Usage examples:
#   bash scripts/runner.sh --purge --install
#   GH_URL=https://github.com/linh2206/livestream bash scripts/runner.sh --install
#   bash scripts/runner.sh --install --url https://github.com/linh2206/livestream --name srv-runner --labels prod,linux

RUNNER_DIR="$HOME/actions-runner"
RUNNER_VERSION="2.316.1"
RUNNER_NAME=""
RUNNER_LABELS=""
DO_PURGE=false
DO_INSTALL=false
GH_URL="${GH_URL:-}"
GH_TOKEN="${GH_TOKEN:-}"
RUNNER_COUNT=1
RUNNER_PREFIX="actions-runner"

print_header() {
  echo "\n==> $1"
}

usage() {
  cat <<EOF
Manage GitHub Actions self-hosted runner

Flags:
  --purge                 Remove existing runner (stop & uninstall service, delete dir)
  --install               Install/register a new runner
  --url <GH_URL>          Repo or org URL (e.g. https://github.com/owner/repo or https://github.com/org)
  --name <NAME>           Runner name (optional; default: hostname)
  --labels <LBL1,LBL2>    Comma-separated labels (optional)
  --version <X.Y.Z>       Runner version (default: ${RUNNER_VERSION})
  --count <N>             Install N runners (each in its own directory)
  --prefix <PREFIX>       Base directory/name prefix (default: ${RUNNER_PREFIX})

Environment variables (alternative to flags / prompts):
  GH_URL      Same as --url
  GH_TOKEN    Registration token copied from GitHub Runners page (valid ~1h)

Examples:
  GH_URL=https://github.com/owner/repo GH_TOKEN=*** bash scripts/runner.sh --purge --install
  bash scripts/runner.sh --install --url https://github.com/owner/repo --name srv --labels prod
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge) DO_PURGE=true; shift ;;
    --install) DO_INSTALL=true; shift ;;
    --url) GH_URL="$2"; shift 2 ;;
    --name) RUNNER_NAME="$2"; shift 2 ;;
    --labels) RUNNER_LABELS="$2"; shift 2 ;;
    --version) RUNNER_VERSION="$2"; shift 2 ;;
    --count) RUNNER_COUNT="$2"; shift 2 ;;
    --prefix) RUNNER_PREFIX="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

# Allow running as root only when explicitly enabled
if [[ "$EUID" -eq 0 && "${ALLOW_ROOT:-0}" != "1" ]]; then
  echo "Do not run this script as root. Set ALLOW_ROOT=1 to override (not recommended)." >&2
  exit 1
fi

ensure_deps() {
  if ! command -v curl >/dev/null 2>&1; then
    print_header "Installing curl"
    sudo apt-get update -y && sudo apt-get install -y curl ca-certificates
  fi
}

purge_runner() {
  local count prefix
  count=${RUNNER_COUNT}
  prefix=${RUNNER_PREFIX}
  if [[ ${count} -le 1 ]]; then
    # Purge default single directory
    local dir1="$RUNNER_DIR" dir2="$HOME/${prefix}"
    for dir in "$dir1" "$dir2"; do
      if [[ -d "$dir" ]]; then
        print_header "Removing runner at $dir"
        pushd "$dir" >/dev/null || exit 1
        chmod +x svc.sh config.sh || true
        ./svc.sh stop 2>/dev/null || true
        ./svc.sh uninstall 2>/dev/null || true
        ./config.sh remove --token invalid 2>/dev/null || true
        popd >/dev/null || true
        rm -rf "$dir"
      fi
    done
  else
    for ((i=1; i<=count; i++)); do
      local dir="$HOME/${prefix}${i}"
      if [[ -d "$dir" ]]; then
        print_header "Removing runner #$i at $dir"
        pushd "$dir" >/dev/null || exit 1
        chmod +x svc.sh config.sh || true
        ./svc.sh stop 2>/dev/null || true
        ./svc.sh uninstall 2>/dev/null || true
        ./config.sh remove --token invalid 2>/dev/null || true
        popd >/dev/null || true
        rm -rf "$dir"
      fi
    done
  fi
}

prompt_if_empty() {
  local var_name="$1"; shift
  local prompt_text="$1"; shift
  local secret="${1:-false}"
  local current_val
  # shellcheck disable=SC2221,SC2222
  case "$var_name" in
    GH_URL) current_val="$GH_URL" ;;
    GH_TOKEN) current_val="$GH_TOKEN" ;;
    RUNNER_NAME) current_val="$RUNNER_NAME" ;;
    RUNNER_LABELS) current_val="$RUNNER_LABELS" ;;
  esac
  if [[ -z "$current_val" ]]; then
    if [[ "$secret" == true ]]; then
      read -r -s -p "$prompt_text: " current_val; echo
    else
      read -r -p "$prompt_text: " current_val
    fi
  fi
  case "$var_name" in
    GH_URL) GH_URL="$current_val" ;;
    GH_TOKEN) GH_TOKEN="$current_val" ;;
    RUNNER_NAME) RUNNER_NAME="$current_val" ;;
    RUNNER_LABELS) RUNNER_LABELS="$current_val" ;;
  esac
}

install_runner() {
  ensure_deps
  prompt_if_empty GH_URL "Nhập GH_URL (ví dụ https://github.com/owner/repo)"
  prompt_if_empty GH_TOKEN "Dán Registration Token (từ GitHub, hết hạn ~1h)" true

  local base_name base_dir url
  # Nếu không truyền --name, mặc định dùng pattern "runner+number"
  base_name="${RUNNER_NAME:-runner}"
  url="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

  for ((i=1; i<=RUNNER_COUNT; i++)); do
    local suffix name dir
    # Luôn đánh số 1..N để thỏa yêu cầu "runner + number"
    suffix="$i"
    name="${base_name}${suffix}"
    dir="$HOME/${RUNNER_PREFIX}${suffix}"

    print_header "Cài runner #$i tại $dir (name=$name)"
    mkdir -p "$dir"
    cd "$dir"

    print_header "Tải runner v${RUNNER_VERSION}"
    curl -fL -o runner.tgz "$url"
    file runner.tgz | grep -qi gzip || { echo "Tệp tải về không phải gzip. URL có thể sai."; exit 1; }
    tar -xzf runner.tgz
    chmod +x config.sh run.sh svc.sh

    print_header "Cấu hình runner #$i"
    if [[ -n "$RUNNER_LABELS" ]]; then
      ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$name" --labels "$RUNNER_LABELS" --unattended --replace
    else
      ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$name" --unattended --replace
    fi

    print_header "Cài service runner #$i"
    sudo ./svc.sh install
    sudo ./svc.sh start
  done

  echo "Done. ${RUNNER_COUNT} runner(s) đã được cài và khởi động."
}

if ! $DO_PURGE && ! $DO_INSTALL; then
  usage
  exit 1
fi

if $DO_PURGE; then
  purge_runner
fi

if $DO_INSTALL; then
  install_runner
fi


