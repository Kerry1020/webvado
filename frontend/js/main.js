/**
 * WebVado frontend entry point.
 * Wires window chrome (UIManager), panels and dialogs to backend actions.
 * Flow actions (simulation, synthesis, ...) live in flow/FlowActions.js.
 */

import { UIManager } from './ui/UIManager.js';
import { APIClient } from './api/APIClient.js';
import { EventBus } from './core/EventBus.js';
import { ProjectManager } from './managers/ProjectManager.js';
import { ConsoleManager } from './managers/ConsoleManager.js';
import { FlowNavigator } from './components/FlowNavigator.js';
import { Dialog } from './components/Dialog.js';
import { NewProjectDialog } from './components/dialogs/NewProjectDialog.js';
import { SettingsDialog, loadSettings } from './components/dialogs/SettingsDialog.js';
import { AboutDialog } from './components/dialogs/AboutDialog.js';
import { CodeEditor } from './editor/CodeEditor.js';
import { SourcesPanel } from './components/SourcesPanel.js';
import { FlowActions } from './flow/FlowActions.js';
import i18n from './i18n/index.js';

const t = (key, params) => i18n.t(key, params);

class WebVadoApp {
  constructor() {
    this.eventBus = new EventBus();
    this.apiClient = new APIClient();
    this.currentProject = null;
    this.initialized = false;
    this.saveQueue = Promise.resolve();
    this.navigationVersion = 0;
  }

  get currentProjectId() {
    return this.currentProject?.id || null;
  }

  init() {
    clearTimeout(window.__wvFallback);
    document.getElementById('loadingScreen')?.remove();

    try {
      this.uiManager = new UIManager(this.eventBus);
      this.projectManager = new ProjectManager(this.apiClient, this.eventBus);
      this.consoleManager = new ConsoleManager(this.eventBus);
      this.flowNavigator = new FlowNavigator(this.eventBus);
      this.sourcesPanel = new SourcesPanel(this.eventBus, this.apiClient);

      this.uiManager.init();
      this.consoleManager.init();
      this.flowNavigator.init();
      this.sourcesPanel.init();
      this.codeEditor = new CodeEditor(document.getElementById('editorBody'));
      this.codeEditor.applySettings(loadSettings());
      this.codeEditor.requestClose = async () => {
        if (await this.confirmDiscard()) {
          clearTimeout(this.autoSaveTimer);
          this.codeEditor.close();
        }
      };
      this.codeEditor.onChange(() => this.scheduleAutoSave());
      this.flow = new FlowActions(this);

      i18n.apply();
      this.updateLanguageIndicator();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      this.registerConsoleCommands();
      this.renderProjectState();

      this.consoleManager.log(t('console.welcome', { version: '0.1.0' }), 'info');
      this.consoleManager.log(t('console.copyright'), 'info');
      this.consoleManager.log(t('console.helpPrompt'), 'info');
      this.pingBackend();

      window.addEventListener('beforeunload', (e) => {
        if (this.codeEditor.isDirty() || this.pendingSaves) {
          e.preventDefault();
          e.returnValue = '';
        }
      });

      this.initialized = true;
    } catch (err) {
      console.error('[WebVado] Init error:', err);
      const sb = document.getElementById('statusBarText');
      if (sb) sb.textContent = `Init error: ${err.message}`;
    }
  }

