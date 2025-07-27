#!/bin/bash

# Ultra-simple workflow command
# Usage: ./w [command]

case "${1:-help}" in
    "s"|"status")
        ./scripts/workflow-helper.sh status
        ;;
    "t"|"tasks")
        ./scripts/workflow-helper.sh tasks
        ;;
    "c"|"check")
        ./scripts/workflow-helper.sh check
        ;;
    "b"|"branch")
        echo "Expected: $(./scripts/workflow-helper.sh branch)"
        echo "Current:  $(git branch --show-current)"
        ;;
    "l"|"list")
        ./tm list
        ;;
    "n"|"next")
        ./tm next
        ;;
    "help"|"h"|*)
        echo "🔧 Ultra-Simple Workflow Commands:"
        echo "  ./w s     - Show status & assignments"
        echo "  ./w t     - Show your tasks"
        echo "  ./w c     - Check if you're on right branch"
        echo "  ./w b     - Show branch info"
        echo "  ./w l     - List all tasks"
        echo "  ./w n     - Get next task"
        echo ""
        echo "📋 Task Management:"
        echo "  ./tm show 11.1                  - See task details"
        echo "  ./tm set-status --id=11.1 --status=in-progress"
        echo "  ./tm set-status --id=11.1 --status=done"
        ;;
esac