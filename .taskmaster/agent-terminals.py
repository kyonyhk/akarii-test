#!/usr/bin/env python3
"""
Individual Agent Terminal Interface
Provides Claude Code-like control over each agent with real-time output streaming
"""

import json
import os
import time
import threading
import subprocess
from flask import Flask, render_template, jsonify, request
from datetime import datetime
import queue
import select
import signal

app = Flask(__name__)
PROJECT_ROOT = "/Users/kuoloonchong/Desktop/akarii-test"
WORKTREE_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), 'akarii-worktrees')

class AgentTerminal:
    def __init__(self, agent_id):
        self.agent_id = agent_id
        self.worktree_path = os.path.join(WORKTREE_DIR, agent_id)
        self.conversation_history = []
        self.output_stream = queue.Queue()
        self.is_monitoring = False
        self.process = None
        self.status = "stopped"
        
    def start_monitoring(self):
        """Start monitoring agent output in real-time"""
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        monitor_thread = threading.Thread(target=self._monitor_output, daemon=True)
        monitor_thread.start()
        
    def _monitor_output(self):
        """Monitor agent log file for real-time output"""
        log_file = os.path.join(self.worktree_path, 'agent.log')
        
        # Create log file if it doesn't exist
        if not os.path.exists(log_file):
            return
            
        # Start tailing the log file
        try:
            with open(log_file, 'r') as f:
                # Go to end of file
                f.seek(0, 2)
                
                while self.is_monitoring:
                    line = f.readline()
                    if line:
                        timestamp = datetime.now().isoformat()
                        self.output_stream.put({
                            "timestamp": timestamp,
                            "type": "output",
                            "content": line.strip(),
                            "source": "agent"
                        })
                        
                        # Add to conversation history
                        self.conversation_history.append({
                            "timestamp": timestamp,
                            "role": "agent",
                            "content": line.strip()
                        })
                        
                        # Keep history limited
                        if len(self.conversation_history) > 1000:
                            self.conversation_history = self.conversation_history[-500:]
                    else:
                        time.sleep(0.1)
        except Exception as e:
            self.output_stream.put({
                "timestamp": datetime.now().isoformat(),
                "type": "error",
                "content": f"Monitoring error: {str(e)}",
                "source": "system"
            })
    
    def send_command(self, command, user_message=None):
        """Send a command to the agent"""
        timestamp = datetime.now().isoformat()
        
        # Add user message to history
        if user_message:
            self.conversation_history.append({
                "timestamp": timestamp,
                "role": "user", 
                "content": user_message
            })
        
        # Add command to history
        self.conversation_history.append({
            "timestamp": timestamp,
            "role": "system",
            "content": f"Command: {command}"
        })
        
        try:
            if command == "start":
                return self._start_agent()
            elif command == "stop":
                return self._stop_agent()
            elif command == "restart":
                return self._restart_agent()
            elif command == "pause":
                return self._pause_agent()
            elif command == "resume":
                return self._resume_agent()
            elif command.startswith("inject:"):
                message = command[7:]  # Remove "inject:" prefix
                return self._inject_message(message)
            elif command.startswith("redirect:"):
                new_task = command[9:]  # Remove "redirect:" prefix
                return self._redirect_task(new_task)
            else:
                return {"success": False, "error": "Unknown command"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _start_agent(self):
        """Start the agent process"""
        if self.status == "running":
            return {"success": False, "error": "Agent already running"}
            
        # Use orchestrator to start agent
        try:
            orchestrator_script = os.path.join(PROJECT_ROOT, '.taskmaster', 'agent-orchestrator.sh')
            result = subprocess.run([orchestrator_script, 'restart', self.agent_id], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.status = "running"
                self.start_monitoring()
                return {"success": True, "message": f"Started {self.agent_id}"}
            else:
                return {"success": False, "error": result.stderr}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _stop_agent(self):
        """Stop the agent process"""
        pid_file = os.path.join(self.worktree_path, 'agent.pid')
        
        if os.path.exists(pid_file):
            try:
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                os.kill(pid, signal.SIGTERM)
                self.status = "stopped"
                self.is_monitoring = False
                return {"success": True, "message": f"Stopped {self.agent_id}"}
            except Exception as e:
                return {"success": False, "error": str(e)}
        else:
            return {"success": False, "error": "Agent not running"}
    
    def _restart_agent(self):
        """Restart the agent process"""
        self._stop_agent()
        time.sleep(2)
        return self._start_agent()
    
    def _pause_agent(self):
        """Pause agent execution"""
        message = """
🛑 PAUSED BY USER

Please acknowledge this pause request and wait for further instructions:
- Save your current progress immediately
- Do not start new tasks
- Respond with "PAUSED_ACKNOWLEDGED" 
- Wait for resume command

Your work will be preserved and you can continue where you left off.
"""
        return self._inject_message(message)
    
    def _resume_agent(self):
        """Resume agent execution"""
        message = """
✅ RESUMED BY USER

You may now continue with your assigned tasks:
- Resume from where you left off
- Continue normal execution
- Proceed with your current task

Normal operation mode restored.
"""
        return self._inject_message(message)
    
    def _inject_message(self, message):
        """Inject a message into the agent's context"""
        message_file = os.path.join(self.worktree_path, 'user_message.txt')
        
        try:
            # Append to existing messages
            with open(message_file, 'a') as f:
                f.write(f"\n[{datetime.now().isoformat()}] USER MESSAGE:\n{message}\n\n")
            
            # Also create a new instruction file that the agent will read
            instruction_file = os.path.join(self.worktree_path, 'new_instruction.txt')
            with open(instruction_file, 'w') as f:
                f.write(f"""
USER INSTRUCTION RECEIVED: {datetime.now().isoformat()}

{message}

Please acknowledge this instruction and respond accordingly.
""")
            
            return {"success": True, "message": f"Message injected to {self.agent_id}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _redirect_task(self, new_task):
        """Redirect agent to work on a different task"""
        redirect_message = f"""
🎯 TASK REDIRECT BY USER

You are being redirected to work on a new task:

NEW TASK: {new_task}

Instructions:
1. Save your current progress immediately
2. Switch to the new task specified above
3. Respond with "REDIRECT_ACKNOWLEDGED: [new task]"
4. Begin working on the new task

Your previous work has been saved and can be resumed later if needed.
"""
        return self._inject_message(redirect_message)
    
    def get_status(self):
        """Get current agent status"""
        pid_file = os.path.join(self.worktree_path, 'agent.pid')
        running = False
        pid = None
        
        if os.path.exists(pid_file):
            try:
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                os.kill(pid, 0)  # Test if process exists
                running = True
                self.status = "running"
            except:
                running = False
                self.status = "stopped"
        
        return {
            "agent_id": self.agent_id,
            "status": self.status,
            "running": running,
            "pid": pid,
            "conversation_length": len(self.conversation_history)
        }
    
    def get_recent_output(self, lines=50):
        """Get recent output from the agent"""
        output = []
        temp_queue = queue.Queue()
        
        # Get recent items from queue
        while not self.output_stream.empty() and len(output) < lines:
            try:
                item = self.output_stream.get_nowait()
                output.append(item)
                temp_queue.put(item)  # Put back for other consumers
            except queue.Empty:
                break
        
        # Put items back in queue
        while not temp_queue.empty():
            self.output_stream.put(temp_queue.get())
        
        return output[-lines:]  # Return most recent
    
    def get_conversation_history(self, lines=100):
        """Get conversation history with the agent"""
        return self.conversation_history[-lines:]

# Global agent terminals
agent_terminals = {}
agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']

for agent_id in agents:
    agent_terminals[agent_id] = AgentTerminal(agent_id)
    agent_terminals[agent_id].start_monitoring()

@app.route('/')
def terminals_dashboard():
    """Multi-terminal dashboard"""
    return render_template('agent_terminals.html', agents=agents)

@app.route('/api/agents')
def get_all_agents():
    """Get status of all agents"""
    status = {}
    for agent_id, terminal in agent_terminals.items():
        status[agent_id] = terminal.get_status()
    return jsonify(status)

@app.route('/api/agent/<agent_id>/status')
def get_agent_status(agent_id):
    """Get specific agent status"""
    if agent_id not in agent_terminals:
        return jsonify({"error": "Agent not found"}), 404
    
    return jsonify(agent_terminals[agent_id].get_status())

@app.route('/api/agent/<agent_id>/output')
def get_agent_output(agent_id):
    """Get real-time output from agent"""
    if agent_id not in agent_terminals:
        return jsonify({"error": "Agent not found"}), 404
    
    lines = request.args.get('lines', 50, type=int)
    output = agent_terminals[agent_id].get_recent_output(lines)
    return jsonify({"agent_id": agent_id, "output": output})

@app.route('/api/agent/<agent_id>/conversation')
def get_agent_conversation(agent_id):
    """Get conversation history with agent"""
    if agent_id not in agent_terminals:
        return jsonify({"error": "Agent not found"}), 404
    
    lines = request.args.get('lines', 100, type=int)
    conversation = agent_terminals[agent_id].get_conversation_history(lines)
    return jsonify({"agent_id": agent_id, "conversation": conversation})

@app.route('/api/agent/<agent_id>/command', methods=['POST'])
def send_agent_command(agent_id):
    """Send command to specific agent"""
    if agent_id not in agent_terminals:
        return jsonify({"error": "Agent not found"}), 404
    
    data = request.json
    command = data.get('command', '')
    user_message = data.get('message', '')
    
    if not command:
        return jsonify({"error": "Command required"}), 400
    
    result = agent_terminals[agent_id].send_command(command, user_message)
    return jsonify(result)

@app.route('/api/agent/<agent_id>/logs')
def get_agent_logs(agent_id):
    """Get raw log file contents"""
    if agent_id not in agent_terminals:
        return jsonify({"error": "Agent not found"}), 404
    
    log_file = os.path.join(WORKTREE_DIR, agent_id, 'agent.log')
    lines = request.args.get('lines', 100, type=int)
    
    if os.path.exists(log_file):
        try:
            result = subprocess.run(['tail', '-n', str(lines), log_file], 
                                  capture_output=True, text=True)
            logs = result.stdout.split('\n') if result.returncode == 0 else ["Error reading logs"]
        except:
            logs = ["Error accessing log file"]
    else:
        logs = ["Log file not found"]
    
    return jsonify({"agent_id": agent_id, "logs": logs})

def create_terminals_template():
    """Create the agent terminals HTML template"""
    templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
    os.makedirs(templates_dir, exist_ok=True)
    
    template_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🖥️ Agent Terminals - Multi-Agent Control</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; background: #0a0a0a; color: #e2e8f0; overflow: hidden; }
        .header { background: #1a1a2e; padding: 15px; text-align: center; border-bottom: 2px solid #ff6b6b; }
        .header h1 { color: #ff6b6b; font-size: 1.5rem; margin-bottom: 5px; }
        .header .subtitle { color: #94a3b8; font-size: 0.9rem; }
        .terminals-grid { display: grid; grid-template-columns: repeat(3, 1fr); height: calc(100vh - 80px); }
        .terminal-container { border: 1px solid #374151; background: #1e293b; display: flex; flex-direction: column; }
        .terminal-header { background: #374151; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4b5563; }
        .terminal-title { color: #60a5fa; font-weight: bold; font-size: 0.9rem; }
        .terminal-status { font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; }
        .status-running { background: #10b981; color: white; }
        .status-stopped { background: #ef4444; color: white; }
        .status-paused { background: #f59e0b; color: black; }
        .terminal-controls { display: flex; gap: 5px; }
        .control-btn { background: #4b5563; border: none; color: white; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 0.7rem; }
        .control-btn:hover { background: #6b7280; }
        .control-btn.start { background: #10b981; }
        .control-btn.stop { background: #ef4444; }
        .control-btn.restart { background: #f59e0b; }
        .terminal-content { flex: 1; display: flex; flex-direction: column; }
        .output-area { flex: 1; background: #0f172a; padding: 10px; overflow-y: auto; font-size: 0.75rem; line-height: 1.4; }
        .output-line { margin-bottom: 2px; }
        .output-line.user { color: #60a5fa; }
        .output-line.agent { color: #e2e8f0; }
        .output-line.system { color: #f59e0b; }
        .output-line.error { color: #ef4444; }
        .timestamp { color: #6b7280; font-size: 0.7rem; }
        .input-area { background: #374151; padding: 8px; border-top: 1px solid #4b5563; }
        .input-row { display: flex; gap: 5px; margin-bottom: 5px; }
        .command-input { flex: 1; background: #4b5563; border: 1px solid #6b7280; color: #e2e8f0; padding: 5px; border-radius: 3px; font-size: 0.75rem; font-family: inherit; }
        .send-btn { background: #3b82f6; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
        .send-btn:hover { background: #2563eb; }
        .quick-commands { display: flex; gap: 3px; flex-wrap: wrap; }
        .quick-cmd { background: #6b7280; border: none; color: white; padding: 2px 6px; border-radius: 2px; cursor: pointer; font-size: 0.7rem; }
        .quick-cmd:hover { background: #9ca3af; }
        .auto-refresh { position: fixed; top: 10px; right: 10px; background: #1e293b; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; z-index: 1000; }
        .agent-prism { border-color: #ec4899; }
        .agent-realtime { border-color: #10b981; }
        .agent-auth { border-color: #f59e0b; }
        .agent-analytics { border-color: #8b5cf6; }
        .agent-quality { border-color: #06b6d4; }
        .agent-review { border-color: #f97316; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🖥️ Agent Terminals</h1>
        <p class="subtitle">Individual control interfaces for each agent</p>
    </div>
    
    <div class="auto-refresh">
        🔄 Auto-refresh: <span id="countdown">3</span>s
    </div>
    
    <div class="terminals-grid">
        {% for agent in agents %}
        <div class="terminal-container {{ agent }}">
            <div class="terminal-header">
                <div class="terminal-title">{{ agent }}</div>
                <div class="terminal-status" id="status-{{ agent }}">Loading...</div>
                <div class="terminal-controls">
                    <button class="control-btn start" onclick="sendCommand('{{ agent }}', 'start')">▶</button>
                    <button class="control-btn stop" onclick="sendCommand('{{ agent }}', 'stop')">⏹</button>
                    <button class="control-btn restart" onclick="sendCommand('{{ agent }}', 'restart')">🔄</button>
                </div>
            </div>
            
            <div class="terminal-content">
                <div class="output-area" id="output-{{ agent }}">
                    <div class="output-line system">
                        <span class="timestamp">[System]</span> Terminal initialized for {{ agent }}
                    </div>
                </div>
                
                <div class="input-area">
                    <div class="input-row">
                        <input type="text" class="command-input" id="input-{{ agent }}" 
                               placeholder="Type command or message..."
                               onkeypress="if(event.key==='Enter') sendMessage('{{ agent }}')">
                        <button class="send-btn" onclick="sendMessage('{{ agent }}')">Send</button>
                    </div>
                    <div class="quick-commands">
                        <button class="quick-cmd" onclick="sendCommand('{{ agent }}', 'pause')">Pause</button>
                        <button class="quick-cmd" onclick="sendCommand('{{ agent }}', 'resume')">Resume</button>
                        <button class="quick-cmd" onclick="sendQuickMessage('{{ agent }}', 'status')">Status</button>
                        <button class="quick-cmd" onclick="sendQuickMessage('{{ agent }}', 'What are you working on?')">Current Task</button>
                        <button class="quick-cmd" onclick="viewLogs('{{ agent }}')">Logs</button>
                    </div>
                </div>
            </div>
        </div>
        {% endfor %}
    </div>

    <script>
        const agents = {{ agents | tojson }};
        let refreshInterval = 3000; // 3 seconds
        let countdownTimer;

        async function loadAllStatuses() {
            try {
                const response = await fetch('/api/agents');
                const statuses = await response.json();
                
                for (const agentId in statuses) {
                    updateAgentStatus(agentId, statuses[agentId]);
                    await loadAgentOutput(agentId);
                }
            } catch (error) {
                console.error('Error loading statuses:', error);
            }
        }

        function updateAgentStatus(agentId, status) {
            const statusEl = document.getElementById(`status-${agentId}`);
            if (statusEl) {
                const statusClass = status.running ? 'status-running' : 'status-stopped';
                const statusText = status.running ? '🟢 RUNNING' : '🔴 STOPPED';
                statusEl.className = `terminal-status ${statusClass}`;
                statusEl.textContent = statusText;
            }
        }

        async function loadAgentOutput(agentId) {
            try {
                const response = await fetch(`/api/agent/${agentId}/output?lines=20`);
                const data = await response.json();
                
                const outputEl = document.getElementById(`output-${agentId}`);
                if (outputEl && data.output) {
                    // Keep existing content and add new
                    const existingLines = outputEl.querySelectorAll('.output-line').length;
                    
                    data.output.forEach(item => {
                        const line = document.createElement('div');
                        line.className = `output-line ${item.source}`;
                        
                        const timestamp = new Date(item.timestamp).toLocaleTimeString();
                        line.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(item.content)}`;
                        
                        outputEl.appendChild(line);
                    });
                    
                    // Keep only last 50 lines
                    const lines = outputEl.querySelectorAll('.output-line');
                    if (lines.length > 50) {
                        for (let i = 0; i < lines.length - 50; i++) {
                            lines[i].remove();
                        }
                    }
                    
                    // Auto-scroll to bottom
                    outputEl.scrollTop = outputEl.scrollHeight;
                }
            } catch (error) {
                console.error(`Error loading output for ${agentId}:`, error);
            }
        }

        async function sendCommand(agentId, command) {
            try {
                const response = await fetch(`/api/agent/${agentId}/command`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command })
                });
                
                const result = await response.json();
                
                // Add command to output
                addOutputLine(agentId, 'system', `Command: ${command} - ${result.success ? 'Success' : 'Failed: ' + result.error}`);
                
                // Refresh status
                setTimeout(() => loadAllStatuses(), 1000);
            } catch (error) {
                addOutputLine(agentId, 'error', `Command failed: ${error.message}`);
            }
        }

        async function sendMessage(agentId) {
            const input = document.getElementById(`input-${agentId}`);
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message to output
            addOutputLine(agentId, 'user', `You: ${message}`);
            input.value = '';
            
            // Determine if it's a command or message
            if (message.startsWith('/')) {
                const command = message.substring(1);
                await sendCommand(agentId, command);
            } else {
                // Send as injected message
                await sendCommand(agentId, `inject:${message}`);
            }
        }

        async function sendQuickMessage(agentId, message) {
            addOutputLine(agentId, 'user', `You: ${message}`);
            await sendCommand(agentId, `inject:${message}`);
        }

        function addOutputLine(agentId, type, content) {
            const outputEl = document.getElementById(`output-${agentId}`);
            if (outputEl) {
                const line = document.createElement('div');
                line.className = `output-line ${type}`;
                
                const timestamp = new Date().toLocaleTimeString();
                line.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(content)}`;
                
                outputEl.appendChild(line);
                outputEl.scrollTop = outputEl.scrollHeight;
            }
        }

        async function viewLogs(agentId) {
            try {
                const response = await fetch(`/api/agent/${agentId}/logs?lines=200`);
                const data = await response.json();
                
                const newWindow = window.open('', '_blank');
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${agentId} - Full Logs</title>
                            <style>
                                body { background: #0f172a; color: #e2e8f0; font-family: monospace; padding: 20px; }
                                .log-line { margin-bottom: 5px; }
                                .timestamp { color: #6b7280; }
                            </style>
                        </head>
                        <body>
                            <h2>${agentId} - Complete Logs</h2>
                            <pre>${data.logs.join('\\n')}</pre>
                        </body>
                    </html>
                `);
            } catch (error) {
                addOutputLine(agentId, 'error', `Failed to load logs: ${error.message}`);
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function startCountdown() {
            let count = 3;
            countdownTimer = setInterval(() => {
                count--;
                document.getElementById('countdown').textContent = count;
                if (count <= 0) {
                    clearInterval(countdownTimer);
                    loadAllStatuses();
                    startCountdown();
                }
            }, 1000);
        }

        // Initialize
        loadAllStatuses();
        startCountdown();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key >= '1' && e.key <= '6') {
                const agentIndex = parseInt(e.key) - 1;
                if (agentIndex < agents.length) {
                    const agentId = agents[agentIndex];
                    document.getElementById(`input-${agentId}`).focus();
                }
            }
        });
    </script>
</body>
</html>'''
    
    template_path = os.path.join(templates_dir, 'agent_terminals.html')
    with open(template_path, 'w') as f:
        f.write(template_content)

if __name__ == '__main__':
    create_terminals_template()
    print("🖥️ Agent Terminals Interface starting...")
    print("📊 Open http://localhost:7500 in your browser")
    print("🎛️ Individual control terminals for each agent")
    print("")
    print("Features:")
    print("  • Real-time output streaming from each agent")
    print("  • Direct message injection to specific agents")
    print("  • Individual agent controls (start/stop/pause/resume)")
    print("  • Command interface similar to Claude Code")
    print("  • Live conversation history with each agent")
    print("  • Quick action buttons for common commands")
    print("")
    print("Keyboard shortcuts:")
    print("  • Ctrl+1-6: Focus on agent input field")
    print("  • Enter: Send message to focused agent")
    print("")
    app.run(host='0.0.0.0', port=7500, debug=False)