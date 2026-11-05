/**
 * ConsoleManager - Console output, filter tabs and Tcl-style command input
 */
import i18n from '../i18n/index.js';

// Tabs filter the same log: Tcl Console shows everything, Messages shows
// warnings and errors, Logs shows tool output, Reports shows build summaries.
const TAB_FILTER = {
  'tcl-console': () => true,
  messages: type => type === 'warning' || type === 'error',
  logs: (type, channel) => channel === 'log',
  reports: (type, channel) => channel === 'report'
};

export class ConsoleManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.consoleBody = null;
    this.consoleInput = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.activeTab = 'tcl-console';
    this.commands = new Map();
  }

  init() {
    this.consoleBody = document.getElementById('consoleBody');
    this.consoleInput = document.getElementById('consoleInput');

    if (!this.consoleBody || !this.consoleInput) {
      console.error('[ConsoleManager] Required DOM elements not found');
      return;
    }

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

    for (const tab of Object.keys(TAB_FILTER)) {
      this.eventBus.on(`tab:${tab}`, () => this.setTab(tab));
    }

    // Components report through the bus instead of holding a console reference
    this.eventBus.on('console:log', msg => this.log(msg, 'info'));
    this.eventBus.on('console:error', msg => this.log(msg, 'error'));

    console.log('[ConsoleManager] Initialized');
  }

  /**
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'|'command'} type
   * @param {'tcl'|'log'|'report'} channel
   */
  log(message, type = 'info', channel = 'tcl') {
    if (!this.consoleBody) return;

    const line = document.createElement('div');
    line.className = `cl ${this.getTypeClass(type)}`;
    line.dataset.type = type;
    line.dataset.channel = channel;
    line.textContent = message;
    if (!TAB_FILTER[this.activeTab](type, channel)) line.classList.add('hidden-by-filter');

    this.consoleBody.appendChild(line);
    this.scrollToBottom();
  }

  getTypeClass(type) {
    return { info: 'i', success: 's', warning: 'w', error: 'e', command: 'c' }[type] || 'i';
  }

  setTab(tab) {
    if (!TAB_FILTER[tab]) return;
    this.activeTab = tab;
    this.consoleBody.dataset.filter = tab;
    const show = TAB_FILTER[tab];
    this.consoleBody.querySelectorAll('.cl').forEach(line => {
      line.classList.toggle('hidden-by-filter', !show(line.dataset.type, line.dataset.channel));
    });
    this.scrollToBottom();
  }

  clear() {
    if (this.consoleBody) this.consoleBody.innerHTML = '';
  }

  scrollToBottom() {
    if (this.consoleBody) this.consoleBody.scrollTop = this.consoleBody.scrollHeight;
  }

  // Selects the first line containing the term and scrolls to it
  find(term) {
    const lines = [...this.consoleBody.querySelectorAll('.cl:not(.hidden-by-filter)')];
    this.consoleBody.querySelectorAll('.cl.found').forEach(l => l.classList.remove('found'));
    const matches = lines.filter(l => l.textContent.toLowerCase().includes(term.toLowerCase()));
    if (!matches.length) return 0;
    matches.forEach(l => l.classList.add('found'));
    matches[0].scrollIntoView({ block: 'center' });
    return matches.length;
  }

  /**
   * Register a console command. handler(args) may return a promise.
   */
  register(name, description, handler) {
    this.commands.set(name, { description, handler });
  }

  handleCommand(command) {
    if (!command.trim()) return;

    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;
    this.log(`WebVado% ${command}`, 'command');
    this.executeCommand(command);
  }

  async executeCommand(command) {
    const [cmd, ...args] = command.trim().split(/\s+/);
    const name = cmd.toLowerCase();

    if (name === 'help') {
      this.log(i18n.t('console.helpPrompt'), 'info');
      for (const [key, { description }] of this.commands) {
        this.log(`  ${key.padEnd(18)}${description}`, 'info');
      }
      return;
    }

    const entry = this.commands.get(name);
    if (!entry) {
      this.log(i18n.t('console.unknownCommand', { cmd }), 'warning');
      return;
    }

    try {
      await entry.handler(args);
    } catch (err) {
      this.log(`ERROR: ${err.message}`, 'error');
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
