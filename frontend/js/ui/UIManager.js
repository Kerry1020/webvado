/**
 * UIManager - Window chrome: menus, toolbar, title bar, tabs, panel toggles.
 *
 * One delegated click listener on document turns every element with
 * data-action into an `action:<name>` event, exactly once per click.
 * Components whose items are not buttons (Flow Navigator rows, tree rows)
 * handle their own clicks.
 */
export class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  init() {
    this.setupClicks();
    this.setupTitleBar();
    this.setupPanelToggles();

    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    console.log('[UIManager] Initialized');
  }

  setupClicks() {
    document.addEventListener('click', (e) => {
      // Menu title: open/close its dropdown
      const menuTitle = e.target.closest('.menu');
      const dropdownItem = e.target.closest('.dropdown-item');
      if (menuTitle && !dropdownItem) {
        const wasOpen = menuTitle.classList.contains('open');
        this.closeAllMenus();
        if (!wasOpen) menuTitle.classList.add('open');
        return;
      }

      // Anything outside an open menu closes it
      this.closeAllMenus();

      // Tabs (Sources / Netlist / Compile Order, console tabs)
      const tab = e.target.closest('[data-tab]');
      if (tab && !tab.disabled) {
        const bar = tab.parentElement;
        bar.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t === tab));
        this.eventBus.emit(`tab:${tab.dataset.tab}`, tab.dataset.tab);
        return;
      }

      // Buttons and links that carry an action
      const el = e.target.closest('button[data-action], a[data-action]');
      if (!el || el.disabled) return;
      e.preventDefault();
      this.eventBus.emit(`action:${el.dataset.action}`);
    });

    // Hovering across the menu bar while a menu is open switches menus, like a desktop app
    document.getElementById('menuBar')?.addEventListener('mouseover', (e) => {
      const menu = e.target.closest('.menu');
      const open = document.querySelector('.menu.open');
      if (menu && open && menu !== open) {
        open.classList.remove('open');
        menu.classList.add('open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllMenus();
    });
  }

  closeAllMenus() {
    document.querySelectorAll('.menu.open').forEach(menu => menu.classList.remove('open'));
  }

  setupTitleBar() {
    const bind = (id, action) => {
      document.getElementById(id)?.addEventListener('click', () => this.eventBus.emit(`action:${action}`));
    };
    bind('minimizeBtn', 'minimize');
    bind('maximizeBtn', 'maximize');
    bind('closeBtn', 'close');

    // Double-clicking the title bar toggles maximize, like a desktop window
    document.getElementById('titleBar')?.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button')) this.eventBus.emit('action:maximize');
    });
  }

  setupPanelToggles() {
    const toggle = (id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.style.display = panel.style.display === 'none' ? '' : 'none';
      this.eventBus.emit('layout:changed');
    };
    this.eventBus.on('action:toggle-flow-nav', () => toggle('flowNavigator'));
    this.eventBus.on('action:toggle-sources', () => toggle('sourcesPanel'));
    this.eventBus.on('action:toggle-console', () => toggle('consolePanel'));
  }

  updateClock() {
    const timeElement = document.getElementById('statusBarTime');
    if (timeElement) {
      timeElement.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
    }
  }

  updateTitleBar(text) {
    const titleBarText = document.getElementById('titleBarText');
    if (titleBarText) titleBarText.textContent = text;
    document.title = text;
  }

  setStatusBar(text) {
    clearTimeout(this.statusTimer);
    const statusBarText = document.getElementById('statusBarText');
    if (statusBarText) statusBarText.textContent = text;
    const toolbar = document.getElementById('toolbarStatus');
    if (toolbar) toolbar.textContent = text;
  }

  // Shows a status message, then returns to "Ready" unless something newer replaced it
  flashStatus(text, readyText, ms = 3000) {
    this.setStatusBar(text);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.setStatusBar(readyText), ms);
  }
}
