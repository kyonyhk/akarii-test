#!/usr/bin/env python3
"""
Master Control Interface for Multi-Agent System
Allows real-time communication and intervention during agent execution
"""

import json
import os
import time
import threading
from flask import Flask, request, jsonify, render_template
from datetime import datetime
import subprocess
import signal

app = Flask(__name__)
PROJECT_ROOT = "/Users/kuoloonchong/Desktop/akarii-test"
CONTROL_LOG = os.path.join(PROJECT_ROOT, '.taskmaster', 'master-control.log')
AGENT_ASSIGNMENTS = os.path.join(PROJECT_ROOT, '.taskmaster', 'agent-assignments.json')
WORKTREE_DIR = os.path.join(os.path.dirname(PROJECT_ROOT), 'akarii-worktrees')

class MasterController:
    def __init__(self):
        self.message_queue = []
        self.user_messages = []
        self.agent_responses = {}
        self.system_state = "running"
        self.error_queue = []
        
    def log_control_event(self, event_type, message, agent_id=None):
        """Log control events with timestamp"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "type": event_type,
            "message": message,
            "agent_id": agent_id
        }
        
        with open(CONTROL_LOG, 'a') as f:
            f.write(json.dumps(log_entry) + "\n")
            
        print(f"[{timestamp}] {event_type.upper()}: {message}")
        
    def send_message_to_agent(self, agent_id, message):
        """Send a message to a specific agent"""
        agent_path = os.path.join(WORKTREE_DIR, agent_id)
        message_file = os.path.join(agent_path, 'user_message.txt')
        
        try:
            with open(message_file, 'w') as f:
                f.write(f"[{datetime.now().isoformat()}] USER MESSAGE:\n{message}\n\n")
            
            self.log_control_event("message_sent", f"Message sent to {agent_id}: {message[:100]}...", agent_id)
            return True
        except Exception as e:
            self.log_control_event("error", f"Failed to send message to {agent_id}: {str(e)}", agent_id)
            return False
    
    def broadcast_message(self, message):
        """Send message to all active agents"""
        results = {}
        agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
        
        for agent in agents:
            results[agent] = self.send_message_to_agent(agent, message)
            
        self.log_control_event("broadcast", f"Broadcast message: {message[:100]}...")
        return results
    
    def pause_system(self):
        """Pause all agent execution"""
        self.system_state = "paused"
        
        # Send pause signal to all agents
        pause_message = """
🛑 SYSTEM PAUSED BY USER

Please acknowledge this message and wait for further instructions.
- Save your current progress immediately
- Do not start new tasks
- Respond with your current status
- Wait for resume command

Type 'STATUS_ACKNOWLEDGED' when ready.
"""
        
        results = self.broadcast_message(pause_message)
        self.log_control_event("system_control", "System paused by user request")
        return results
    
    def resume_system(self):
        """Resume agent execution"""
        self.system_state = "running"
        
        resume_message = """
✅ SYSTEM RESUMED

You may continue with your assigned tasks.
- Resume from where you left off
- Continue normal execution
- Report any issues immediately

