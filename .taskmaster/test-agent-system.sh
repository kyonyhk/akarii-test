#!/bin/bash

# Multi-Agent System Test Suite
# Validates the automated agent orchestration system

PROJECT_ROOT="/Users/kuoloonchong/Desktop/akarii-test"
ORCHESTRATOR="$PROJECT_ROOT/.taskmaster/agent-orchestrator.sh"
LAUNCHER="$PROJECT_ROOT/.taskmaster/launch-agents.sh"
WORKTREE_DIR="$PROJECT_ROOT/../akarii-worktrees"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
    local test_name="$1"
    local result="$2"
    
    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        ((TESTS_FAILED++))
    fi
}

banner() {
    echo -e "${BLUE}"
    echo "==============================================================================="
    echo "  🧪 MULTI-AGENT SYSTEM TEST SUITE"
    echo "  Validating automated agent orchestration system"
    echo "==============================================================================="
    echo -e "${NC}"
}

test_prerequisites() {
    echo -e "${YELLOW}Testing Prerequisites...${NC}"
    
    # Test if scripts exist and are executable
    [ -x "$ORCHESTRATOR" ]
    test_result "Orchestrator script exists and is executable" $?
    
    [ -x "$LAUNCHER" ]
    test_result "Launcher script exists and is executable" $?
    
    [ -x "$PROJECT_ROOT/.taskmaster/agent-dashboard.py" ]
    test_result "Dashboard script exists and is executable" $?
    
    # Test required commands
    command -v claude &> /dev/null
    test_result "Claude Code CLI is available" $?
    
    command -v task-master &> /dev/null
    test_result "Task-master CLI is available" $?
    
    command -v python3 &> /dev/null
    test_result "Python 3 is available" $?
    
    command -v git &> /dev/null
    test_result "Git is available" $?
    
    # Test project structure
    [ -f "$PROJECT_ROOT/.taskmaster/tasks/tasks.json" ]
    test_result "Tasks.json file exists" $?
    
    [ -f "$PROJECT_ROOT/.taskmaster/agent-assignments.json" ]
    test_result "Agent assignments file exists" $?
    
    # Test all agent instruction files exist
    for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
        [ -f "$PROJECT_ROOT/.taskmaster/agents/${agent}-instructions.md" ]
        test_result "Instructions for $agent exist" $?
    done
}

test_json_validity() {
    echo -e "${YELLOW}Testing JSON File Validity...${NC}"
    
    # Test agent-assignments.json
    python3 -c "import json; json.load(open('$PROJECT_ROOT/.taskmaster/agent-assignments.json'))" 2>/dev/null
    test_result "Agent assignments JSON is valid" $?
    
    # Test tasks.json
    python3 -c "import json; json.load(open('$PROJECT_ROOT/.taskmaster/tasks/tasks.json'))" 2>/dev/null
    test_result "Tasks JSON is valid" $?
    
    # Test that all required fields exist in agent assignments
    python3 -c "
import json
with open('$PROJECT_ROOT/.taskmaster/agent-assignments.json') as f:
    data = json.load(f)
    
required_agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
for agent in required_agents:
    assert agent in data['agents'], f'Missing agent: {agent}'
    agent_data = data['agents'][agent]
    assert 'status' in agent_data, f'Missing status for {agent}'
    assert 'assigned_tasks' in agent_data, f'Missing assigned_tasks for {agent}'
    assert 'specialization' in agent_data, f'Missing specialization for {agent}'

print('All agent data is complete')
" 2>/dev/null
    test_result "Agent assignments have all required fields" $?
}

test_orchestrator_functionality() {
    echo -e "${YELLOW}Testing Orchestrator Functionality...${NC}"
    
    # Test orchestrator help
    "$ORCHESTRATOR" 2>/dev/null | grep -q "Multi-Agent Claude Code Orchestrator"
    test_result "Orchestrator shows help message" $?
    
    # Test status command (should not error even with no agents)
    "$ORCHESTRATOR" status >/dev/null 2>&1
    test_result "Orchestrator status command works" $?
    
    # Test init command
    "$ORCHESTRATOR" init >/dev/null 2>&1
    test_result "Orchestrator init command works" $?
}

test_dashboard_functionality() {
    echo -e "${YELLOW}Testing Dashboard Functionality...${NC}"
    
    # Test dashboard can load and display (once mode)
    python3 "$PROJECT_ROOT/.taskmaster/agent-dashboard.py" --once "$PROJECT_ROOT" >/dev/null 2>&1 &
    local dashboard_pid=$!
    sleep 2
    kill $dashboard_pid 2>/dev/null || true
    wait $dashboard_pid 2>/dev/null
    local dashboard_result=$?
    # Dashboard should exit cleanly or be killable
    [ $dashboard_result -eq 0 ] || [ $dashboard_result -eq 143 ] || [ $dashboard_result -eq 130 ]
    test_result "Dashboard can load and display" $?
    
    # Test dashboard can parse JSON files  
    python3 -c "
import json
import os
assignments_file = os.path.join('$PROJECT_ROOT', '.taskmaster', 'agent-assignments.json')
with open(assignments_file, 'r') as f:
    data = json.load(f)
assert 'agents' in data, 'Missing agents key'
print('Dashboard JSON parsing works')
" 2>/dev/null
    test_result "Dashboard can parse JSON files" $?
}