  async pingBackend() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.consoleManager.log(`INFO: Backend connected (${location.origin})`, 'success');
    } catch {
      this.consoleManager.log('WARN: Backend not reachable. Start it with: npm start', 'warning');
      this.uiManager.setStatusBar('Backend offline');
    }
  }

  // ── Wiring ──────────────────────────────────────────────────

  setupEventListeners() {
    const on = (action, fn) => this.eventBus.on(`action:${action}`, fn);

    // File
    on('new-project', () => this.handleNewProject());
    on('open-project', () => this.handleOpenProject());
    on('save-project', () => this.handleSave());
    on('close-project', () => this.handleCloseProject());
    on('exit', () => this.handleExit());

    // Edit
    for (const cmd of ['undo', 'redo', 'cut', 'copy']) {
      on(cmd, () => this.editCommand(cmd));
    }
    on('paste', () => this.handlePaste());
    on('find', () => this.handleFind());

    // Tools / Window / Help
    on('settings', () => this.handleSettings());
    on('sim-settings', () => this.handleSettings('simulation'));
    on('show-summary', () => this.handleShowSummary());
    on('about', () => AboutDialog.show());
    on('toggle-language', () => this.handleToggleLanguage());
    on('documentation', () => window.open('https://github.com/Kerry1020/webvado#readme', '_blank', 'noopener'));
    on('examples', () => this.handleOpenProject());

    // Title bar
    on('minimize', () => document.getElementById('app').classList.toggle('minimized'));
    on('maximize', () => this.handleMaximize());
    on('close', () => this.handleExit());

    // Sources panel
    on('add-sources', () => this.sourcesPanel.showAddDialog());
    on('refresh-sources', () => this.handleRefreshSources());
    on('search-sources', () => this.sourcesPanel.search());
    on('compile-order', () => document.querySelector('.tab[data-tab="compile-order"]')?.click());

    // Console toolbar
    on('clear-console', () => this.consoleManager.clear());
    on('scroll-bottom', () => this.consoleManager.scrollToBottom());
    on('find-in-console', () => this.handleFindInConsole());

    // Panel events
    this.eventBus.on('editor:open-file', ({ filename }) => this.openFile(filename));
    this.eventBus.on('sources:set-top', name => this.setTopModule(name));
    this.eventBus.on('sources:removed', path => {
      if (this.codeEditor.filename === path) this.codeEditor.close();
    });
    this.sourcesPanel.beforeRemove = async path => {
      if (this.codeEditor.filename === path && !(await this.confirmDiscard())) return false;
      await this.saveQueue;
      return true;
    };
    window.addEventListener('locale-changed', () => {
      i18n.apply();
      this.updateLanguageIndicator();
      this.renderProjectState();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (document.querySelector('.dialog-overlay:not(.dialog-closing)')) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 's') { e.preventDefault(); this.handleSave(); }
      else if (mod && e.altKey && key === 'n') { e.preventDefault(); this.handleNewProject(); }
      else if (mod && key === 'o') { e.preventDefault(); this.handleOpenProject(); }
      else if (mod && key === 'f') { e.preventDefault(); this.handleFind(); }
      else if (e.key === 'F11') { e.preventDefault(); this.handleMaximize(); }
    });
  }

  registerConsoleCommands() {
    const c = this.consoleManager;
    c.register('clear', 'clear the console', () => c.clear());
    c.register('version', 'show version', () => c.log('WebVado 0.1.0 (Alpha)', 'info'));
    c.register('pwd', 'show the open project path', () => c.log(this.currentProject?.path || t('console.noProject'), 'info'));
    c.register('ls', 'list project source files', () => {
      if (!this.currentProject) return c.log(t('console.noProject'), 'warning');
      const files = this.sourcesPanel.getFiles();
      if (!files.length) c.log(t('sources.noFiles'), 'info');
      files.forEach(f => c.log(`  ${f.path}`, 'info'));
    });
    c.register('open_project', 'open_project <name>', ([name]) => name ? this.openProject(name) : this.handleOpenProject());
    c.register('close_project', 'close the open project', () => this.handleCloseProject());
    c.register('save', 'save the open file', () => this.handleSave());
    c.register('set_top', 'set_top <module>', ([name]) => this.setTopModule(name || ''));
    c.register('check_syntax', 'compile sources with iverilog', () => this.flow.checkSyntax());
    c.register('launch_simulation', 'run behavioral simulation', () => this.flow.runSimulation());
    c.register('synth_design', 'run Yosys synthesis', () => this.flow.runSynthesis());
    c.register('report_utilization', 'show the last synthesis report', () => this.flow.showReport('utilization'));
  }

  // ── Project state ───────────────────────────────────────────

  renderProjectState() {
    const p = this.currentProject;
    this.uiManager.updateTitleBar(p ? t('title.withProject', { name: p.name, path: p.path }) : t('title.noProject'));
    document.getElementById('statusBarProject').textContent = p ? t('status.project', { name: p.name }) : t('status.noProject');
    document.getElementById('statusBarPart').textContent = p ? t('status.part', { part: p.part }) : '-';
    this.uiManager.setStatusBar(t('status.ready'));
  }

  requireProject() {
    if (this.currentProject) return true;
    Dialog.alert(t('common.error'), t('messages.noProjectOpen'));
    return false;
  }

  // Resolves true when it is safe to drop the editor contents
  async confirmDiscard() {
    clearTimeout(this.autoSaveTimer);
    await this.saveQueue;
    if (!this.codeEditor.isDirty()) return true;
    return Dialog.confirm(t('editor.unsavedChanges'), t('messages.unsavedConfirm', { name: this.codeEditor.filename }), {
      okText: t('messages.discard'),
      cancelText: t('common.cancel')
    });
  }

  handleNewProject() {
    NewProjectDialog.show(async (data) => {
      try {
        const proj = await this.apiClient.post('/api/projects', data);
        this.consoleManager.log(t('messages.projectCreated', { name: proj.name, id: proj.id }), 'success');
        await this.openProject(proj.name);
      } catch (err) {
        return err.message;
      }
    });
  }

  async handleOpenProject() {
    let projects;
    try {
      ({ projects = [] } = await this.apiClient.get('/api/projects'));
    } catch (err) {
      return Dialog.alert(t('common.error'), t('messages.errorLoadProjects', { message: err.message }));
    }
    if (!projects.length) {
      return Dialog.alert(t('dialog.openProject.noProjects'), t('dialog.openProject.noProjectsMessage'));
    }

    const form = document.createElement('form');
    form.innerHTML = `
      <div class="dialog-form-group">
        <label for="project-select">${Dialog.escape(t('dialog.openProject.selectProject'))}</label>
        <select id="project-select" size="${Math.min(Math.max(projects.length, 2), 8)}">
          ${projects.map(p => `<option value="${Dialog.escape(p.name)}">${Dialog.escape(p.name)} (${Dialog.escape(p.part)})</option>`).join('')}
        </select>
      </div>`;
    const select = form.querySelector('select');
    select.selectedIndex = Math.max(0, projects.findIndex(p => p.id === this.currentProjectId));

    const dialog = Dialog.show({
      title: t('dialog.openProject.title'),
      body: form,
      buttons: [
        { text: t('common.cancel') },
        { text: t('common.open'), primary: true, onClick: () => this.openProject(select.value) }
      ]
    });
    select.addEventListener('dblclick', () => dialog.querySelector('.dialog-footer .btn-primary').click());
    form.onsubmit = (e) => { e.preventDefault(); dialog.querySelector('.dialog-footer .btn-primary').click(); };
  }

  async openProject(nameOrId) {
    if (!(await this.confirmDiscard())) return;
    const version = ++this.navigationVersion;
    const session = this.codeEditor.session;
    const content = this.codeEditor.getContent();
    try {
      const project = await this.apiClient.get(`/api/projects/${encodeURIComponent(nameOrId)}`);
      if (version !== this.navigationVersion) return false;
      if ((this.codeEditor.session !== session || this.codeEditor.getContent() !== content) && !(await this.confirmDiscard())) return false;
      this.projectManager.currentProject = project;
      this.currentProject = project;
      this.codeEditor.close();
      this.flow.reset();
      this.flowNavigator.resetProgress();
      this.renderProjectState();
      await this.sourcesPanel.setProject(project.id, project.top_module);
      this.consoleManager.log(t('messages.projectOpened', { name: project.name }), 'success');
      return true;
    } catch (err) {
      Dialog.alert(t('common.error'), err.message);
      return false;
    }
  }

  async handleCloseProject() {
    if (!this.currentProject) return Dialog.alert(t('common.error'), t('messages.noProjectOpen'));
    if (this.codeEditor.isDirty()) {
      if (!(await this.confirmDiscard())) return;
    } else if (!(await Dialog.confirm(t('dialog.closeProject.title'), t('dialog.closeProject.message')))) {
      return;
    }
    this.codeEditor.close();
    ++this.navigationVersion;
    await this.projectManager.closeProject();
    this.currentProject = null;
    this.flowNavigator.resetProgress();
    await this.sourcesPanel.setProject(null);
    this.flow.reset();
    this.renderProjectState();
    this.consoleManager.log(t('messages.projectClosed'), 'info');
  }

  async handleExit() {
    if (!(await this.confirmDiscard())) return;
    if (!(await Dialog.confirm(t('dialog.exit.title'), t('dialog.exit.message')))) return;
    this.codeEditor.close();
    if (this.currentProject) {
      await this.projectManager.closeProject();
      this.currentProject = null;
      await this.sourcesPanel.setProject(null);
      this.flow.reset();
      this.renderProjectState();
    }
    // Browsers only let scripts close windows they opened; the close project above is the fallback
    window.close();
  }

  async setTopModule(name) {
    if (!this.requireProject()) return;
    try {
      const updated = await this.apiClient.put(`/api/projects/${encodeURIComponent(this.currentProjectId)}`, { top_module: name });
      this.currentProject = { ...this.currentProject, top_module: updated.top_module };
      this.sourcesPanel.setTopModule(updated.top_module);
      this.consoleManager.log(`set_property top ${name || '(auto)'} [current_fileset]`, 'command');
    } catch (err) {
      Dialog.alert(t('common.error'), err.message);
    }
  }

  // ── Files ───────────────────────────────────────────────────

  async openFile(path) {
    if (!this.requireProject()) return;
    if (path === this.codeEditor.filename) return;
    if (!(await this.confirmDiscard())) return;
    const projectId = this.currentProjectId;
    const version = ++this.navigationVersion;
    const content = this.codeEditor.getContent();
    const session = this.codeEditor.session;
    try {
      const file = await this.apiClient.get(`/api/files/${encodeURIComponent(projectId)}/${path.split('/').map(encodeURIComponent).join('/')}`);
      if (projectId !== this.currentProjectId || version !== this.navigationVersion) return;
      if ((this.codeEditor.session !== session || this.codeEditor.getContent() !== content) && !(await this.confirmDiscard())) return;
      this.codeEditor.openFile(path, file.content);
      this.consoleManager.log(t('messages.fileOpened', { filename: path }), 'info');
    } catch (err) {
      Dialog.alert(t('common.error'), t('messages.errorOpenFile', { message: err.message }));
    }
  }

  // Saves the open file. Returns false if saving failed.
  async handleSave() {
    if (!this.requireProject()) return false;
    if (!this.codeEditor.isOpen()) {
      this.uiManager.flashStatus(t('status.saved'), t('status.ready'));
      return true;
    }
    const path = this.codeEditor.filename;
    const projectId = this.currentProjectId;
    const session = this.codeEditor.session;
    const content = this.codeEditor.getContent();
    clearTimeout(this.autoSaveTimer);
    this.pendingSaves = (this.pendingSaves || 0) + 1;
    const save = async () => {
      try {
        this.uiManager.setStatusBar(t('status.saving'));
        await this.apiClient.put(`/api/files/${encodeURIComponent(projectId)}/${path.split('/').map(encodeURIComponent).join('/')}`, { content });
        if (projectId === this.currentProjectId) this.flow.invalidate();
        if (projectId === this.currentProjectId && session === this.codeEditor.session) this.codeEditor.markSaved(content);
        this.consoleManager.log(t('messages.fileSaved', { filename: path }), 'success');
        this.uiManager.flashStatus(t('status.saved'), t('status.ready'));
        return true;
      } catch (err) {
        this.consoleManager.log(t('messages.errorSaveFile', { message: err.message }), 'error');
        this.uiManager.setStatusBar(t('messages.errorSaveFile', { message: err.message }));
        Dialog.alert(t('common.error'), t('messages.errorSaveFile', { message: err.message }));
        return false;
      } finally {
        this.pendingSaves--;
      }
    };
    const result = this.saveQueue.then(save, save);
    this.saveQueue = result;
    return result;
  }

  scheduleAutoSave() {
    clearTimeout(this.autoSaveTimer);
    if (!loadSettings().autoSave) return;
    this.autoSaveTimer = setTimeout(() => {
      if (this.currentProject && this.codeEditor.isDirty()) this.handleSave();
    }, 750);
  }

  async handleRefreshSources() {
    if (!this.requireProject()) return;
    if (await this.sourcesPanel.refresh() === false) return;
    this.uiManager.flashStatus(`${this.sourcesPanel.getFiles().length} files`, t('status.ready'));
  }

  // ── Edit ────────────────────────────────────────────────────

  requireEditor() {
    if (this.codeEditor.isOpen()) return true;
    Dialog.alert(t('common.info'), t('editor.noFile'));
    return false;
  }

  editCommand(cmd) {
    if (!this.requireEditor()) return;
    this.codeEditor.runCommand(cmd);
  }

  async handlePaste() {
    if (!this.requireEditor()) return;
    try {
      this.codeEditor.insertText(await navigator.clipboard.readText());
    } catch {
      // Clipboard read needs permission; fall back to the browser's own paste
      this.codeEditor.textarea.focus();
      if (!document.execCommand('paste')) {
        this.uiManager.flashStatus('Paste: press Ctrl+V / Cmd+V in the editor', t('status.ready'));
      }
    }
  }

  handleFind() {
    if (!this.requireEditor()) return;
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="dialog-form-group"><label for="find-term">${t('editor.findTerm')}</label><input id="find-term" type="text"></div>
      <div class="dialog-form-group"><label for="find-replace">${t('editor.replaceWith')}</label><input id="find-replace" type="text"></div>
      <div class="find-status" style="font-size:11px;min-height:14px"></div>`;
    const term = form.querySelector('#find-term');
    const status = form.querySelector('.find-status');
    const selected = this.codeEditor.textarea.value.slice(this.codeEditor.textarea.selectionStart, this.codeEditor.textarea.selectionEnd);
    if (selected && !selected.includes('\n')) term.value = selected;

    const findNext = () => {
      status.textContent = this.codeEditor.find(term.value) ? '' : t('editor.notFound', { term: term.value });
      return false;
    };
    const dialog = Dialog.show({
      title: t('menu.find'),
      body: form,
      buttons: [
        { text: t('common.close') },
        {
          text: t('editor.replaceAll'),
          onClick: () => {
            const n = this.codeEditor.replaceAll(term.value, form.querySelector('#find-replace').value);
            status.textContent = t('editor.replaced', { count: n });
            return false;
          }
        },
        { text: t('editor.findNext'), primary: true, onClick: findNext }
      ]
    });
    form.onsubmit = (e) => { e.preventDefault(); dialog.querySelector('.dialog-footer .btn-primary').click(); };
  }

  async handleFindInConsole() {
    const term = await Dialog.prompt(t('common.search'), 'Find in console:');
    if (!term) return;
    const n = this.consoleManager.find(term);
    this.uiManager.flashStatus(n ? `${n} matching lines` : `"${term}" not found`, t('status.ready'));
  }

  // ── Window / settings ───────────────────────────────────────

  handleSettings(panel) {
    SettingsDialog.show({ panel, onSave: s => {
      this.codeEditor.applySettings(s);
      this.scheduleAutoSave();
    } });
  }

  handleShowSummary() {
    if (!this.requireProject()) return;
    const p = this.currentProject;
    const files = this.sourcesPanel.getFiles();
    const count = g => files.filter(f => f.group === g).length;
    Dialog.alert(t('menu.projectSummary'), [
      `Project:            ${p.name}`,
      `Location:           ${p.path}`,
      `Part:               ${p.part}`,
      `Language:           ${p.language}`,
      `Top module:         ${p.top_module || '(auto)'}`,
      `Design sources:     ${count('design')}`,
      `Constraints:        ${count('constraints')}`,
      `Simulation sources: ${count('simulation')}`,
      ...this.flow.summaryLines()
    ].join('\n'));
  }

  handleToggleLanguage() {
    i18n.setLocale(i18n.getLocale() === 'en-US' ? 'zh-CN' : 'en-US');
    this.consoleManager.log(`Language: ${i18n.getLocale() === 'en-US' ? 'English' : '简体中文'}`, 'info');
  }

  updateLanguageIndicator() {
    const span = document.getElementById('currentLang');
    if (span) span.textContent = i18n.getLocale() === 'en-US' ? 'EN' : '中文';
  }

  async handleMaximize() {
    document.getElementById('app').classList.remove('minimized');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.uiManager.flashStatus('Fullscreen not allowed here', t('status.ready'));
    }
  }
}

const app = new WebVadoApp();
window.webvado = app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;
