#!/bin/bash
# Task Master Progress Backup Script

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/Users/kuoloonchong/Desktop/akarii-test/.taskmaster/backups"
TASKS_FILE="/Users/kuoloonchong/Desktop/akarii-test/.taskmaster/tasks/tasks.json"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create timestamped backup
cp "$TASKS_FILE" "$BACKUP_DIR/tasks_backup_$TIMESTAMP.json"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/tasks_backup_*.json | tail -n +11 | xargs rm -f 2>/dev/null

# Optional: Commit to git if tasks.json has changes
if ! git diff --quiet HEAD -- "$TASKS_FILE" 2>/dev/null; then
    git add "$TASKS_FILE"
    git commit -m "chore: Auto-backup task progress - $(date)"
    echo "✅ Task progress committed to git"
else
    echo "ℹ️  No task changes to backup"
fi

echo "📋 Task backup created: tasks_backup_$TIMESTAMP.json"