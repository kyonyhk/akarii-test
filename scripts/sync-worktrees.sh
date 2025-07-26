#!/bin/bash

# Script to sync critical files to all worktrees
MAIN_REPO="/Users/kuoloonchong/Desktop/akarii-test"

echo "🔄 Syncing critical files to all worktrees..."

# Get list of all worktrees except main
git worktree list | grep -v "$MAIN_REPO" | awk '{print $1}' | while read worktree; do
    echo ""
    echo "📁 Syncing to: $worktree"
    
    # Copy CLAUDE.md
    if cp CLAUDE.md "$worktree/CLAUDE.md" 2>/dev/null; then
        echo "  ✅ CLAUDE.md synced"
    else
        echo "  ❌ Failed to sync CLAUDE.md"
    fi
    
    # Copy .mcp.json
    if cp .mcp.json "$worktree/.mcp.json" 2>/dev/null; then
        echo "  ✅ .mcp.json synced"
    else
        echo "  ❌ Failed to sync .mcp.json"
    fi
    
    # Copy workflow scripts if they exist
    if [ -f tm ]; then
        if cp tm "$worktree/tm" 2>/dev/null; then
            chmod +x "$worktree/tm"
            echo "  ✅ tm script synced"
        else
            echo "  ❌ Failed to sync tm script"
        fi
    fi
    
    if [ -f w ]; then
        if cp w "$worktree/w" 2>/dev/null; then
            chmod +x "$worktree/w"
            echo "  ✅ w script synced"
        else
            echo "  ❌ Failed to sync w script"
        fi
    fi
    
    # Copy scripts directory
    if [ -d scripts ]; then
        if cp -r scripts "$worktree/" 2>/dev/null; then
            chmod +x "$worktree/scripts/"*.sh 2>/dev/null
            echo "  ✅ scripts directory synced"
        else
            echo "  ❌ Failed to sync scripts directory"
        fi
    fi
done

echo ""
echo "🎉 Worktree sync complete!"
echo "💡 Run this script whenever you update CLAUDE.md or workflow files"