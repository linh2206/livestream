#!/usr/bin/env bash
set -euo pipefail

# Minimal installer: download + configure GitHub Actions self-hosted runner(s)
# Required: GH_URL, GH_TOKEN
# Optional: COUNT (default 1), VERSION (default 2.316.1), PREFIX (default actions-runner),
#           RUNNER_BASE (default $PWD), NAME (base, default runner), LABELS (comma separated),
#           ALLOW_ROOT=1 to allow running as root.

if [[ "${ALLOW_ROOT:-0}" != "1" && "$EUID" -eq 0 ]]; then
  echo "Do not run as root. Set ALLOW_ROOT=1 if you really need to." >&2
  exit 1
fi

GH_URL=${GH_URL:-}
GH_TOKEN=${GH_TOKEN:-}
COUNT=${COUNT:-1}
VERSION=${VERSION:-2.316.1}
PREFIX=${PREFIX:-actions-runner}
RUNNER_BASE=${RUNNER_BASE:-$PWD}
NAME=${NAME:-runner}
LABELS=${LABELS:-}

if [[ -z "$GH_URL" || -z "$GH_TOKEN" ]]; then
  echo "GH_URL and GH_TOKEN are required." >&2
  exit 1
fi

sudo apt-get update -y >/dev/null 2>&1 || true
sudo apt-get install -y ca-certificates curl tar gzip file >/dev/null 2>&1 || true

for i in $(seq 1 "$COUNT"); do
  dest_dir="${RUNNER_BASE%/}/${PREFIX}${i}"
  runner_name="${NAME}${i}"
  echo "==> Installing ${runner_name} at ${dest_dir}"
  mkdir -p "$dest_dir"
  cd "$dest_dir"
  url="https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz"
  curl -fL -H 'Accept: application/octet-stream' -o runner.tgz "$url"
  tar -tzf runner.tgz >/dev/null 2>&1 || { echo "runner.tgz invalid"; exit 1; }
  tar -xzf runner.tgz
  chmod +x config.sh run.sh svc.sh
  if [[ -n "$LABELS" ]]; then
    ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$runner_name" --labels "$LABELS" --unattended --replace
  else
    ./config.sh --url "$GH_URL" --token "$GH_TOKEN" --name "$runner_name" --unattended --replace
  fi
  sudo ./svc.sh install
  sudo ./svc.sh start
done

echo "Done. ${COUNT} runner(s) installed under ${RUNNER_BASE}."


