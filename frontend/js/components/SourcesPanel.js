/**
 * SourcesPanel.js - File tree for design sources, constraints and simulation files
 * Renders into #sourcesTree; the toolbar and tabs live in index.html.
 */

import { Icons } from '../ui/icons.js';
import { Dialog } from './Dialog.js';
import i18n from '../i18n/index.js';

const GROUPS = [
  { id: 'design', labelKey: 'sources.designSources', dir: 'srcs/rtl', apiKey: 'design_sources' },
  { id: 'constraints', labelKey: 'sources.constraints', dir: 'srcs/constrs', apiKey: 'constraints' },
  { id: 'simulation', labelKey: 'sources.simulationSources', dir: 'srcs/sim', apiKey: 'simulation_sources' }
];

const FILE_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]+$/;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export class SourcesPanel {
  constructor(eventBus, apiClient) {
    this.eventBus = eventBus;
    this.apiClient = apiClient;
    this.projectId = null;
    this.topModule = '';
    this.files = [];          // [{ name, path (project-relative), group }]
    this.selectedPath = null;
    this.expanded = new Set(GROUPS.map(g => g.id));
    this.view = 'sources';    // 'sources' | 'netlist' | 'compile-order'
    this.filter = '';
  }

  init() {
    this.container = document.getElementById('sourcesTree');
    if (!this.container) {
      console.error('[SourcesPanel] Container #sourcesTree not found');
      return;
    }

    this.setupEventListeners();
    this.render();
    window.addEventListener('locale-changed', () => this.render());
    console.log('[SourcesPanel] Initialized');
  }

  setupEventListeners() {
    // Group headers and file rows are <div>s, so they need their own delegation
    this.container.addEventListener('click', (e) => {
      const header = e.target.closest('.tree-group-header');
      if (header) {
        const id = header.dataset.group;
        if (this.expanded.has(id)) this.expanded.delete(id);
        else this.expanded.add(id);
        this.render();
        return;
      }
      const item = e.target.closest('.tree-item[data-path]');
      if (item) this.openFile(item.dataset.path);
    });

    this.container.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.tree-item[data-path]');
      if (item) this.showContextMenu(e, item.dataset.path);
    });

    this.setupDragDrop();

    // Tabs above the tree (UIManager marks the active tab and emits tab:<name>)
    for (const view of ['sources', 'netlist', 'compile-order']) {
      this.eventBus.on(`tab:${view}`, () => {
        this.view = view;
        if (view === 'netlist') this.loadNetlist();
        this.render();
      });
    }
  }

  setupDragDrop() {
    ['dragenter', 'dragover'].forEach(name => {
      this.container.addEventListener(name, (e) => {
        e.preventDefault();
        this.container.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      this.container.addEventListener(name, (e) => {
        e.preventDefault();
        this.container.classList.remove('drag-over');
      });
    });
    this.container.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length) this.uploadFiles(files);
    });
  }

  // ── Data ──────────────────────────────────────────────────────

  async setProject(projectId, topModule = '') {
    this.projectId = projectId;
    this.topModule = topModule || '';
    this.selectedPath = null;
    this.filter = '';
    this.netlist = null;
    this.netlistError = '';
    this.files = [];
    this.render();
    await this.refresh();
  }

  async refresh() {
    if (!this.projectId) {
      this.files = [];
      this.render();
      return;
    }

    try {
      const projectId = this.projectId;
      const tree = await this.apiClient.get(`/api/projects/${encodeURIComponent(projectId)}/files`);
      if (projectId !== this.projectId) return;
      const files = [];
      for (const group of GROUPS) {
        const walk = (items, prefix) => {
          for (const it of items || []) {
            const path = `${prefix}/${it.name}`;
            if (it.type === 'directory') walk(it.children, path);
            else files.push({ name: it.name, path, group: group.id });
          }
        };
        walk(tree[group.apiKey], group.dir);
      }
      this.files = files;
      this.render();
      this.eventBus.emit('sources:changed', this.files);
      return true;
    } catch (error) {
      this.eventBus.emit('console:error', `Failed to load files: ${error.message}`);
      Dialog.alert(i18n.t('common.error'), error.message);
      return false;
    }
  }

  getFiles() {
    return this.files;
  }

  async loadNetlist() {
    const projectId = this.projectId;
    if (!projectId) return;
    try {
      const result = await this.apiClient.get(`/api/build/${encodeURIComponent(projectId)}/netlist`);
      if (this.projectId !== projectId) return;
      this.netlist = result.netlist || result;
      this.netlistError = '';
    } catch (error) {
      if (this.projectId !== projectId) return;
      this.netlist = null;
      this.netlistError = error.message;
    }
    if (this.view === 'netlist') this.render();
  }

  // ── Rendering ─────────────────────────────────────────────────

  render() {
    if (!this.container) return;
    if (this.view === 'compile-order') return this.renderCompileOrder();
    if (this.view === 'netlist') {
      const modules = this.netlist?.modules;
      this.container.innerHTML = modules ? Object.entries(modules).map(([name, module]) => `
        <details class="netlist-module" open><summary>${esc(name)}</summary>
          <div class="tree-empty">${Object.keys(module.ports || {}).length} ports · ${Object.keys(module.cells || {}).length} cells</div>
          ${Object.entries(module.ports || {}).map(([port, value]) => `<div class="tree-item">${esc(value.direction)} ${esc(port)} [${value.bits.length}]</div>`).join('')}
          ${Object.entries(module.cells || {}).map(([cell, value]) => `<div class="tree-item">${esc(cell)}: ${esc(value.type)}</div>`).join('')}
        </details>`).join('') : `<div class="tree-empty">${esc(this.netlistError || i18n.t('messages.runSynthesisFirst'))}</div>`;
      return;
    }

    const visible = this.filter
      ? this.files.filter(f => f.name.toLowerCase().includes(this.filter.toLowerCase()))
      : this.files;

    this.container.innerHTML = (this.filter
      ? `<div class="tree-filter">${esc(i18n.t('common.search'))}: “${esc(this.filter)}” <button type="button" class="tree-filter-clear">×</button></div>`
      : '') + GROUPS.map(group => {
      const files = visible.filter(f => f.group === group.id);
      const open = this.expanded.has(group.id);
      return `
        <div class="tree-group">
          <div class="tree-group-header" data-group="${group.id}">
            <span class="tree-expand">${open ? '▾' : '▸'}</span>
            <span class="tree-label">${esc(i18n.t(group.labelKey))} (${files.length})</span>
          </div>
          <div class="tree-group-content"${open ? '' : ' style="display:none"'}>
            ${files.length ? files.map(f => this.renderItem(f)).join('') : `<div class="tree-empty">${esc(i18n.t('sources.noFiles'))}</div>`}
          </div>
        </div>`;
    }).join('');

    this.container.querySelector('.tree-filter-clear')?.addEventListener('click', () => {
      this.filter = '';
      this.render();
    });
  }

  renderItem(file) {
    const isTop = this.topModule && file.name.replace(/\.[^.]+$/, '') === this.topModule;
    return `
      <div class="tree-item${file.path === this.selectedPath ? ' selected' : ''}" data-path="${esc(file.path)}" data-file="${esc(file.name)}" title="${esc(file.path)}">
        <span class="tree-icon">${this.getFileIcon(file.name)}</span>
        <span class="tree-name">${esc(file.name)}${isTop ? ' <b>(top)</b>' : ''}</span>
      </div>`;
  }

  renderCompileOrder() {
    const order = this.files.filter(f => f.group !== 'constraints');
    this.container.innerHTML = order.length
      ? order.map((f, i) => `<div class="tree-item" data-path="${esc(f.path)}" data-file="${esc(f.name)}"><span class="tree-name">${i + 1}. ${esc(f.path)}</span></div>`).join('')
      : `<div class="tree-empty">${esc(i18n.t('sources.noFiles'))}</div>`;
  }

  getFileIcon(filename) {
    if (/\.(v|vh|sv)$/i.test(filename)) return Icons.verilog;
    if (/\.vhdl?$/i.test(filename)) return Icons.vhdl;
    if (/\.(pcf|xdc|sdc|lpf)$/i.test(filename)) return Icons.constraint;
    return Icons.verilog;
  }

  groupForName(name) {
    if (/\.(pcf|xdc|sdc|lpf)$/i.test(name)) return 'constraints';
    if (/(_tb|_sim|tb_)/i.test(name)) return 'simulation';
    return 'design';
  }

  // ── Actions ───────────────────────────────────────────────────

  openFile(path) {
    this.selectedPath = path;
    this.render();
    this.eventBus.emit('editor:open-file', { projectId: this.projectId, filename: path });
  }

  requireProject() {
    if (this.projectId) return true;
    Dialog.alert(i18n.t('common.error'), i18n.t('messages.noProjectOpen'));
    return false;
  }

  // Add Sources: create a new file or pick existing files from disk
  showAddDialog() {
    if (!this.requireProject()) return;
    const t = i18n.t.bind(i18n);

    const form = document.createElement('form');
    form.className = 'dialog-form';
    form.innerHTML = `
      <div class="dialog-form-group">
        <label for="new-file-group">${esc(t('sources.fileType'))}</label>
        <select id="new-file-group">
          <option value="design">${esc(t('sources.typeDesign'))}</option>
          <option value="constraints">${esc(t('sources.typeConstraint'))}</option>
          <option value="simulation">${esc(t('sources.typeSimulation'))}</option>
        </select>
      </div>
      <div class="dialog-form-group">
        <label for="new-file-name">${esc(t('sources.fileName'))}</label>
        <input type="text" id="new-file-name" placeholder="${esc(t('sources.fileNamePlaceholder'))}">
      </div>
      <div class="dialog-form-group">
        <button type="button" class="btn" id="add-existing-files">${esc(t('sources.addExisting'))}</button>
      </div>
    `;

    const nameInput = form.querySelector('#new-file-name');
    const groupSelect = form.querySelector('#new-file-group');
    nameInput.addEventListener('input', () => {
      nameInput.setCustomValidity('');
      if (/\.(pcf|xdc|sdc|lpf)$/i.test(nameInput.value)) groupSelect.value = 'constraints';
    });

    const dialog = Dialog.show({
      title: t('sources.addSourcesTitle'),
      body: form,
      buttons: [
        { text: t('common.cancel') },
        {
          text: t('sources.createFile'),
          primary: true,
          onClick: async () => {
            const name = nameInput.value.trim();
            if (!FILE_NAME.test(name)) {
              nameInput.setCustomValidity(t('sources.invalidFileName'));
              nameInput.reportValidity();
              return false;
            }
            const ok = await this.createFile(groupSelect.value, name);
            return ok ? undefined : false;
          }
        }
      ]
    });

    form.onsubmit = (e) => {
      e.preventDefault();
      dialog.querySelector('.dialog-footer .btn-primary')?.click();
    };

    form.querySelector('#add-existing-files').onclick = () => {
      dialog.querySelector('.dialog-close')?.click();
      this.pickFiles();
    };
  }

  async createFile(groupId, name) {
    const projectId = this.projectId;
    const group = GROUPS.find(g => g.id === groupId) || GROUPS[0];
    const path = `${group.dir}/${name}`;
    if (this.files.some(f => f.path === path)) {
      Dialog.alert(i18n.t('common.error'), `${path} already exists`);
      return false;
    }

    const module = name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_]/g, '_');
    let content = '';
    if (/\.(v|sv)$/i.test(name)) {
      content = groupId === 'simulation'
        ? `\`timescale 1ns / 1ps\n\nmodule ${module};\n\n  initial begin\n    $dumpfile("simulation.vcd");\n    $dumpvars(0, ${module});\n    #1000;\n    $finish;\n  end\n\nendmodule\n`
        : `\`timescale 1ns / 1ps\n\nmodule ${module} (\n  input  wire clk,\n  input  wire rst\n);\n\nendmodule\n`;
    }

    try {
      await this.apiClient.post(`/api/files/${encodeURIComponent(projectId)}/${path}`, { content });
      if (projectId !== this.projectId) return true;
      this.eventBus.emit('console:log', `Created ${path}`);
      this.expanded.add(group.id);
      await this.refresh();
      this.openFile(path);
      return true;
    } catch (error) {
      Dialog.alert(i18n.t('common.error'), error.message);
      return false;
    }
  }

  pickFiles() {
    if (!this.requireProject()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.v,.vh,.sv,.vhd,.vhdl,.pcf,.xdc,.sdc,.lpf';
    input.onchange = () => {
      if (input.files.length) this.uploadFiles(Array.from(input.files));
    };
    input.click();
  }

  async uploadFiles(files) {
    if (!this.requireProject()) return;
    const projectId = this.projectId;
    for (const file of files) {
      if (!FILE_NAME.test(file.name)) {
        this.eventBus.emit('console:error', `Skipped ${file.name}: ${i18n.t('sources.invalidFileName')}`);
        continue;
      }
      const group = GROUPS.find(g => g.id === this.groupForName(file.name));
      try {
        const content = await file.text();
        await this.apiClient.post(`/api/files/${encodeURIComponent(projectId)}/${group.dir}/${file.name}`, { content });
        this.eventBus.emit('console:log', `Added ${group.dir}/${file.name}`);
      } catch (error) {
        this.eventBus.emit('console:error', `Failed to add ${file.name}: ${error.message}`);
        Dialog.alert(i18n.t('common.error'), `Failed to add ${file.name}: ${error.message}`);
      }
    }
    await this.refresh();
  }

  async search() {
    if (!this.requireProject()) return;
    const term = await Dialog.prompt(i18n.t('sources.searchTitle'), i18n.t('sources.searchPrompt'), this.filter);
    if (term === null) return;
    this.filter = term.trim();
    this.view = 'sources';
    document.querySelector('.tab[data-tab="sources"]')?.click();
    this.render();
  }

  showContextMenu(event, path) {
    event.preventDefault();
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    const file = this.files.find(f => f.path === path);
    if (!file) return;

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.innerHTML = `
      <div class="context-menu-item" data-cmd="open">${esc(i18n.t('sources.open'))}</div>
      ${file.group === 'design' ? `<div class="context-menu-item" data-cmd="set-top">${esc(i18n.t('sources.setAsTop'))}</div>` : ''}
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-cmd="remove">${esc(i18n.t('sources.remove'))}</div>
    `;
    document.body.appendChild(menu);

    const close = () => {
      menu.remove();
      document.removeEventListener('click', onOutside, true);
    };
    const onOutside = (e) => {
      if (!menu.contains(e.target)) close();
    };
    setTimeout(() => document.addEventListener('click', onOutside, true), 0);

    menu.onclick = async (e) => {
      const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
      if (!cmd) return;
      close();
      if (cmd === 'open') this.openFile(path);
      else if (cmd === 'set-top') this.eventBus.emit('sources:set-top', file.name.replace(/\.[^.]+$/, ''));
      else if (cmd === 'remove') await this.removeFile(file);
    };
  }

  setTopModule(name) {
    this.topModule = name;
    this.render();
  }

  async removeFile(file) {
    const projectId = this.projectId;
    if (this.beforeRemove && !(await this.beforeRemove(file.path))) return;
    const ok = await Dialog.confirm(i18n.t('sources.remove'), i18n.t('sources.removeConfirm', { name: file.path }));
    if (!ok || projectId !== this.projectId) return;
    try {
      await this.apiClient.delete(`/api/files/${encodeURIComponent(this.projectId)}/${file.path}`);
      this.eventBus.emit('console:log', `Removed ${file.path}`);
      this.eventBus.emit('sources:removed', file.path);
      await this.refresh();
    } catch (error) {
      Dialog.alert(i18n.t('common.error'), error.message);
    }
  }
}
