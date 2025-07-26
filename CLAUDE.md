# Claude Code Instructions

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Flexible Development Workflow

**This project supports both single-worktree and parallel-worktree development modes. The current configuration is managed in `.taskmaster/worktree-config.json`.**

### 🔧 Check Current Workflow Mode

```bash
# Check your current workflow status and assignments
./scripts/workflow-helper.sh status

# See your assigned tasks for this worktree
./scripts/workflow-helper.sh tasks

# Verify you're on the correct branch
./scripts/workflow-helper.sh check
```

### 🏗️ Current Worktree Structure (Tasks 11-17)

**⚠️ This configuration is specific to the current task range and will be updated for future work phases.**

```bash
# View current worktree assignments
cat .taskmaster/worktree-config.json
```

### 📋 Centralized Task Management

**IMPORTANT: Only update tasks from the main worktree or using the central script.**

```bash
# From ANY worktree, use the simplified tm command:
./tm list                                        # View all tasks
./tm show 11.1                                  # See specific task
./tm set-status --id=11.1 --status=in-progress  # Start task
./tm set-status --id=11.1 --status=done         # Complete task

# Or work directly in main worktree:
cd /Users/kuoloonchong/Desktop/akarii-test
task-master next
task-master set-status --id=12.1 --status=done
```

### 🔄 Development Workflow per Worktree

**Each worktree follows this pattern:**

```bash
# 1. Check which tasks are assigned to your worktree
./scripts/task-central.sh show 11  # UI tasks
./scripts/task-central.sh show 12  # Access control tasks

# 2. Mark task as in-progress (centrally)
./scripts/task-central.sh set-status --id=11.1 --status=in-progress

# 3. Do your work (code, test, etc.)
# ... work on the feature ...

# 4. Commit to your feature branch
git add .
git commit -m "feat: Complete subtask 11.1 - MessageBubble Component

- Created MessageBubble.tsx with sent/received variants
- Added shadcn/ui Avatar integration
- Implemented proper styling with Tailwind CSS

Resolves: Task 11.1

🤖 Generated with [Claude Code](https://claude.ai/code)
Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. Push to your feature branch
git push origin feature/ui-redesign

# 6. Mark task as complete (centrally)
./scripts/task-central.sh set-status --id=11.1 --status=done

# 7. When all tasks in your group are done, create PR
gh pr create --title "Complete UI Redesign (Tasks 11.1-11.5)" --body "$(cat <<'EOF'
## Summary
- ✅ Redesigned message bubbles with modern styling
- ✅ Implemented responsive chat layout
- ✅ Added message grouping and smart timestamps
- ✅ Enhanced visual design following WhatsApp/Telegram patterns

## Tasks Completed
- Task 11.1: MessageBubble Component
- Task 11.2: Responsive Chat Layout
- Task 11.3: Message Grouping Logic
- Task 11.4: Integration Testing
- Task 11.5: Visual Regression Testing

## Test Plan
- [x] Components render correctly in Storybook
- [x] Layout responsive across mobile/desktop
- [x] Message grouping works with real data
- [x] Visual design matches modern chat apps

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

### 🎯 Worktree Task Assignments

**UI Redesign Worktree** (`../akarii-ui-redesign/`)

- Task 11: Redesign Core Chat UI Layout
- Task 17: Interactive Chat Input Features

**Multi-Model Worktree** (`../akarii-multi-model/`)

- Task 14: Multi-Model AI Provider Backend and UI

**Role Access Worktree** (`../akarii-role-access/`)

- Task 12: Role-Based Access Control (RBAC)

**Share Feature Worktree** (`../akarii-share-feature/`)

- Task 13: Real-time Collaboration and Sharing

**Conversational AI Worktree** (`../akarii-conversational-ai/`)

- Task 15: Conversational, Context-Aware Responses

**Analytics Worktree** (`../akarii-real-analytics/`)

- Task 16: Real Analytics Data Integration

### ⚠️ Critical Branch Management Rules

**🚨 NEVER COMMIT DIRECTLY TO MAIN BRANCH 🚨**

1. **Feature Branch Only**: Each worktree MUST work on its assigned feature branch
2. **No Direct Main Commits**: NEVER `git checkout main` or commit to main
3. **Pull Request Required**: ALL merges to main happen via PR only
4. **Task Management**: Use `./tm` (not direct task-master) to avoid conflicts
5. **CLAUDE.md Reference**: Always read from main worktree (this file is always current)

### 🔄 Branch Verification Commands

**Before starting work in ANY worktree:**

```bash
# 1. ALWAYS verify you're on the correct feature branch
git branch --show-current

