#!/usr/bin/env bash
set -euo pipefail

# Fresh installer: purge old → download → configure → install service → start
# Inputs via env or flags:
#   GH_URL       (required)   Repo/Org URL, e.g. https://github.com/owner/repo
#   GH_TOKEN     (required)   Registration token (valid ~1h)
#   COUNT        (default 1)  Number of runners
#   VERSION      (default 2.316.1)
#   PREFIX       (default actions-runner)
#   RUNNER_BASE  (default $PWD)
#   NAME         (default runner)  base name → runner1..N
#   LABELS       (optional)   comma-separated
#   ALLOW_ROOT   (0|1) allow run as root (not recommended)

usage(){ cat <<EOF
Usage: GH_URL=... GH_TOKEN=... [COUNT=1] [RUNNER_BASE=
$PWD] [NAME=runner] [PREFIX=actions-runner] [VERSION=2.316.1] [LABELS=prod]
       [ALLOW_ROOT=1] bash scripts/setup-runner.sh
EOF
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { usage; exit 0; }

# Check if running as root or with sudo
if [[ "$EUID" -eq 0 ]] || [[ -n "${SUDO_USER:-}" ]]; then
  if [[ "${ALLOW_ROOT:-0}" != "1" ]]; then
    echo "Do not run as root. Set ALLOW_ROOT=1 to override." >&2; exit 1;
  else
    echo "Running with elevated privileges (ALLOW_ROOT=1)"
  fi
fi

GH_URL=${GH_URL:-}
GH_TOKEN=${GH_TOKEN:-}
COUNT=${COUNT:-1}
VERSION=${VERSION:-2.316.1}
PREFIX=${PREFIX:-actions-runner}
RUNNER_BASE=${RUNNER_BASE:-/root/workspace}
NAME=${NAME:-runner}
LABELS=${LABELS:-}

# Prompt for missing values
if [[ -z "$GH_URL" ]]; then
    echo -n "Enter GitHub repository URL (e.g., https://github.com/owner/repo): "
    read -r GH_URL
fi

if [[ -z "$GH_TOKEN" ]]; then
    echo -n "Enter GitHub token: "
    read -r -s GH_TOKEN
    echo
fi

if [[ -z "$GH_URL" || -z "$GH_TOKEN" ]]; then
    echo "Error: GH_URL and GH_TOKEN are required." >&2
    exit 1
fi

# Deps
sudo apt-get update -y >/dev/null 2>&1 || true
sudo apt-get install -y ca-certificates curl tar gzip file >/dev/null 2>&1 || true

# Purge old
for i in $(seq 1 "$COUNT"); do
  d="${RUNNER_BASE%/}/${PREFIX}${i}"
  if [[ -d "$d" ]]; then
    echo "==> Purging $d"
    (
      cd "$d" || exit 0
      [ -f svc.sh ] && chmod +x svc.sh >/dev/null 2>&1 || true
      [ -f config.sh ] && chmod +x config.sh >/dev/null 2>&1 || true
      [ -f svc.sh ] && ./svc.sh stop >/dev/null 2>&1 || true
      [ -f svc.sh ] && ./svc.sh uninstall >/dev/null 2>&1 || true
      [ -f config.sh ] && ./config.sh remove --token invalid >/dev/null 2>&1 || true
    )
    rm -rf "$d"
  fi
done

# Install fresh
for i in $(seq 1 "$COUNT"); do
  name="${NAME}${i}"
  dest="${RUNNER_BASE%/}/${PREFIX}${i}"
  echo "==> Install $name at $dest"
  mkdir -p "$dest" && cd "$dest"
  url="https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz"
  curl -fL -H 'Accept: application/octet-stream' -o runner.tgz "$url"
  tar -tzf runner.tgz >/dev/null 2>&1 || { echo "runner.tgz invalid"; exit 1; }
  tar -xzf runner.tgz
  echo "Files extracted: $(ls -la)"
  for file in config.sh run.sh svc.sh; do
    if [ -f "$file" ]; then
      echo "Setting permissions for $file"
      chmod +x "$file"
    else
      echo "Warning: $file not found after extraction"
    fi
  done
  echo "Configuring runner..."
  if [[ -n "$LABELS" ]]; then
    ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$name" --labels "$LABELS" --unattended --replace
  else
    ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$name" --unattended --replace
  fi
  
  echo "Installing service..."
  sudo ./svc.sh install
  echo "Starting service..."
  sudo ./svc.sh start
done

echo "Done. $COUNT runner(s) set up under ${RUNNER_BASE}."


