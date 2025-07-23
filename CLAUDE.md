# Claude Code Instructions

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Git Workflow Requirements

**ALWAYS push changes to the remote repository and create a pull request whenever you finish with a subtask.** Follow this workflow:

1. **After completing any subtask**, commit all changes with a descriptive commit message
2. Push the changes to the remote repository (`git push origin main`)
3. Create a pull request using the GitHub CLI (`gh pr create`)
4. Include a summary of what was accomplished in the PR description
5. Reference the completed subtask ID and task in the commit message and PR title

**Example workflow:**

```bash
git add .
git commit -m "feat: Complete subtask 4.2 - Prompt Template Design for Message Analysis

- Created comprehensive prompt templates in /convex/prompts.ts
- Added structured analysis for statement types, beliefs, trade-offs
- Implemented validation schema and test messages

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
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

- All progress is tracked in version control
- Each subtask completion is documented
- Team members can review incremental progress
- No work is lost between sessions