test_git_functionality() {
    echo -e "${YELLOW}Testing Git Functionality...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Test we're on the right branch
    current_branch=$(git branch --show-current)
    [ "$current_branch" = "multi-agent-parallel-dev" ]
    test_result "Currently on multi-agent-parallel-dev branch" $?
    
    # Test git worktree functionality (dry run within project)
    local test_worktree="${PROJECT_ROOT}/../test-worktree-$$"
    mkdir -p "$test_worktree"
    git worktree add "$test_worktree" multi-agent-parallel-dev >/dev/null 2>&1
    local worktree_result=$?
    
    # If worktree creation failed due to branch checkout conflict, try with new branch
    if [ $worktree_result -ne 0 ]; then
        git worktree add -b "test-branch-$$" "$test_worktree" multi-agent-parallel-dev >/dev/null 2>&1
        worktree_result=$?
    fi
    
    # Cleanup test worktree  
    git worktree remove "$test_worktree" --force >/dev/null 2>&1 || true
    git branch -D "test-branch-$$" >/dev/null 2>&1 || true
    rm -rf "$test_worktree" 2>/dev/null || true
    
    test_result "Git worktree functionality works" $worktree_result
    
    # Test task-master integration
    cd "$PROJECT_ROOT"
    task-master list >/dev/null 2>&1
    test_result "Task-master can list tasks" $?
}

test_agent_instructions() {
    echo -e "${YELLOW}Testing Agent Instructions...${NC}"
    
    for agent in agent-prism agent-realtime agent-auth agent-analytics agent-quality agent-review; do
        local instructions_file="$PROJECT_ROOT/.taskmaster/agents/${agent}-instructions.md"
        
        # Check if file has required sections
        grep -q "## Mission" "$instructions_file"
        test_result "$agent instructions has Mission section" $?
        
        grep -q "## Assigned Tasks" "$instructions_file"
        test_result "$agent instructions has Assigned Tasks section" $?
        
        grep -q "## Setup Instructions" "$instructions_file"
        test_result "$agent instructions has Setup Instructions" $?
        
        # Check for Claude Code specific instructions
        grep -q "task-master" "$instructions_file"
        test_result "$agent instructions mentions task-master" $?
    done
}

test_dependency_logic() {
    echo -e "${YELLOW}Testing Dependency Logic...${NC}"
    
    # Test that dependency checking logic works
    python3 -c "
import json
import sys

with open('$PROJECT_ROOT/.taskmaster/agent-assignments.json') as f:
    data = json.load(f)

# Test phase 1 agents have no dependencies
phase1_agents = ['agent-prism', 'agent-realtime', 'agent-auth']
for agent in phase1_agents:
    blocked_by = data['agents'][agent].get('blocked_by', [])
    if blocked_by:
        print(f'ERROR: {agent} should not be blocked by anything')
        sys.exit(1)

# Test phase 2 agents have correct dependencies
analytics_blocked = data['agents']['agent-analytics']['blocked_by']
assert '6.3' in analytics_blocked, 'agent-analytics should be blocked by 6.3'

quality_blocked = data['agents']['agent-quality']['blocked_by']
assert '6.3' in quality_blocked, 'agent-quality should be blocked by 6.3'
assert '5.2' in quality_blocked, 'agent-quality should be blocked by 5.2'

# Test phase 3 agent has correct dependency
review_blocked = data['agents']['agent-review']['blocked_by']
assert '5.7' in review_blocked, 'agent-review should be blocked by 5.7'

print('Dependency logic is correct')
" 2>/dev/null
    test_result "Agent dependency logic is correct" $?
}

test_launcher_functionality() {
    echo -e "${YELLOW}Testing Launcher Functionality...${NC}"
    
    # Test launcher help
    "$LAUNCHER" help | grep -q "MULTI-AGENT CLAUDE CODE DEVELOPMENT SYSTEM"
    test_result "Launcher shows help message" $?
    
    # Test launcher can show status
    "$LAUNCHER" status >/dev/null 2>&1
    test_result "Launcher status command works" $?
}

run_integration_test() {
    echo -e "${YELLOW}Running Integration Test (Init Only)...${NC}"
    
    # Test full initialization without starting agents
    "$LAUNCHER" init >/dev/null 2>&1
    test_result "Full system initialization works" $?
    
    # Cleanup after test
    "$ORCHESTRATOR" cleanup >/dev/null 2>&1
}

run_tests() {
    banner
    
    echo -e "${BLUE}🚀 Starting Test Suite...${NC}"
    echo ""
    
    test_prerequisites
    echo ""
    
    test_json_validity
    echo ""
    
    test_orchestrator_functionality
    echo ""
    
    test_dashboard_functionality
    echo ""
    
    test_git_functionality
    echo ""
    
    test_agent_instructions
    echo ""
    
    test_dependency_logic
    echo ""
    
    test_launcher_functionality
    echo ""
    
    run_integration_test
    echo ""
    
    # Final results
    echo "==============================================================================="
    echo -e "${BLUE}📊 TEST RESULTS${NC}"
    echo "==============================================================================="
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    echo -e "Total Tests: $total_tests"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}✅ The multi-agent system is ready for deployment!${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. ./launch-agents.sh start     # Start the system"
        echo "  2. ./launch-agents.sh dashboard # Monitor progress"
        echo ""
        return 0
    else
        echo ""
        echo -e "${RED}❌ SOME TESTS FAILED!${NC}"
        echo -e "${RED}Please fix the issues before deploying the system.${NC}"
        echo ""
        return 1
    fi
}

# Run the tests
run_tests