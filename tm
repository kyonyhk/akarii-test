#!/bin/bash

# Task Master Central - Command with Auto-backup
# Usage: ./tm [command]

MAIN_WORKTREE="/Users/kuoloonchong/Desktop/akarii-test"
TASKS_FILE="$MAIN_WORKTREE/.taskmaster/tasks/tasks.json"

# Store original file hash for change detection
if [ -f "$TASKS_FILE" ]; then
    ORIGINAL_HASH=$(shasum -a 256 "$TASKS_FILE" | cut -d' ' -f1)
fi

# Run task-master commands in main worktree
cd "$MAIN_WORKTREE"
task-master "$@"
RESULT_CODE=$?
cd - > /dev/null

# Check if tasks.json was modified and auto-backup if changed
if [ -f "$TASKS_FILE" ] && [ -n "$ORIGINAL_HASH" ]; then
    NEW_HASH=$(shasum -a 256 "$TASKS_FILE" | cut -d' ' -f1)
    
    if [ "$ORIGINAL_HASH" != "$NEW_HASH" ]; then
        # Task file changed - create backup
        echo "📋 Task progress changed - creating backup..."
        "$MAIN_WORKTREE/scripts/backup-tasks.sh" > /dev/null 2>&1
    fi
fi

exit $RESULT_CODE