System is now in normal operation mode.
"""
        
        results = self.broadcast_message(resume_message)
        self.log_control_event("system_control", "System resumed by user request")
        return results
    
    def emergency_stop(self):
        """Emergency stop all agents"""
        self.system_state = "emergency_stop"
        
        # Kill all agent processes
        killed_processes = []
        agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
        
        for agent in agents:
            pid_file = os.path.join(WORKTREE_DIR, agent, 'agent.pid')
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    os.kill(pid, signal.SIGTERM)
                    killed_processes.append(f"{agent}:{pid}")
                    self.log_control_event("emergency_stop", f"Killed {agent} process (PID: {pid})", agent)
                except Exception as e:
                    self.log_control_event("error", f"Failed to kill {agent}: {str(e)}", agent)
        
        return killed_processes
    
    def restart_agent(self, agent_id):
        """Restart a specific agent with context preservation"""
        self.log_control_event("agent_restart", f"Attempting to restart {agent_id}", agent_id)
        
        # First, save current context
        agent_path = os.path.join(WORKTREE_DIR, agent_id)
        context_file = os.path.join(agent_path, 'agent_context.json')
        
        context = {
            "restart_time": datetime.now().isoformat(),
            "restart_reason": "manual_restart",
            "previous_session_logs": self.get_agent_logs(agent_id, 50)
        }
        
        try:
            with open(context_file, 'w') as f:
                json.dump(context, f, indent=2)
        except Exception as e:
            self.log_control_event("error", f"Failed to save context for {agent_id}: {str(e)}", agent_id)
        
        # Kill existing process
        pid_file = os.path.join(agent_path, 'agent.pid')
        if os.path.exists(pid_file):
            try:
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                os.kill(pid, signal.SIGTERM)
                time.sleep(2)
            except:
                pass
        
        # Restart via orchestrator
        try:
            orchestrator_script = os.path.join(PROJECT_ROOT, '.taskmaster', 'agent-orchestrator.sh')
            result = subprocess.run([orchestrator_script, 'restart', agent_id], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log_control_event("agent_restart", f"Successfully restarted {agent_id}", agent_id)
                return True
            else:
                self.log_control_event("error", f"Failed to restart {agent_id}: {result.stderr}", agent_id)
                return False
        except Exception as e:
            self.log_control_event("error", f"Exception during {agent_id} restart: {str(e)}", agent_id)
            return False
    
    def get_agent_logs(self, agent_id, lines=20):
        """Get recent logs from an agent"""
        log_file = os.path.join(WORKTREE_DIR, agent_id, 'agent.log')
        if os.path.exists(log_file):
            try:
                result = subprocess.run(['tail', '-n', str(lines), log_file], 
                                      capture_output=True, text=True)
                return result.stdout.split('\n') if result.returncode == 0 else ["No logs available"]
            except:
                return ["Error reading logs"]
        return ["Log file not found"]
    
    def get_system_status(self):
        """Get comprehensive system status"""
        status = {
            "system_state": self.system_state,
            "timestamp": datetime.now().isoformat(),
            "agents": {},
            "recent_messages": self.user_messages[-10:],
            "error_count": len(self.error_queue),
            "recent_errors": self.error_queue[-5:]
        }
        
        agents = ['agent-prism', 'agent-realtime', 'agent-auth', 'agent-analytics', 'agent-quality', 'agent-review']
        for agent in agents:
            pid_file = os.path.join(WORKTREE_DIR, agent, 'agent.pid')
            running = False
            pid = None
            
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    os.kill(pid, 0)  # Test if process exists
                    running = True
                except:
                    running = False
            
            status["agents"][agent] = {
                "running": running,
                "pid": pid,
                "logs": self.get_agent_logs(agent, 5)
            }
        
        return status

# Global controller instance
controller = MasterController()

@app.route('/')
def dashboard():
    """Master control dashboard"""
    return render_template('master_control.html')

@app.route('/api/status')
def get_status():
    """Get system status"""
    return jsonify(controller.get_system_status())

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """Send message to specific agent or broadcast"""
    data = request.json
    message = data.get('message', '')
    agent_id = data.get('agent_id', 'all')
    
    controller.user_messages.append({
        "timestamp": datetime.now().isoformat(),
        "message": message,
        "target": agent_id
    })
    
    if agent_id == 'all':
        results = controller.broadcast_message(message)
    else:
        results = {agent_id: controller.send_message_to_agent(agent_id, message)}
    
    return jsonify({"success": True, "results": results})

@app.route('/api/pause', methods=['POST'])
def pause_system():
    """Pause all agents"""
    results = controller.pause_system()
    return jsonify({"success": True, "results": results})

@app.route('/api/resume', methods=['POST'])
def resume_system():
    """Resume all agents"""
    results = controller.resume_system()
    return jsonify({"success": True, "results": results})

@app.route('/api/emergency_stop', methods=['POST'])
def emergency_stop():
    """Emergency stop all agents"""
    killed = controller.emergency_stop()
    return jsonify({"success": True, "killed_processes": killed})

@app.route('/api/restart_agent', methods=['POST'])
def restart_agent():
    """Restart specific agent"""
    data = request.json
    agent_id = data.get('agent_id')
    
    if not agent_id:
        return jsonify({"success": False, "error": "agent_id required"})
    
    success = controller.restart_agent(agent_id)
    return jsonify({"success": success})

@app.route('/api/logs/<agent_id>')
def get_agent_logs(agent_id):
    """Get logs for specific agent"""
    lines = request.args.get('lines', 50, type=int)
    logs = controller.get_agent_logs(agent_id, lines)
    return jsonify({"agent_id": agent_id, "logs": logs})

def create_control_template():
    """Create the master control HTML template"""
    templates_dir = os.path.join(os.path.dirname(__file__), 'templates')
    os.makedirs(templates_dir, exist_ok=True)
    
    template_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎛️ Master Control - Multi-Agent System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #e2e8f0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: #1a1a2e; border-radius: 10px; border: 2px solid #ff6b6b; }
        .header h1 { color: #ff6b6b; font-size: 2.5rem; margin-bottom: 10px; }
        .header .subtitle { color: #94a3b8; font-size: 1.1rem; }
        .control-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .control-section { background: #1e293b; padding: 20px; border-radius: 10px; border: 1px solid #374151; }
        .control-section h3 { color: #60a5fa; margin-bottom: 15px; }
        .message-area { width: 100%; height: 100px; background: #0f172a; border: 1px solid #374151; border-radius: 5px; padding: 10px; color: #e2e8f0; resize: vertical; }
        .button-group { display: flex; gap: 10px; margin-top: 15px; }
        .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.3s; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-warning { background: #f59e0b; color: black; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn:hover { opacity: 0.8; transform: translateY(-2px); }
        .agent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .agent-card { background: #2d3748; border-radius: 10px; padding: 20px; border: 1px solid #4a5568; }
        .agent-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .agent-name { font-size: 1.2rem; font-weight: bold; }
        .status-online { color: #10b981; }
        .status-offline { color: #ef4444; }
        .status-paused { color: #f59e0b; }
        .logs { background: #0f172a; border-radius: 5px; padding: 10px; margin-top: 10px; font-family: monospace; font-size: 0.8rem; max-height: 200px; overflow-y: auto; }
        .log-line { margin-bottom: 2px; color: #94a3b8; }
        .system-status { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-running { background: #10b981; }
        .status-paused { background: #f59e0b; }
        .status-stopped { background: #ef4444; }
        .auto-refresh { position: fixed; top: 20px; right: 20px; background: #1e293b; padding: 10px; border-radius: 5px; font-size: 0.9rem; }
        select { background: #374151; color: #e2e8f0; border: 1px solid #4b5563; border-radius: 4px; padding: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎛️ Master Control Interface</h1>
            <p class="subtitle">Real-time command and control for multi-agent system</p>
        </div>
        
        <div class="auto-refresh">
            🔄 Auto-refresh: <span id="countdown">10</span>s
        </div>
        
        <div class="system-status">
            <h3>System Status: <span id="system-state">Loading...</span></h3>
            <div id="system-stats"></div>
        </div>
        
        <div class="control-panel">
            <div class="control-section">
                <h3>📢 Message Center</h3>
                <textarea id="message-input" class="message-area" placeholder="Type your message to agents..."></textarea>
                <div style="margin: 10px 0;">
                    <label>Send to: </label>
                    <select id="target-agent">
                        <option value="all">🌐 All Agents</option>
                        <option value="agent-prism">🎨 Agent Prism</option>
                        <option value="agent-realtime">⚡ Agent Realtime</option>
                        <option value="agent-auth">🔐 Agent Auth</option>
                        <option value="agent-analytics">📊 Agent Analytics</option>
                        <option value="agent-quality">✅ Agent Quality</option>
                        <option value="agent-review">👀 Agent Review</option>
                    </select>
                </div>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="sendMessage()">📤 Send Message</button>
                </div>
            </div>
            
            <div class="control-section">
                <h3>🎮 System Control</h3>
                <div class="button-group">
                    <button class="btn btn-warning" onclick="pauseSystem()">⏸️ Pause All</button>
                    <button class="btn btn-success" onclick="resumeSystem()">▶️ Resume All</button>
                </div>
                <div class="button-group" style="margin-top: 10px;">
                    <button class="btn btn-danger" onclick="emergencyStop()">🛑 Emergency Stop</button>
                </div>
                <div id="control-feedback" style="margin-top: 15px; color: #10b981; font-weight: bold;"></div>
            </div>
        </div>
        
        <div class="agent-grid" id="agent-grid">
            <!-- Agents will be populated here -->
        </div>
    </div>

    <script>
        let refreshInterval = 10000; // 10 seconds
        let countdownTimer;

        async function loadStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                renderStatus(data);
            } catch (error) {
                console.error('Error loading status:', error);
            }
        }

        function renderStatus(data) {
            // Update system state
            const stateElement = document.getElementById('system-state');
            const indicator = data.system_state === 'running' ? 'status-running' : 
                            data.system_state === 'paused' ? 'status-paused' : 'status-stopped';
            stateElement.innerHTML = `<span class="status-indicator ${indicator}"></span>${data.system_state.toUpperCase()}`;
            
            // Update system stats
            const runningCount = Object.values(data.agents).filter(a => a.running).length;
            const totalCount = Object.keys(data.agents).length;
            document.getElementById('system-stats').innerHTML = `
                Running: ${runningCount}/${totalCount} | Errors: ${data.error_count} | Last Update: ${new Date(data.timestamp).toLocaleTimeString()}
            `;
            
            // Update agent grid
            const agentGrid = document.getElementById('agent-grid');
            agentGrid.innerHTML = '';
            
            Object.entries(data.agents).forEach(([agentId, agentData]) => {
                const statusClass = agentData.running ? 'status-online' : 'status-offline';
                const statusText = agentData.running ? '🟢 ONLINE' : '🔴 OFFLINE';
                
                const agentCard = document.createElement('div');
                agentCard.className = 'agent-card';
                agentCard.innerHTML = `
                    <div class="agent-header">
                        <div class="agent-name">${agentId}</div>
                        <div class="${statusClass}">${statusText}</div>
                    </div>
                    <div>PID: ${agentData.pid || 'N/A'}</div>
                    <div class="button-group" style="margin: 10px 0;">
                        <button class="btn btn-primary" onclick="restartAgent('${agentId}')">🔄 Restart</button>
                        <button class="btn btn-warning" onclick="viewLogs('${agentId}')">📋 Logs</button>
                    </div>
                    <div class="logs">
                        ${agentData.logs.map(log => `<div class="log-line">${log}</div>`).join('')}
                    </div>
                `;
                agentGrid.appendChild(agentCard);
            });
        }

        async function sendMessage() {
            const message = document.getElementById('message-input').value;
            const target = document.getElementById('target-agent').value;
            
            if (!message.trim()) {
                showFeedback('Please enter a message', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/send_message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, agent_id: target })
                });
                
                const result = await response.json();
                if (result.success) {
                    showFeedback(`Message sent to ${target}`, 'success');
                    document.getElementById('message-input').value = '';
                } else {
                    showFeedback('Failed to send message', 'error');
                }
            } catch (error) {
                showFeedback('Error sending message', 'error');
            }
        }

        async function pauseSystem() {
            try {
                const response = await fetch('/api/pause', { method: 'POST' });
                const result = await response.json();
                showFeedback('System paused', 'success');
                loadStatus();
            } catch (error) {
                showFeedback('Error pausing system', 'error');
            }
        }

        async function resumeSystem() {
            try {
                const response = await fetch('/api/resume', { method: 'POST' });
                const result = await response.json();
                showFeedback('System resumed', 'success');
                loadStatus();
            } catch (error) {
                showFeedback('Error resuming system', 'error');
            }
        }

        async function emergencyStop() {
            if (!confirm('Are you sure you want to emergency stop all agents?')) return;
            
            try {
                const response = await fetch('/api/emergency_stop', { method: 'POST' });
                const result = await response.json();
                showFeedback(`Emergency stop completed. Killed ${result.killed_processes.length} processes`, 'success');
                loadStatus();
            } catch (error) {
                showFeedback('Error during emergency stop', 'error');
            }
        }

        async function restartAgent(agentId) {
            try {
                const response = await fetch('/api/restart_agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agent_id: agentId })
                });
                
                const result = await response.json();
                if (result.success) {
                    showFeedback(`${agentId} restarted successfully`, 'success');
                } else {
                    showFeedback(`Failed to restart ${agentId}`, 'error');
                }
                loadStatus();
            } catch (error) {
                showFeedback(`Error restarting ${agentId}`, 'error');
            }
        }

        async function viewLogs(agentId) {
            try {
                const response = await fetch(`/api/logs/${agentId}?lines=100`);
                const result = await response.json();
                
                const newWindow = window.open('', '_blank');
                newWindow.document.write(`
                    <html>
                        <head><title>${agentId} Logs</title></head>
                        <body style="background: #0f172a; color: #e2e8f0; font-family: monospace; padding: 20px;">
                            <h2>${agentId} Logs</h2>
                            <pre>${result.logs.join('\\n')}</pre>
                        </body>
                    </html>
                `);
            } catch (error) {
                showFeedback(`Error loading logs for ${agentId}`, 'error');
            }
        }

        function showFeedback(message, type) {
            const feedback = document.getElementById('control-feedback');
            feedback.textContent = message;
            feedback.style.color = type === 'success' ? '#10b981' : '#ef4444';
            setTimeout(() => feedback.textContent = '', 3000);
        }

        function startCountdown() {
            let count = 10;
            countdownTimer = setInterval(() => {
                count--;
                document.getElementById('countdown').textContent = count;
                if (count <= 0) {
                    clearInterval(countdownTimer);
                    loadStatus();
                    startCountdown();
                }
            }, 1000);
        }

        // Initialize
        loadStatus();
        startCountdown();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>'''
    
    template_path = os.path.join(templates_dir, 'master_control.html')
    with open(template_path, 'w') as f:
        f.write(template_content)

if __name__ == '__main__':
    create_control_template()
    controller.log_control_event("system_start", "Master Control Interface starting up")
    print("🎛️ Master Control Interface starting...")
    print("📊 Open http://localhost:9000 in your browser")
    print("🔄 Real-time system monitoring and control")
    app.run(host='0.0.0.0', port=9000, debug=False)