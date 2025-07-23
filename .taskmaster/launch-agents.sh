#!/bin/bash

# Multi-Agent Claude Code Launcher
# Simple interface to start and manage the automated agent system

PROJECT_ROOT="/Users/kuoloonchong/Desktop/akarii-test"
ORCHESTRATOR="$PROJECT_ROOT/.taskmaster/agent-orchestrator.sh"
DASHBOARD="$PROJECT_ROOT/.taskmaster/agent-dashboard.py"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

banner() {
    echo -e "${BLUE}"
    echo "==============================================================================="
    echo "  🤖 MULTI-AGENT CLAUDE CODE DEVELOPMENT SYSTEM"
    echo "  Automated parallel AI development for Akarii project"
    echo "==============================================================================="
    echo -e "${NC}"
}

show_help() {
    banner
    echo -e "${GREEN}Available Commands:${NC}"
    echo ""
    echo "  🚀 start     - Initialize and start all agents"
    echo "  📊 dashboard - Open real-time monitoring dashboard"  
    echo "  📋 status    - Show current status of all agents"
    echo "  🔍 monitor   - Background monitoring (no new agents)"
    echo "  🧹 cleanup   - Clean up worktrees and kill processes"
    echo "  🔧 init      - Initialize system only (no start)"
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo "  1. ./launch-agents.sh start     # Start all agents"
    echo "  2. ./launch-agents.sh dashboard # Monitor progress"
    echo ""
    echo -e "${YELLOW}Agent Overview:${NC}"
    echo "  Phase 1 (Start Immediately):"
    echo "    • agent-prism    (UI Components)      [2h]"
    echo "    • agent-realtime (Real-time Data)     [3h]"
    echo "    • agent-auth     (Authentication)     [4h]"
    echo ""
    echo "  Phase 2 (After Dependencies):"
    echo "    • agent-analytics (Cost Dashboard)   [3h] (needs auth)"
    echo "    • agent-quality   (Voting & Quality) [6h] (needs auth + prism)"
    echo ""
    echo "  Phase 3 (Final Integration):"
    echo "    • agent-review    (Review Mode)      [5h] (needs realtime)"
    echo ""
    echo "  Expected: ~15h work completed in ~8-10h wall time"
    echo ""
}

check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/.taskmaster/tasks/tasks.json" ]; then
        echo -e "${RED}❌ Error: Not in correct project directory${NC}"
        echo "Expected: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check if Claude Code is available
    if ! command -v claude &> /dev/null; then
        echo -e "${RED}❌ Error: Claude Code CLI not found${NC}"
        echo "Please install Claude Code CLI first"
        exit 1
    fi
    
    # Check if task-master is available
    if ! command -v task-master &> /dev/null; then
        echo -e "${RED}❌ Error: task-master command not found${NC}"
        echo "Please ensure task-master is installed and configured"
        exit 1
    fi
    
    # Check Python 3
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Error: Python 3 not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

start_system() {
    banner
    check_prerequisites
    
    echo -e "${BLUE}🚀 Starting Multi-Agent System...${NC}"
    echo ""
    
    # Show what will happen
    echo -e "${YELLOW}This will:${NC}"
    echo "  1. Create git worktrees for each agent"
    echo "  2. Spawn 3 Claude Code instances immediately (prism, realtime, auth)"
    echo "  3. Start background monitoring and coordination"
    echo "  4. Automatically unblock remaining agents as dependencies complete"
    echo ""
    
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    echo -e "${BLUE}🎯 Starting orchestrator...${NC}"
    
    # Start orchestrator in background
    nohup "$ORCHESTRATOR" start > "$PROJECT_ROOT/.taskmaster/orchestrator-main.log" 2>&1 &
    local orchestrator_pid=$!
    echo "$orchestrator_pid" > "$PROJECT_ROOT/.taskmaster/orchestrator.pid"
    
    echo -e "${GREEN}✅ Orchestrator started with PID: $orchestrator_pid${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  • Monitor progress: ./launch-agents.sh dashboard"
    echo "  • Check status: ./launch-agents.sh status"
    echo "  • View logs: tail -f .taskmaster/orchestrator-main.log"
    echo ""
    echo -e "${BLUE}🎉 Multi-agent development is now running!${NC}"
}

show_dashboard() {
    banner
    echo -e "${BLUE}📊 Dashboard Options:${NC}"
    echo ""
    echo "1. 🌐 Web Dashboard (Recommended)"
    echo "2. 📱 Terminal Dashboard"
    echo ""
    read -p "Choose dashboard type (1/2): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[1]$ ]] || [[ -z $REPLY ]]; then
        echo -e "${BLUE}🚀 Starting Web Dashboard...${NC}"
        echo ""
        echo -e "${GREEN}✨ Features:${NC}"
        echo "  • Real-time agent monitoring"
        echo "  • Visual status indicators"
        echo "  • Live git commit tracking"
        echo "  • Process health monitoring"
        echo "  • Auto-refresh every 5 seconds"
        echo ""
        echo -e "${YELLOW}📍 Dashboard will open at: http://localhost:5000${NC}"
        echo ""
        echo "Press Ctrl+C to stop the dashboard server"
        echo ""
        sleep 3
        
        python3 "$PROJECT_ROOT/.taskmaster/web-dashboard.py"
    else
        echo -e "${BLUE}📱 Opening Terminal Dashboard...${NC}"
        echo ""
        echo "Controls:"
        echo "  • Auto-refresh every 5 seconds"
        echo "  • Press 's' for manual refresh"
        echo "  • Press 'q' to quit"
        echo "  • Press 'l <agent-id>' to view logs"
        echo ""
        echo "Press Ctrl+C to exit dashboard"
        echo ""
        sleep 2
        
        python3 "$DASHBOARD" "$PROJECT_ROOT"
    fi
}

show_status() {
    banner
    echo -e "${BLUE}📋 Current Agent Status:${NC}"
    echo ""
    
    "$ORCHESTRATOR" status
    
    echo ""
    echo -e "${BLUE}📊 Recent Activity:${NC}"
    if [ -f "$PROJECT_ROOT/.taskmaster/orchestrator-main.log" ]; then
        tail -n 10 "$PROJECT_ROOT/.taskmaster/orchestrator-main.log"
    else
        echo "No orchestrator log found. System may not be running."
    fi
}

cleanup_system() {
    banner
    echo -e "${YELLOW}🧹 Cleaning up Multi-Agent System...${NC}"
    echo ""
    
    # Kill orchestrator if running
    if [ -f "$PROJECT_ROOT/.taskmaster/orchestrator.pid" ]; then
        local pid=$(cat "$PROJECT_ROOT/.taskmaster/orchestrator.pid")
        echo "Stopping orchestrator (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.taskmaster/orchestrator.pid"
    fi
    
    # Run orchestrator cleanup
    "$ORCHESTRATOR" cleanup
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main command handling
case "${1:-help}" in
    "start")
        start_system
        ;;
    "dashboard")
        show_dashboard
        ;;
    "status")
        show_status
        ;;
    "monitor")
        banner
        echo -e "${BLUE}🔍 Starting monitoring mode...${NC}"
        "$ORCHESTRATOR" monitor
        ;;
    "cleanup")
        cleanup_system
        ;;
    "init")
        banner
        check_prerequisites
        echo -e "${BLUE}🔧 Initializing system...${NC}"
        "$ORCHESTRATOR" init
        echo -e "${GREEN}✅ Initialization complete${NC}"
        ;;
    "help"|*)
        show_help
        ;;
esac