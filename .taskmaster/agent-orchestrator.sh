#!/bin/bash

# Multi-Agent Claude Code Orchestrator
# Automatically spawns and manages multiple Claude Code instances for parallel development

set -e

PROJECT_ROOT="/Users/kuoloonchong/Desktop/akarii-test"
MAIN_BRANCH="main"
WORKTREE_DIR="${PROJECT_ROOT}/../akarii-worktrees"
AGENT_ASSIGNMENTS="${PROJECT_ROOT}/.taskmaster/agent-assignments.json"
ORCHESTRATOR_LOG="${PROJECT_ROOT}/.taskmaster/orchestrator.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ORCHESTRATOR_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$ORCHESTRATOR_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$ORCHESTRATOR_LOG"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$ORCHESTRATOR_LOG"
}

# Initialize orchestrator
init_orchestrator() {
    log "Initializing Multi-Agent Orchestrator"
    
    # Create worktree directory
    mkdir -p "$WORKTREE_DIR"
    
    # Initialize log
    echo "=== Multi-Agent Orchestrator Started $(date) ===" > "$ORCHESTRATOR_LOG"
    
    # Ensure we're on the right branch
    cd "$PROJECT_ROOT"
    git checkout "$MAIN_BRANCH"
    git pull origin "$MAIN_BRANCH" 2>/dev/null || warn "Could not pull from origin (might not exist yet)"
    
    success "Orchestrator initialized"
}

# Create git worktree for an agent
create_agent_worktree() {
    local agent_id="$1"
    local branch_name="$2"
    local worktree_path="${WORKTREE_DIR}/${agent_id}"
    
    log "Creating worktree for ${agent_id} at ${worktree_path}"
    
    cd "$PROJECT_ROOT"
    
    # Remove existing worktree if it exists
    if [ -d "$worktree_path" ]; then
        warn "Worktree already exists for ${agent_id}, removing..."
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        git branch -D "$branch_name" 2>/dev/null || true
    fi
    
    # Create new worktree with unique branch
    git worktree add -b "$branch_name" "$worktree_path" "$MAIN_BRANCH"
    cd "$worktree_path"
    
    success "Created worktree for ${agent_id} on branch ${branch_name}"
}

# Get agent status from assignments file
get_agent_status() {
    local agent_id="$1"
    python3 -c "
import json
with open('$AGENT_ASSIGNMENTS', 'r') as f:
    data = json.load(f)
print(data['agents']['$agent_id']['status'])
" 2>/dev/null || echo "unknown"
}

# Update agent status in assignments file
update_agent_status() {
    local agent_id="$1"
    local new_status="$2"
    
    python3 -c "
import json
with open('$AGENT_ASSIGNMENTS', 'r') as f:
    data = json.load(f)
data['agents']['$agent_id']['status'] = '$new_status'
data['agents']['$agent_id']['last_update'] = '$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'
with open('$AGENT_ASSIGNMENTS', 'w') as f:
    json.dump(data, f, indent=2)
"
    log "Updated ${agent_id} status to ${new_status}"
}

