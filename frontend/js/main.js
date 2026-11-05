/**
 * WebVado Frontend Entry Point - Updated with all UI components
 */

import { UIManager } from './ui/UIManager.js';
import { APIClient } from './api/APIClient.js';
import { EventBus } from './core/EventBus.js';
import { ProjectManager } from './managers/ProjectManager.js';
import { EditorManager } from './managers/EditorManager.js';
import { ConsoleManager } from './managers/ConsoleManager.js';
import { FlowNavigator } from './components/FlowNavigator.js';
import { Dialog } from './components/Dialog.js';
import { NewProjectDialog } from './components/dialogs/NewProjectDialog.js';
import { SettingsDialog } from './components/dialogs/SettingsDialog.js';
import { AboutDialog } from './components/dialogs/AboutDialog.js';
import { WaveformViewer } from './components/WaveformViewer.js';
import { CodeEditor } from './editor/CodeEditor.js';
import { SourcesPanel } from './components/SourcesPanel.js';
import i18n from './i18n/index.js';

class WebVadoApp {
  constructor() {
    this.eventBus = new EventBus();
    this.apiClient = new APIClient();
    this.uiManager = null;
    this.projectManager = null;
    this.editorManager = null;
    this.consoleManager = null;
    this.flowNavigator = null;
    this.sourcesPanel = null;
    this.codeEditor = null;
    this.waveformViewer = null;
    this.initialized = false;
    this.currentProjectId = null;
  }

  async init() {
    // Always show the app first — never block on health check
    this.showApp();

    try {
      // Initialize all managers
      this.uiManager        = new UIManager(this.eventBus);
      this.projectManager   = new ProjectManager(this.apiClient, this.eventBus);
      this.editorManager    = new EditorManager(this.eventBus);
      this.consoleManager   = new ConsoleManager(this.eventBus);
      this.flowNavigator    = new FlowNavigator(this.eventBus);
      this.sourcesPanel     = new SourcesPanel(this.eventBus, this.apiClient);

      this.uiManager.init();
      this.consoleManager.init();
      this.flowNavigator.init();
      this.sourcesPanel.init();

      // Initialize code editor
      const editorContainer = document.getElementById('editorBody');
      if (editorContainer) {
        this.codeEditor = new CodeEditor(editorContainer);
      }

      // Wire up all action handlers
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      
      // Set the language indicator
      this.updateLanguageIndicator();

      // Welcome messages
      this.consoleManager.log('WebVado 0.1.0 (Alpha)', 'info');
      this.consoleManager.log('Copyright 2026 WebVado Contributors', 'info');
      this.consoleManager.log('', 'info');
      this.consoleManager.log('输入 "help" 查看可用命令', 'info');

      // Background health check — just logs, never blocks
      this.pingBackend();

      this.initialized = true;
    } catch (err) {
      console.error('[WebVado] Init error:', err);
      // App is already visible; show error in status bar
      const sb = document.getElementById('statusBarText');
      if (sb) sb.textContent = `Init error: ${err.message}`;
    }
  }

  /** Non-blocking backend ping */
  async pingBackend() {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch('/api/health', { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        this.consoleManager?.log('INFO: Backend connected (http://localhost:3000)', 'success');
        this.uiManager?.setStatusBar('Ready');
      }
    } catch {
      this.consoleManager?.log(
        'WARN: Backend not reachable — run: npm start', 'warning'
      );
      this.uiManager?.setStatusBar('Backend offline');
    }
  }

  showApp() {
    clearTimeout(window.__wvFallback);
    const ls = document.getElementById('loadingScreen');
    if (ls) ls.remove();
  }
  
  updateLanguageIndicator() {
    const current = i18n.getLocale();
    const langSpan = document.getElementById('currentLang');
    if (langSpan) {
      langSpan.textContent = current === 'en-US' ? 'EN' : '中文';
    }
  }

  // ── Event Listeners ─────────────────────────────────────────

