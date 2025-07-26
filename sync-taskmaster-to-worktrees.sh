#!/bin/bash

# Script to sync .taskmaster directory to all git worktrees
MAIN_REPO="/Users/kuoloonchong/Desktop/akarii-test"
TASKMASTER_DIR="$MAIN_REPO/.taskmaster"

# Check if .taskmaster exists in main repo
if [ ! -d "$TASKMASTER_DIR" ]; then
    echo "Error: .taskmaster directory not found in main repo"
    exit 1
fi

# Get list of all worktrees
echo "Syncing .taskmaster to all worktrees..."

git worktree list | while read worktree_info; do
    # Extract path (first column)
    worktree_path=$(echo "$worktree_info" | awk '{print $1}')
    
    # Skip main repo
    if [ "$worktree_path" == "$MAIN_REPO" ]; then
        echo "Skipping main repo: $worktree_path"
        continue
    fi
    
    echo "Copying .taskmaster to: $worktree_path"
    
    # Remove existing .taskmaster if it exists
    if [ -d "$worktree_path/.taskmaster" ]; then
        rm -rf "$worktree_path/.taskmaster"
    fi
    
    # Copy .taskmaster directory
    cp -r "$TASKMASTER_DIR" "$worktree_path/"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully synced to $worktree_path"
    else
        echo "❌ Failed to sync to $worktree_path"
    fi
done

echo "Done syncing .taskmaster to all worktrees!"