# Expected outputs per worktree:
# akarii-ui-redesign → feature/ui-redesign
# akarii-share-feature → feature/share-enhancement
# akarii-multi-model → feature/multi-model-support
# akarii-conversational-ai → feature/conversational-ai
# akarii-role-access → feature/role-based-access
# akarii-real-analytics → feature/real-analytics

# 2. If on wrong branch, switch immediately:
git checkout feature/your-assigned-branch

# 3. Never switch to main unless reading docs:
# git checkout main  # ❌ DON'T DO THIS IN FEATURE WORKTREES
```

### 🔧 Dynamic Startup Checklist

```bash
# Smart workflow checklist that adapts to current configuration:

# 1. Check your workflow status and assignments
./scripts/workflow-helper.sh status

# 2. Verify you're on the correct branch
./scripts/workflow-helper.sh check

# 3. See your assigned tasks for this worktree
./scripts/workflow-helper.sh tasks

# 4. View detailed task breakdown for your assignments
./tm show 11  # Replace with your assigned task number

# 5. Start working on specific subtask
./tm set-status --id=11.1 --status=in-progress

# 6. Do your development work...

# 7. Commit to the branch shown by workflow-helper
git add .
git commit -m "feat: complete task 11.1 - MessageBubble component"

# 8. Push to your assigned branch
BRANCH=$(./scripts/workflow-helper.sh branch)
git push origin $BRANCH

# 9. Mark task complete
./tm set-status --id=11.1 --status=done

# 10. When ALL assigned tasks done, create PR
gh pr create --title "Complete [Your Feature] Tasks" --body "Ready for review"
```

### 🛡️ Safety Checks

**If you accidentally switch to main:**

```bash
# Emergency: Get back to your feature branch immediately
git checkout feature/your-assigned-branch
# Never commit anything to main!
```

**Before any commit, verify branch:**

```bash
git branch --show-current
# Must show feature/xxx, NEVER main
```

### 🔄 Switching Between Workflow Modes

**To revert to single-worktree mode after completing parallel tasks:**

```bash
# 1. Update configuration
sed -i 's/"workflowMode": "parallel-worktrees"/"workflowMode": "single-worktree"/' .taskmaster/worktree-config.json

# 2. Clean up completed worktrees (after merging PRs)
git worktree remove ../akarii-ui-redesign
git worktree remove ../akarii-share-feature
# ... etc for completed worktrees

# 3. Continue working normally in main worktree
# All task management returns to standard task-master commands
```

**To setup new parallel worktrees for future work:**

```bash
# 1. Update worktree-config.json with new task ranges and worktree paths
# 2. Create new worktrees: git worktree add ../new-feature feature/new-feature
# 3. Copy tm and workflow-helper scripts to new worktrees
# 4. Update CLAUDE.md if needed (this section will guide you)
```

**This ensures:**

- Flexible workflow that adapts to project needs
- Easy transition between single and parallel development
- Configuration-driven approach for future scalability
- Clear task ownership and progress tracking
- Clean integration via Pull Requests
- No lost work between sessions

## Package Manager

**ALWAYS use bun instead of npm for all package management operations.**

```bash
# Use bun for installing packages
bun add package-name
bun add -d dev-package-name

# Use bun for running scripts
bun run dev
bun run build
bun run test
```

## Convex Development Commands

**IMPORTANT: Use the correct Convex commands - NOT package.json scripts.**

```bash
# Start Convex development server (generates types)
bunx convex dev

# Deploy Convex functions
bunx convex deploy

# Run Convex functions locally
bunx convex run functionName

# Reset Convex database (development only)
bunx convex run --prod=false clearAll

# Check Convex status
bunx convex status
```

**Common mistakes to avoid:**

- ❌ `bun run dev:convex` (this script doesn't exist)
- ❌ `npm run convex:dev` (use bun, not npm)
- ✅ `bunx convex dev` (correct command)

**Development workflow:**

1. Start Convex dev server: `bunx convex dev`
2. Start Next.js dev server: `bun run dev`
3. Both servers should run simultaneously for full functionality
