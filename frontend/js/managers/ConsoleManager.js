/**
 * ConsoleManager - Manages console output and command input
 */
export class ConsoleManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.consoleBody = null;
    this.consoleInput = null;
    this.commandHistory = [];
    this.historyIndex = -1;
  }

  async init() {
    this.consoleBody = document.getElementById('consoleBody');
    this.consoleInput = document.getElementById('consoleInput');

    if (!this.consoleBody || !this.consoleInput) {
      console.error('[ConsoleManager] Required DOM elements not found');
      return;
    }

    // Set up command input
    this.consoleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleCommand(this.consoleInput.value);
        this.consoleInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      }
    });

    // Set up console toolbar buttons
    document.querySelector('[data-action="clear-console"]')?.addEventListener('click', () => {
      this.clear();
    });

    document.querySelector('[data-action="scroll-bottom"]')?.addEventListener('click', () => {
      this.scrollToBottom();
    });

    console.log('[ConsoleManager] Initialized');
  }

  log(message, type = 'info') {
    if (!this.consoleBody) return;

    const line = document.createElement('div');
    line.className = `cl ${this.getTypeClass(type)}`;
    line.textContent = message;

    this.consoleBody.appendChild(line);
    this.scrollToBottom();
  }

  getTypeClass(type) {
    const classMap = {
      'info': 'i',
      'success': 's',
      'warning': 'w',
      'error': 'e',
      'command': 'c'
    };
    return classMap[type] || 'i';
  }

  clear() {
    if (this.consoleBody) {
      this.consoleBody.innerHTML = '';
    }
  }

  scrollToBottom() {
    if (this.consoleBody) {
      this.consoleBody.scrollTop = this.consoleBody.scrollHeight;
    }
  }

  handleCommand(command) {
    if (!command.trim()) return;

    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    this.log(`WebVado% ${command}`, 'command');

    // Parse and execute command
    this.executeCommand(command);
  }

  executeCommand(command) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case 'help':
        this.log('可用命令:', 'info');
        this.log('  help           - 显示帮助信息', 'info');
        this.log('  clear          - 清空控制台', 'info');
        this.log('  pwd            - 显示当前目录', 'info');
        this.log('  ls             - 列出文件', 'info');
        this.log('  version        - 显示版本信息', 'info');
        break;

      case 'clear':
        this.clear();
        break;

      case 'pwd':
        this.log(window.location.pathname, 'info');
        break;

      case 'ls':
        this.log('未打开工程', 'warning');
        break;

      case 'version':
        this.log('WebVado 0.1.0 (Alpha)', 'info');
        this.log('Copyright 2026 WebVado Contributors', 'info');
        break;

      case 'synth':
      case 'synthesize':
        this.eventBus.emit('action:run-synthesis');
        break;

      case 'sim':
      case 'simulate':
        this.eventBus.emit('action:run-simulation');
        break;

      default:
        this.log(`未知命令: ${cmd}。输入 "help" 查看可用命令。`, 'warning');
    }
  }

  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;

    this.historyIndex += direction;

    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.consoleInput.value = '';
      return;
    }

    this.consoleInput.value = this.commandHistory[this.historyIndex] || '';
  }
}
