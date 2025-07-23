# Claude Code Instructions

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Git Workflow Requirements

**ALWAYS create a new branch, push changes to the remote repository, and create a pull request whenever you start working on a task.** Follow this workflow:

1. **Before starting a task**, create a new feature branch (`git checkout -b feature/task-X-description`)
2. **After completing any subtask**, commit all changes with a descriptive commit message
3. Push the changes to the remote repository (`git push origin feature/task-X-description`)
4. Create a pull request using the GitHub CLI (`gh pr create`)
5. Include a summary of what was accomplished in the PR description
6. Reference the completed subtask ID and task in the commit message and PR title

**Example workflow:**

```bash
# Start new task
git checkout -b feature/task-4-openai-integration

# Work on subtasks and commit progress
git add .
git commit -m "feat: Complete subtask 4.2 - Prompt Template Design for Message Analysis

- Created comprehensive prompt templates in /convex/prompts.ts
- Added structured analysis for statement types, beliefs, trade-offs
- Implemented validation schema and test messages

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to feature branch
git push origin feature/task-4-openai-integration

# Create PR when task is complete
gh pr create --title "Complete Task 4.2: Prompt Template Design" --body "$(cat <<'EOF'
## Summary
- ✅ Implemented comprehensive prompt templates for message analysis
- ✅ Added structured schema for statement classification
- ✅ Created validation functions and test cases

## Test Plan
- [x] Validate prompt templates produce expected JSON structure
- [x] Test with sample messages for accuracy
- [x] Verify schema validation works correctly

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

**This ensures:**

- All work is done in feature branches, keeping main clean
- All progress is tracked in version control with clear branch history
- Each task completion is documented via pull requests
- Team members can review incremental progress before merging
- No work is lost between sessions
- Easy rollback and cherry-pick capabilities