# Check if agent dependencies are met
check_agent_dependencies() {
    local agent_id="$1"
    
    # Get blocked_by list for the agent
    local blocked_by=$(python3 -c "
import json
with open('$AGENT_ASSIGNMENTS', 'r') as f:
    data = json.load(f)
blocked = data['agents']['$agent_id'].get('blocked_by', [])
print(','.join(blocked))
" 2>/dev/null)
    
    if [ -z "$blocked_by" ]; then
        return 0  # No dependencies, ready to go
    fi
    
    # Check if all blocking tasks are complete
    IFS=',' read -ra DEPS <<< "$blocked_by"
    for dep in "${DEPS[@]}"; do
        if [ ! -z "$dep" ]; then
            # Check task status using task-master
            cd "$PROJECT_ROOT"
            local task_status=$(task-master show "$dep" 2>/dev/null | grep '"status"' | cut -d'"' -f4 || echo "pending")
            if [ "$task_status" != "done" ]; then
                return 1  # Dependencies not met
            fi
        fi
    done
    
    return 0  # All dependencies met
}

# Generate Claude Code prompt for an agent
generate_agent_prompt() {
    local agent_id="$1"
    local instructions_file="${PROJECT_ROOT}/.taskmaster/agents/${agent_id}-instructions.md"
    
    cat << EOF
You are ${agent_id} in a multi-agent parallel development system. Your role is to work autonomously on your assigned tasks while coordinating with other agents.

CRITICAL INSTRUCTIONS:
1. Read and follow your agent instructions EXACTLY: 
$(cat "$instructions_file")

2. COORDINATION REQUIREMENTS:
   - Update .taskmaster/agent-assignments.json every 30 minutes with your progress
   - Use task-master commands to track your work: task-master set-status --id=X.Y --status=in-progress
   - Commit your work frequently with descriptive messages
   - When you complete critical handoff tasks, immediately update status to "done"

3. WORKFLOW:
   - Start with your first assigned task
   - Follow the technical specifications exactly
   - Test your work before marking complete
   - Move to next task when current is done
   - Update both task-master and agent-assignments.json when complete

4. FILE OWNERSHIP:
   - Only modify files you own (see instructions)
   - Coordinate changes to shared files via comments
   - Never force-push or overwrite other agents' work

5. COMPLETION CRITERIA:
   - Mark task complete only when fully working
   - Run tests/lint as specified in instructions
   - Commit all changes before marking complete

Start working immediately on your assigned tasks. Be autonomous but coordinated.
EOF
}

# Spawn a Claude Code instance for an agent
spawn_agent() {
    local agent_id="$1"
    local branch_name="$2"
    local worktree_path="${WORKTREE_DIR}/${agent_id}"
    
    log "Spawning Claude Code instance for ${agent_id}"
    
    # Generate the prompt
    local prompt=$(generate_agent_prompt "$agent_id")
    
    # Create communication files for the agent
    touch "${worktree_path}/user_message.txt"
    touch "${worktree_path}/new_instruction.txt"
    touch "${worktree_path}/agent_context.json"
    
    # Create a script to run the agent
    local agent_script="${worktree_path}/run_agent.sh"
    cat > "$agent_script" << EOF
#!/bin/bash
cd "$worktree_path"
echo "Starting ${agent_id} in worktree: \$(pwd)"
echo "Branch: \$(git branch --show-current)"
claude -p "\$(cat << 'PROMPT_END'
$prompt
PROMPT_END
)"
EOF
    
    chmod +x "$agent_script"
    
    # Run the agent in background
    log "Starting ${agent_id} in background..."
    nohup bash "$agent_script" > "${worktree_path}/agent.log" 2>&1 &
    local agent_pid=$!
    
    # Store the PID for monitoring
    echo "$agent_pid" > "${worktree_path}/agent.pid"
    
    # Update status
    update_agent_status "$agent_id" "in-progress"
    
    success "Spawned ${agent_id} with PID ${agent_pid}"
}

# Monitor agent progress
monitor_agent() {
    local agent_id="$1"
    local worktree_path="${WORKTREE_DIR}/${agent_id}"
    local pid_file="${worktree_path}/agent.pid"
    
    if [ ! -f "$pid_file" ]; then
        return 1
    fi
    
    local pid=$(cat "$pid_file")
    
    # Check if process is still running
    if ! kill -0 "$pid" 2>/dev/null; then
        warn "${agent_id} process (PID: ${pid}) has stopped"
        return 1
    fi
    
    # Check recent activity (git commits)
    cd "$worktree_path"
    local last_commit=$(git log -1 --format="%cr" 2>/dev/null || echo "never")
    
    log "${agent_id}: PID ${pid} active, last commit: ${last_commit}"
    return 0
}

# Check for handoff triggers
check_handoffs() {
    log "Checking for handoff triggers..."
    
    cd "$PROJECT_ROOT"
    
    # Check if task 6.3 is complete (unblocks analytics + quality)
    local task_6_3_status=$(task-master show 6.3 2>/dev/null | grep '"status"' | cut -d'"' -f4 || echo "pending")
    if [ "$task_6_3_status" = "done" ]; then
        # Unblock agent-analytics and agent-quality
        local analytics_status=$(get_agent_status "agent-analytics")
        local quality_status=$(get_agent_status "agent-quality")
        
        if [ "$analytics_status" = "waiting" ]; then
            log "Task 6.3 complete! Unblocking agent-analytics"
            start_agent "agent-analytics"
        fi
        
        # Check if agent-quality can start (needs both 6.3 and 5.2)
        local task_5_2_status=$(task-master show 5.2 2>/dev/null | grep '"status"' | cut -d'"' -f4 || echo "pending")
        if [ "$quality_status" = "waiting" ] && [ "$task_5_2_status" = "done" ]; then
            log "Tasks 6.3 and 5.2 complete! Unblocking agent-quality"
            start_agent "agent-quality"
        fi
    fi
    
    # Check if task 5.7 is complete (unblocks review)
    local task_5_7_status=$(task-master show 5.7 2>/dev/null | grep '"status"' | cut -d'"' -f4 || echo "pending")
    if [ "$task_5_7_status" = "done" ]; then
        local review_status=$(get_agent_status "agent-review")
        if [ "$review_status" = "waiting" ]; then
            log "Task 5.7 complete! Unblocking agent-review"
            start_agent "agent-review"
        fi
    fi
}