  setupEventListeners() {
    this.eventBus.on('action:new-project',         () => this.handleNewProject());
    this.eventBus.on('action:open-project',        () => this.handleOpenProject());
    this.eventBus.on('action:save-project',        () => this.handleSaveProject());
    this.eventBus.on('action:close-project',       () => this.handleCloseProject());
    this.eventBus.on('action:run-synthesis',       () => this.handleRunSynthesis());
    this.eventBus.on('action:run-simulation',      () => this.handleRunSimulation());
    this.eventBus.on('action:generate-bitstream',  () => this.handleGenerateBitstream());
    this.eventBus.on('action:settings',            () => this.handleSettings());
    this.eventBus.on('action:about',               () => this.handleAbout());
    this.eventBus.on('action:toggle-language',     () => this.handleToggleLanguage());
    this.eventBus.on('action:minimize',            () => this.handleMinimize());
    this.eventBus.on('action:maximize',            () => this.handleMaximize());
    this.eventBus.on('action:close',               () => this.handleClose());
    
    // Editor events
    this.eventBus.on('editor:open-file',           (data) => this.handleOpenFile(data));
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.eventBus.emit('action:save-project'); }
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); this.eventBus.emit('action:new-project'); }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); this.eventBus.emit('action:open-project'); }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); this.eventBus.emit('action:find'); }
      if (e.key === 'F11')            { e.preventDefault(); this.handleMaximize(); }
    });
  }

  // ── Action Handlers ─────────────────────────────────────────

  async handleNewProject() {
    NewProjectDialog.show(async (data) => {
      try {
        const proj = await this.apiClient.post('/api/projects', {
          name: data.name,
          part: data.part,
          language: data.language
        });
        this.consoleManager.log(`Project "${proj.name}" created (${proj.id})`, 'success');
        this.currentProjectId = proj.id;
        this.sourcesPanel.setProject(proj.id);
        await this.projectManager.openProject(proj.name);
      } catch (err) {
        this.consoleManager.log(`ERROR: ${err.message}`, 'error');
        Dialog.alert('Error', `Failed to create project: ${err.message}`);
      }
    });
  }

  async handleOpenProject() {
    try {
      const projects = await this.apiClient.get('/api/projects');
      if (!projects.projects || projects.projects.length === 0) {
        Dialog.alert('No Projects', 'No projects found. Create one first.');
        return;
      }
      
      const projectList = projects.projects
        .map(p => `<option value="${p.id}">${p.name} (${p.part})</option>`)
        .join('');
      
      const form = document.createElement('form');
      form.innerHTML = `
        <div class="dialog-form-group">
          <label for="project-select">Select project:</label>
          <select id="project-select" name="project" required>
            ${projectList}
          </select>
        </div>
      `;
      
      let selectedId;
      Dialog.show({
        title: 'Open Project',
        body: form,
        buttons: [
          { text: 'Cancel', onClick: () => {} },
          {
            text: 'Open',
            primary: true,
            onClick: () => {
              selectedId = form.querySelector('#project-select').value;
            }
          }
        ],
        onClose: async () => {
          if (selectedId) {
            const proj = projects.projects.find(p => p.id === selectedId);
            if (proj) {
              this.currentProjectId = proj.id;
              this.sourcesPanel.setProject(proj.id);
              await this.projectManager.openProject(proj.name);
              this.consoleManager.log(`Opened project: ${proj.name}`, 'success');
            }
          }
        }
      });
    } catch (err) {
      Dialog.alert('Error', `Failed to load projects: ${err.message}`);
    }
  }

  async handleSaveProject() {
    if (!this.currentProjectId) {
      this.consoleManager.log('No project open', 'warning');
      return;
    }
    
    // Save current file if editor is open
    if (this.codeEditor && this.codeEditor.filename) {
      try {
        const content = this.codeEditor.getContent();
        await this.apiClient.put(`/files/${this.currentProjectId}/${this.codeEditor.filename}`, {
          content
        });
        this.consoleManager.log(`Saved: ${this.codeEditor.filename}`, 'success');
      } catch (err) {
        this.consoleManager.log(`ERROR saving file: ${err.message}`, 'error');
      }
    }
    
    this.consoleManager.log('save_project', 'command');
    this.consoleManager.log('Project saved.', 'success');
    this.uiManager.setStatusBar('Saved');
    setTimeout(() => this.uiManager.setStatusBar('Ready'), 2000);
  }

  async handleCloseProject() {
    if (!this.currentProjectId) return;
    
    const confirm = await Dialog.confirm('Close Project', 'Close current project?');
    if (!confirm) return;
    
    this.currentProjectId = null;
    this.sourcesPanel.setProject(null);
    this.codeEditor.close();
    await this.projectManager.closeProject();
    this.consoleManager.log('Project closed.', 'info');
  }

  async handleRunSynthesis() {
    if (!this.currentProjectId) {
      Dialog.alert('Error', 'No project open');
      return;
    }
    
    this.consoleManager.log('', 'info');
    this.consoleManager.log('launch_runs -runs synth_1', 'command');
    this.uiManager.setStatusBar('Running synthesis...');
    
    try {
      const result = await this.apiClient.post(`/build/${this.currentProjectId}/compile`);
      
      if (result.success) {
        this.consoleManager.log('Synthesis completed successfully', 'success');
        this.uiManager.setStatusBar('Synthesis complete');
        
        if (result.errors && result.errors.length > 0) {
          // Show errors in editor
          this.codeEditor.setErrors(result.errors);
          this.consoleManager.log(`Found ${result.errors.length} errors/warnings`, 'warning');
        }
      } else {
        this.consoleManager.log(`Synthesis failed: ${result.message}`, 'error');
        this.uiManager.setStatusBar('Synthesis failed');
        
        if (result.errors) {
          this.codeEditor.setErrors(result.errors);
        }
      }
    } catch (err) {
      this.consoleManager.log(`ERROR: ${err.message}`, 'error');
      this.uiManager.setStatusBar('Synthesis error');
    }
    
    setTimeout(() => this.uiManager.setStatusBar('Ready'), 3000);
  }

  async handleRunSimulation() {
    if (!this.currentProjectId) {
      Dialog.alert('Error', 'No project open');
      return;
    }
    
    this.consoleManager.log('', 'info');
    this.consoleManager.log('launch_simulation -mode behavioral', 'command');
    this.uiManager.setStatusBar('Running simulation...');
    
    try {
      const result = await this.apiClient.post(`/build/${this.currentProjectId}/simulate`);
      
      if (result.success) {
        this.consoleManager.log('Simulation completed successfully', 'success');
        this.uiManager.setStatusBar('Simulation complete');
        
        // If VCD data is returned, show waveform viewer
        if (result.vcd) {
          this.showWaveform(result.vcd);
        }
      } else {
        this.consoleManager.log(`Simulation failed: ${result.message}`, 'error');
        this.uiManager.setStatusBar('Simulation failed');
      }
    } catch (err) {
      this.consoleManager.log(`ERROR: ${err.message}`, 'error');
      this.uiManager.setStatusBar('Simulation error');
    }
    
    setTimeout(() => this.uiManager.setStatusBar('Ready'), 3000);
  }

  showWaveform(vcdData) {
    // Create waveform viewer if not exists
    if (!this.waveformViewer) {
      // Replace console temporarily with waveform viewer
      const consolePanel = document.getElementById('console');
      if (consolePanel) {
        const waveformContainer = document.createElement('div');
        waveformContainer.id = 'waveform-container';
        waveformContainer.style.height = '100%';
        
        consolePanel.style.display = 'none';
        consolePanel.parentNode.appendChild(waveformContainer);
        
        this.waveformViewer = new WaveformViewer(waveformContainer);
      }
    }
    
    if (this.waveformViewer) {
      this.waveformViewer.setData(vcdData);
    }
  }

  async handleGenerateBitstream() {
    this.consoleManager.log('INFO: Bitstream generation requires full synthesis+P&R (Phase 4)', 'warning');
  }

  handleSettings() {
    SettingsDialog.show({
      autoSave: true,
      showLineNumbers: true,
      tabSize: 4
    });
  }

  handleAbout() {
    AboutDialog.show();
  }

  handleToggleLanguage() {
    const current = i18n.getLocale();
    const next = current === 'en-US' ? 'zh-CN' : 'en-US';
    i18n.setLocale(next);
    
    // Update the language indicator in the menu
    const langSpan = document.getElementById('currentLang');
    if (langSpan) {
      langSpan.textContent = next === 'en-US' ? 'EN' : '中文';
    }
    
    // Refresh page to apply new language
    this.consoleManager.log(`Language switched to: ${next === 'en-US' ? 'English' : '简体中文'}`, 'info');
    setTimeout(() => window.location.reload(), 500);
  }

  handleMinimize() { /* browser limitation */ }

  handleMaximize() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  handleClose() {
    Dialog.confirm('Exit', 'Exit WebVado?').then(confirmed => {
      if (confirmed) window.close();
    });
  }

  async handleOpenFile(data) {
    const { projectId, filename } = data;
    
    try {
      const response = await this.apiClient.get(`/files/${projectId}/${filename}`);
      this.codeEditor.openFile(filename, response.content);
      this.consoleManager.log(`Opened: ${filename}`, 'info');
    } catch (err) {
      this.consoleManager.log(`ERROR opening file: ${err.message}`, 'error');
      Dialog.alert('Error', `Failed to open file: ${err.message}`);
    }
  }

  // Legacy methods for compatibility
  closeEditor() {
    if (this.codeEditor) {
      this.codeEditor.close();
    }
  }

  syncLines(ta) {
    // No longer needed with new CodeEditor
  }

  openFileFromTree(relPath) {
    // Handled by SourcesPanel now
  }
}

// ── Bootstrap ────────────────────────────────────────────────

const app = new WebVadoApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

window.webvado = app;
export default app;
