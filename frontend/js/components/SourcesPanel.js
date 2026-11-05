/**
 * SourcesPanel.js - File tree panel for design sources, constraints, and simulation files
 */

import { Icons } from '../ui/icons.js';

export class SourcesPanel {
  constructor(eventBus, apiClient) {
    this.eventBus = eventBus;
    this.apiClient = apiClient;
    this.projectId = null;
    this.files = [];
    this.selectedFile = null;
  }
  
  init() {
    this.container = document.getElementById('sources-panel');
    if (!this.container) {
      console.error('Sources panel container not found');
      return;
    }
    
    this.render();
    this.setupEventListeners();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="sources-toolbar">
        <button class="btn-icon" id="add-file-btn" title="Add file">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M 8 3 L 8 13 M 3 8 L 13 8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="btn-icon" id="refresh-files-btn" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M 13 8 A 5 5 0 1 1 8 3 L 8 1 L 11 4 L 8 7 L 8 5 A 3 3 0 1 0 11 8" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
      
      <div class="sources-tree">
        <div class="tree-group">
          <div class="tree-group-header" data-group="design">
            <span class="tree-expand">▸</span>
            <span class="tree-label">Design Sources</span>
          </div>
          <div class="tree-group-content" data-group="design" style="display: none;">
            <div class="tree-empty">No files</div>
          </div>
        </div>
        
        <div class="tree-group">
          <div class="tree-group-header" data-group="constraints">
            <span class="tree-expand">▸</span>
            <span class="tree-label">Constraints</span>
          </div>
          <div class="tree-group-content" data-group="constraints" style="display: none;">
            <div class="tree-empty">No files</div>
          </div>
        </div>
        
        <div class="tree-group">
          <div class="tree-group-header" data-group="simulation">
            <span class="tree-expand">▸</span>
            <span class="tree-label">Simulation Sources</span>
          </div>
          <div class="tree-group-content" data-group="simulation" style="display: none;">
            <div class="tree-empty">No files</div>
          </div>
        </div>
      </div>
      
      <div class="sources-drop-zone" style="display: none;">
        Drop files here to add
      </div>
    `;
  }
  
  setupEventListeners() {
    // Toggle groups
    this.container.querySelectorAll('.tree-group-header').forEach(header => {
      header.onclick = () => {
        const group = header.dataset.group;
        const content = this.container.querySelector(`[data-group="${group}"].tree-group-content`);
        const expand = header.querySelector('.tree-expand');
        
        if (content.style.display === 'none') {
          content.style.display = 'block';
          expand.textContent = '▾';
        } else {
          content.style.display = 'none';
          expand.textContent = '▸';
        }
      };
    });
    
    // Add file button
    const addBtn = this.container.querySelector('#add-file-btn');
    if (addBtn) {
      addBtn.onclick = () => this.handleAddFile();
    }
    
    // Refresh button
    const refreshBtn = this.container.querySelector('#refresh-files-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refresh();
    }
    
    // Drag and drop
    this.setupDragDrop();
  }
  
  setupDragDrop() {
    const dropZone = this.container.querySelector('.sources-drop-zone');
    const tree = this.container.querySelector('.sources-tree');
    
    ['dragenter', 'dragover'].forEach(eventName => {
      this.container.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.display = 'flex';
        tree.style.display = 'none';
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      this.container.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.display = 'none';
        tree.style.display = 'block';
      });
    });
    
    this.container.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.handleFileUpload(files);
      }
    });
  }
  
  setProject(projectId) {
    this.projectId = projectId;
    this.refresh();
  }
  
  async refresh() {
    if (!this.projectId) {
      this.files = [];
      this.updateTree();
      return;
    }
    
    try {
      const response = await this.apiClient.get(`/projects/${this.projectId}/files`);
      this.files = response.files || [];
      this.updateTree();
    } catch (error) {
      console.error('Failed to refresh files:', error);
      this.eventBus.emit('console:error', `Failed to load files: ${error.message}`);
    }
  }
  
  updateTree() {
    // Categorize files
    const design = this.files.filter(f => this.isDesignFile(f.name));
    const constraints = this.files.filter(f => this.isConstraintFile(f.name));
    const simulation = this.files.filter(f => this.isSimulationFile(f.name));
    
    // Update design sources
    this.updateGroup('design', design);
    this.updateGroup('constraints', constraints);
    this.updateGroup('simulation', simulation);
  }
  
  updateGroup(groupName, files) {
    const content = this.container.querySelector(`[data-group="${groupName}"].tree-group-content`);
    if (!content) return;
    
    if (files.length === 0) {
      content.innerHTML = '<div class="tree-empty">No files</div>';
      return;
    }
    
    let html = '';
    files.forEach(file => {
      const icon = this.getFileIcon(file.name);
      const selected = this.selectedFile === file.name ? ' selected' : '';
      html += `
        <div class="tree-item${selected}" data-file="${file.name}">
          <span class="tree-icon">${icon}</span>
          <span class="tree-name">${file.name}</span>
        </div>
      `;
    });
    
    content.innerHTML = html;
    
    // Add click handlers
    content.querySelectorAll('.tree-item').forEach(item => {
      item.onclick = () => this.handleFileClick(item.dataset.file);
      item.oncontextmenu = (e) => this.handleFileContextMenu(e, item.dataset.file);
    });
  }
  
  isDesignFile(filename) {
    return /\.(v|vh|sv|vhd|vhdl)$/i.test(filename);
  }
  
  isConstraintFile(filename) {
    return /\.(pcf|xdc|sdc|lpf)$/i.test(filename);
  }
  
  isSimulationFile(filename) {
    return /_tb\.(v|vhd)$/i.test(filename) || /_sim\.(v|vhd)$/i.test(filename);
  }
  
  getFileIcon(filename) {
    if (/\.v(h|erilog)?$/i.test(filename)) return Icons.verilog;
    if (/\.vhd(l)?$/i.test(filename)) return Icons.vhdl;
    if (/\.(pcf|xdc|sdc|lpf)$/i.test(filename)) return Icons.constraint;
    return Icons.verilog;
  }
  
  handleFileClick(filename) {
    this.selectedFile = filename;
    this.updateTree();
    this.eventBus.emit('editor:open-file', { projectId: this.projectId, filename });
  }
  
  handleFileContextMenu(event, filename) {
    event.preventDefault();
    
    // Simple context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.innerHTML = `
      <div class="context-menu-item" data-action="open">Open</div>
      <div class="context-menu-item" data-action="set-top">Set as Top</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="remove">Remove</div>
    `;
    
    document.body.appendChild(menu);
    
    menu.onclick = async (e) => {
      const action = e.target.dataset.action;
      menu.remove();
      
      if (action === 'open') {
        this.handleFileClick(filename);
      } else if (action === 'set-top') {
        this.eventBus.emit('console:log', `Set ${filename} as top module`);
      } else if (action === 'remove') {
        await this.handleRemoveFile(filename);
      }
    };
    
    // Close menu on click outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }
  
  async handleAddFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.v,.vh,.sv,.vhd,.vhdl,.pcf,.xdc,.sdc,.lpf';
    
    input.onchange = () => {
      if (input.files.length > 0) {
        this.handleFileUpload(Array.from(input.files));
      }
    };
    
    input.click();
  }
  
  async handleFileUpload(files) {
    if (!this.projectId) {
      this.eventBus.emit('console:error', 'No project selected');
      return;
    }
    
    for (const file of files) {
      try {
        const content = await file.text();
        await this.apiClient.post(`/files/${this.projectId}/${file.name}`, { content });
        this.eventBus.emit('console:log', `Added file: ${file.name}`);
      } catch (error) {
        this.eventBus.emit('console:error', `Failed to add ${file.name}: ${error.message}`);
      }
    }
    
    await this.refresh();
  }
  
  async handleRemoveFile(filename) {
    if (!this.projectId) return;
    
    const confirm = await window.confirm(`Remove ${filename}?`);
    if (!confirm) return;
    
    try {
      await this.apiClient.delete(`/files/${this.projectId}/${filename}`);
      this.eventBus.emit('console:log', `Removed file: ${filename}`);
      await this.refresh();
    } catch (error) {
      this.eventBus.emit('console:error', `Failed to remove ${filename}: ${error.message}`);
    }
  }
  
  getSelectedFile() {
    return this.selectedFile;
  }
}
