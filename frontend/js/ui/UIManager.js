/**
 * UIManager - Handles UI initialization and event delegation
 */
export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.openMenus = new Set();
  }

  async init() {
    console.log('[UIManager] Initializing...');
    
    // Set up event delegation
    this.setupMenus();
    this.setupToolbar();
    this.setupTitleBar();
    this.setupPanelToggles();
    
    // Initialize clock
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    
    console.log('[UIManager] Initialized');
  }

  setupMenus() {
    const menuBar = document.getElementById('menuBar');
    if (!menuBar) return;

    // Close all menus when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu')) {
        this.closeAllMenus();
      }
    });

    // Handle menu clicks
    menuBar.addEventListener('click', (e) => {
      const menu = e.target.closest('.menu');
      if (!menu) return;

      const menuId = menu.dataset.menu;
      this.toggleMenu(menuId, menu);
    });

    // Handle dropdown item clicks
    menuBar.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();

      const action = item.dataset.action;
      if (action) {
        this.eventBus.emit(`action:${action}`);
        this.closeAllMenus();
      }
    });
  }

  toggleMenu(menuId, menuElement) {
    const isOpen = this.openMenus.has(menuId);

    // Close all menus first
    this.closeAllMenus();

    // Open this menu if it wasn't open
    if (!isOpen) {
      menuElement.classList.add('open');
      this.openMenus.add(menuId);
    }
  }

  closeAllMenus() {
    document.querySelectorAll('.menu.open').forEach(menu => {
      menu.classList.remove('open');
    });
    this.openMenus.clear();
  }

  setupToolbar() {
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn || btn.disabled) return;

        const action = btn.dataset.action;
        if (action) {
          this.eventBus.emit(`action:${action}`);
        }
      });
    }
    
    // Also listen to welcome screen buttons and any other buttons with data-action
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action], a[data-action]');
      if (!btn || btn.disabled) return;
      
      // Skip if already handled by toolbar or menu
      if (btn.closest('#toolbar') || btn.closest('#menuBar')) return;
      
      e.preventDefault();
      const action = btn.dataset.action;
      if (action) {
        this.eventBus.emit(`action:${action}`);
      }
    });
  }

  setupTitleBar() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.eventBus.emit('action:minimize');
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        this.eventBus.emit('action:maximize');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.eventBus.emit('action:close');
      });
    }
  }

  setupPanelToggles() {
    // Handle panel toggle buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action^="toggle-"]');
      if (!btn) return;

      const action = btn.dataset.action;
      this.eventBus.emit(`action:${action}`);
    });

    // Specific panel toggles
    this.eventBus.on('action:toggle-flow-nav', () => {
      const panel = document.getElementById('flowNavigator');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });

    this.eventBus.on('action:toggle-sources', () => {
      const panel = document.querySelector('.sources-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });

    this.eventBus.on('action:toggle-console', () => {
      const panel = document.getElementById('consolePanel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  updateClock() {
    const timeElement = document.getElementById('statusBarTime');
    if (timeElement) {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
  }

  updateTitleBar(text) {
    const titleBarText = document.getElementById('titleBarText');
    if (titleBarText) {
      titleBarText.textContent = text;
    }
  }

  updateStatusBar(text) {
    const statusBarText = document.getElementById('statusBarText');
    if (statusBarText) statusBarText.textContent = text;
  }

  // Alias used by main.js
  setStatusBar(text) {
    this.updateStatusBar(text);
    const toolbar = document.getElementById('toolbarStatus');
    if (toolbar) toolbar.textContent = text;
  }

  showDialog(dialogType) {
    console.log(`[UIManager] Show dialog: ${dialogType}`);
    // TODO: Implement dialog system
    alert(`Dialog not implemented: ${dialogType}`);
  }
}
