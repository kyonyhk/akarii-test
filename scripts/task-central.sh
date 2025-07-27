#!/bin/bash

# Central Task Management Script
# Use this script from ANY worktree to manage tasks centrally

MAIN_WORKTREE="/Users/kuoloonchong/Desktop/akarii-test"

# Function to run task-master commands in main worktree
run_task_command() {
    cd "$MAIN_WORKTREE"
    task-master "$@"
    cd - > /dev/null
}

# Show usage
if [ $# -eq 0 ]; then
    echo "🎯 Central Task Management"
    echo "Usage: ./scripts/task-central.sh [task-master-command]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/task-central.sh list"
    echo "  ./scripts/task-central.sh show 11.1"
    echo "  ./scripts/task-central.sh set-status --id=11.1 --status=done"
    echo "  ./scripts/task-central.sh next"
    echo ""
    echo "📍 Current worktree: $(pwd)"
    echo "📍 Main worktree: $MAIN_WORKTREE"
    exit 0
fi

# Run the command in main worktree
echo "🔄 Running in main worktree: task-master $@"
run_task_command "$@"