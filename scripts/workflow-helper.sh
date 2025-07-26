#!/bin/bash

# Workflow Helper - Reads configuration and provides dynamic instructions
CONFIG_FILE="/Users/kuoloonchong/Desktop/akarii-test/.taskmaster/worktree-config.json"

# Function to read JSON config (requires jq, fallback to manual parsing)
get_workflow_mode() {
    if command -v jq &> /dev/null; then
        jq -r '.workflowMode' "$CONFIG_FILE" 2>/dev/null || echo "single-worktree"
    else
        grep -o '"workflowMode": *"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4 2>/dev/null || echo "single-worktree"
    fi
}

get_current_worktree_info() {
    local current_dir=$(pwd)
    local worktree_name=$(basename "$current_dir")
    
    if command -v jq &> /dev/null; then
        jq -r --arg dir "$current_dir" '.worktrees[$dir] // empty' "$CONFIG_FILE" 2>/dev/null
    else
        echo "Install jq for full configuration support"
    fi
}

get_assigned_tasks() {
    local current_dir=$(pwd)
    
    if command -v jq &> /dev/null; then
        jq -r --arg dir "$current_dir" '.worktrees[$dir].tasks[]? // empty' "$CONFIG_FILE" 2>/dev/null | tr '\n' ',' | sed 's/,$//'
    else
        # Fallback - extract from config manually
        case "$current_dir" in
            *"ui-redesign"*) echo "11,17" ;;
            *"share-feature"*) echo "13" ;;
            *"multi-model"*) echo "14" ;;
            *"conversational-ai"*) echo "15" ;;
            *"role-access"*) echo "12" ;;
            *"real-analytics"*) echo "16" ;;
            *) echo "all" ;;
        esac
    fi
}

get_assigned_branch() {
    local current_dir=$(pwd)
    
    if command -v jq &> /dev/null; then
        jq -r --arg dir "$current_dir" '.worktrees[$dir].branch // "main"' "$CONFIG_FILE" 2>/dev/null
    else
        # Fallback - extract from config manually
        case "$current_dir" in
            *"ui-redesign"*) echo "feature/ui-redesign" ;;
            *"share-feature"*) echo "feature/share-enhancement" ;;
            *"multi-model"*) echo "feature/multi-model-support" ;;
            *"conversational-ai"*) echo "feature/conversational-ai" ;;
            *"role-access"*) echo "feature/role-based-access" ;;
            *"real-analytics"*) echo "feature/real-analytics" ;;
            *) echo "main" ;;
        esac
    fi
}

# Main workflow helper functions
show_workflow_status() {
    local mode=$(get_workflow_mode)
    echo "🔧 Current Workflow Mode: $mode"
    
    if [ "$mode" = "parallel-worktrees" ]; then
        echo "📍 Current Directory: $(pwd)"
        echo "🎯 Assigned Tasks: $(get_assigned_tasks)"
        echo "🌿 Expected Branch: $(get_assigned_branch)"
        echo "🌿 Current Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
        
        local expected_branch=$(get_assigned_branch)
        local current_branch=$(git branch --show-current 2>/dev/null)
        
        if [ "$current_branch" != "$expected_branch" ]; then
            echo "⚠️  WARNING: You're on the wrong branch!"
            echo "   Run: git checkout $expected_branch"
        else
            echo "✅ Branch is correct"
        fi
    else
        echo "📝 Standard single-worktree workflow active"
    fi
}

show_assigned_tasks() {
    local tasks=$(get_assigned_tasks)
    if [ "$tasks" != "all" ] && [ -n "$tasks" ]; then
        echo "🎯 Your assigned tasks: $tasks"
        IFS=',' read -ra TASK_ARRAY <<< "$tasks"
        for task in "${TASK_ARRAY[@]}"; do
            echo "   Task $task: ./tm show $task"
        done
    else
        echo "📋 All tasks available: ./tm list"
    fi
}

# Command line interface
case "${1:-status}" in
    "status")
        show_workflow_status
        ;;
    "tasks")
        show_assigned_tasks
        ;;
    "branch")
        echo $(get_assigned_branch)
        ;;
    "check")
        local expected=$(get_assigned_branch)
        local current=$(git branch --show-current 2>/dev/null)
        if [ "$current" = "$expected" ]; then
            echo "✅ Correct branch: $current"
            exit 0
        else
            echo "❌ Wrong branch. Expected: $expected, Current: $current"
            echo "Fix with: git checkout $expected"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [status|tasks|branch|check]"
        echo "  status - Show current workflow status"
        echo "  tasks  - Show assigned tasks for this worktree"
        echo "  branch - Show expected branch name"
        echo "  check  - Verify you're on correct branch"
        ;;
esac