# Start a specific agent
start_agent() {
    local agent_id="$1"
    
    # Get agent info from assignments
    local branch_name=$(python3 -c "
import json
with open('$AGENT_ASSIGNMENTS', 'r') as f:
    data = json.load(f)
print(data['coordination_rules']['branch_strategy']['feature_branches']['$agent_id'])
")
    
    log "Starting agent: ${agent_id}"
    
    # Check dependencies
    if ! check_agent_dependencies "$agent_id"; then
        warn "${agent_id} dependencies not met, skipping"
        return 1
    fi
    
    # Create worktree
    create_agent_worktree "$agent_id" "$branch_name"
    
    # Spawn the agent
    spawn_agent "$agent_id" "$branch_name"
    
    return 0
}

# Main orchestrator loop
run_orchestrator() {
    log "Starting orchestrator main loop"
    
    # Start Phase 1 agents immediately
    local phase1_agents=("agent-prism" "agent-realtime" "agent-auth")
    
    for agent in "${phase1_agents[@]}"; do
        start_agent "$agent"
        sleep 5  # Stagger startup
    done
    
    # Main monitoring loop
    while true; do
        sleep 30  # Check every 30 seconds
        
        log "=== Monitoring cycle ==="
        
        # Monitor active agents with auto-recovery
        for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
            local status=$(get_agent_status "$agent")
            if [ "$status" = "in-progress" ]; then
                if ! monitor_agent "$agent"; then
                    warn "Agent ${agent} needs attention - attempting auto-restart"
                    
                    # Attempt auto-restart if dependencies are met
                    if check_agent_dependencies "$agent"; then
                        log "Auto-restarting ${agent}"
                        start_agent "$agent"
                    else
                        warn "Cannot auto-restart ${agent} - dependencies not met"
                        # Mark as waiting for dependencies
                        update_agent_status "$agent" "waiting"
                    fi
                fi
            fi
        done
        
        # Check for handoff opportunities
        check_handoffs
        
        # Check if all agents are complete
        local all_complete=true
        for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
            local status=$(get_agent_status "$agent")
            if [ "$status" != "completed" ]; then
                all_complete=false
                break
            fi
        done
        
        if [ "$all_complete" = true ]; then
            success "All agents completed! Multi-agent development finished!"
            break
        fi
    done
}

# Command line interface
case "${1:-}" in
    "init")
        init_orchestrator
        ;;
    "start")
        init_orchestrator
        run_orchestrator
        ;;
    "monitor")
        # Just run monitoring without starting new agents
        while true; do
            sleep 30
            for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
                status=$(get_agent_status "$agent")
                log "${agent}: ${status}"
                if [ "$status" = "in-progress" ]; then
                    monitor_agent "$agent"
                fi
            done
            check_handoffs
        done
        ;;
    "status")
        # Show status of all agents
        for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
            status=$(get_agent_status "$agent")
            echo "${agent}: ${status}"
        done
        ;;
    "restart")
        # Restart a specific agent
        if [ -z "$2" ]; then
            error "Usage: $0 restart <agent-id>"
            exit 1
        fi
        local agent_id="$2"
        log "Restarting agent: ${agent_id}"
        
        # Kill existing process
        local worktree_path="${WORKTREE_DIR}/${agent_id}"
        local pid_file="${worktree_path}/agent.pid"
        
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            log "Killing existing ${agent_id} process (PID: ${pid})"
            kill "$pid" 2>/dev/null || true
            sleep 2
        fi
        
        # Restart if dependencies are met
        if check_agent_dependencies "$agent_id"; then
            start_agent "$agent_id"
            success "Restarted ${agent_id}"
        else
            warn "Cannot restart ${agent_id} - dependencies not met"
        fi
        ;;
    "cleanup")
        # Clean up worktrees and processes
        log "Cleaning up worktrees and processes"
        cd "$PROJECT_ROOT"
        for worktree in "${WORKTREE_DIR}"/agent-*; do
            if [ -d "$worktree" ]; then
                pid_file="${worktree}/agent.pid"
                if [ -f "$pid_file" ]; then
                    pid=$(cat "$pid_file")
                    kill "$pid" 2>/dev/null || true
                fi
                git worktree remove "$worktree" --force 2>/dev/null || true
            fi
        done
        rm -rf "$WORKTREE_DIR"
        ;;
    *)
        echo "Multi-Agent Claude Code Orchestrator"
        echo ""
        echo "Usage: $0 {init|start|monitor|status|restart|cleanup}"
        echo ""
        echo "Commands:"
        echo "  init     - Initialize orchestrator (create worktrees, etc)"
        echo "  start    - Initialize and start all agents"
        echo "  monitor  - Monitor existing agents (no new spawns)"
        echo "  status   - Show status of all agents"
        echo "  restart  - Restart a specific agent (e.g., restart agent-prism)"
        echo "  cleanup  - Clean up worktrees and kill processes"
        echo ""
        exit 1
        ;;
esac