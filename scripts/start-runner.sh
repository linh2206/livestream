#!/bin/bash

# GitHub Actions Runner Start Script
# Script để khởi động GitHub Actions self-hosted runners

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_RUNNERS=8  # Từ actions-runner đến actions-runner7

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}


# Function to start all runners
start_all_runners() {
    local max_runners=${1:-$MAX_RUNNERS}
    local started_count=0

    print_status "Starting GitHub Actions runners..."
    print_status "================================"

    for i in $(seq 0 $((max_runners-1))); do
        local runner_dir

        if [ "$i" -eq 0 ]; then
            runner_dir="/workspace/actions-runner"
        else
            runner_dir="/workspace/actions-runner$i"
        fi

        if [ -d "$runner_dir" ]; then
            cd "$runner_dir"

            # Check if runner is already running
            if [ -f "runner-$i.pid" ]; then
                local pid=$(cat "runner-$i.pid")
                if ps -p "$pid" > /dev/null 2>&1; then
                    print_warning "Runner $i is already running (PID: $pid)"
                    ((started_count++))
                    continue
                else
                    print_warning "Stale PID file found, removing..."
                    rm -f "runner-$i.pid"
                fi
            fi

            # Check if run.sh exists
            if [ ! -f "run.sh" ]; then
                print_error "run.sh not found in $runner_dir"
                continue
            fi

            # Start the runner
            print_status "Starting runner $i..."
            nohup ./run.sh > "runner-$i.log" 2>&1 &
            local pid=$!
            echo $pid > "runner-$i.pid"

            print_success "Runner $i started with PID: $pid"
            ((started_count++))
        else
            print_warning "Runner directory not found: $runner_dir"
        fi

        # Wait a bit before starting next runner
        sleep 1
    done

    print_success "Started $started_count out of $max_runners runners"

    if [ "$started_count" -gt 0 ]; then
        print_status "To check status: ps aux | grep actions-runner"
        print_status "Logs are in: /workspace/actions-runner*/runner-*.log"
    fi
}

# Function to show runner status
show_status() {
    print_status "GitHub Actions Runner Status"
    print_status "============================"

    local running_count=0

    for i in $(seq 0 $((MAX_RUNNERS-1))); do
        if [ "$i" -eq 0 ]; then
            runner_dir="/workspace/actions-runner"
        else
            runner_dir="/workspace/actions-runner$i"
        fi

        if [ -d "$runner_dir" ]; then
            if [ -f "$runner_dir/runner-$i.pid" ]; then
                local pid=$(cat "$runner_dir/runner-$i.pid")
                if ps -p "$pid" > /dev/null 2>&1; then
                    print_success "Runner $i: RUNNING (PID: $pid)"
                    ((running_count++))
                else
                    print_warning "Runner $i: STOPPED (stale PID file)"
                fi
            else
                print_warning "Runner $i: NOT STARTED"
            fi
        else
            print_status "Runner $i: NOT INSTALLED"
        fi
    done

    print_status "Total running: $running_count/$MAX_RUNNERS"
}

# Main execution
main() {
    case "${1:-all}" in
        "all")
            start_all_runners ${2:-$MAX_RUNNERS}
            ;;
        "status")
            show_status
            ;;
        *)
            echo "Usage: $0 {all|status}"
            echo ""
            echo "Commands:"
            echo "  all [count]     - Start all runners (default: 8)"
            echo "  status          - Show runner status"
            echo ""
            echo "Examples:"
            echo "  $0 all          # Start all 8 runners"
            echo "  $0 all 4        # Start first 4 runners"
            echo "  $0 status       # Show status"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
