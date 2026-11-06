/**
 * CodeEditor.js - Simple code editor with line numbers and error highlighting
 */

import { Icons } from '../ui/icons.js';

export class CodeEditor {
  constructor(container) {
    this.container = container;
    this.filename = null;
    this.content = '';
    this.errors = [];
    this.changeCallback = null;
    
    this.init();
  }
  
  init() {
    // Mount next to the welcome screen instead of wiping the container,
    // so the welcome buttons survive and come back when no file is open
    this.welcome = this.container.querySelector('#welcomeScreen');
    this.root = document.createElement('div');
    this.root.className = 'code-editor';
    this.root.hidden = true;
    this.container.appendChild(this.root);
    
    // Header
    const header = document.createElement('div');
    header.className = 'editor-header';
    
    this.fileLabel = document.createElement('span');
    this.fileLabel.className = 'editor-filename';
    this.fileLabel.textContent = 'No file open';
    
    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.className = 'editor-close-btn';
    this.closeBtn.innerHTML = '×';
    this.closeBtn.title = 'Close file';
    this.closeBtn.style.display = 'none';
    this.closeBtn.onclick = () => this.requestClose?.();
    
    header.appendChild(this.fileLabel);
    header.appendChild(this.closeBtn);
    
    // Editor area (unique class so it does not collide with the outer
    // `.editor-area` container in index.html, whose rule sets
    // flex-direction: column and would collapse the textarea)
    const editorArea = document.createElement('div');
    editorArea.className = 'editor-split';
    
    // Line numbers
    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'editor-line-numbers';
    
    // Text area
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'editor-textarea';
    this.textarea.spellcheck = false;
    this.textarea.wrap = 'off';
    
    editorArea.appendChild(this.lineNumbers);
    editorArea.appendChild(this.textarea);
    
    // Error panel
    this.errorPanel = document.createElement('div');
    this.errorPanel.className = 'editor-error-panel';
    this.errorPanel.style.display = 'none';
    
    this.root.appendChild(header);
    this.root.appendChild(editorArea);
    this.root.appendChild(this.errorPanel);
    
    // Event listeners
    this.textarea.oninput = () => {
      this.content = this.textarea.value;
      this.updateLineNumbers();
      if (this.changeCallback) {
        this.changeCallback(this.content);
      }
    };
    
    this.textarea.onscroll = () => {
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    };
    
    // Tab key inserts spaces through the edit history so Undo still works
    this.tabSize = 4;
    this.textarea.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, ' '.repeat(this.tabSize));
      }
    };
    
    this.updateLineNumbers();
  }
  
  openFile(filename, content) {
    this.session = (this.session || 0) + 1;
    this.filename = filename;
    this.content = content || '';
    this.textarea.value = this.content;
    this.savedContent = this.content;
    this.fileLabel.textContent = filename;
    this.closeBtn.style.display = 'block';
    this.root.hidden = false;
    if (this.welcome) this.welcome.hidden = true;
    this.updateLineNumbers();
    this.clearErrors();
    this.applySyntaxHighlighting();
    this.textarea.focus();
  }
  
  getContent() {
    return this.textarea.value;
  }
  
  isOpen() {
    return !!this.filename;
  }
  
  isDirty() {
    return this.isOpen() && this.textarea.value !== this.savedContent;
  }
  
  markSaved(content = this.textarea.value) {
    this.savedContent = content;
  }
  
  close() {
    this.session = (this.session || 0) + 1;
    this.filename = null;
    this.content = '';
    this.textarea.value = '';
    this.fileLabel.textContent = 'No file open';
    this.closeBtn.style.display = 'none';
    this.root.hidden = true;
    if (this.welcome) this.welcome.hidden = false;
    this.updateLineNumbers();
    this.clearErrors();
  }
  
  // Undo/redo/cut/copy/paste act on the textarea's native edit history
  runCommand(command) {
    if (!this.isOpen()) return false;
    this.textarea.focus();
    return document.execCommand(command);
  }
  
  insertText(text) {
    if (!this.isOpen()) return false;
    this.textarea.focus();
    return document.execCommand('insertText', false, text);
  }
  
  // Selects the next match after the cursor, wrapping to the top
  find(term) {
    if (!this.isOpen() || !term) return false;
    const value = this.textarea.value;
    let idx = value.indexOf(term, this.textarea.selectionEnd);
    if (idx < 0) idx = value.indexOf(term);
    if (idx < 0) return false;
    this.textarea.focus();
    this.textarea.setSelectionRange(idx, idx + term.length);
    this.scrollToOffset(idx);
    return true;
  }
  
  replaceAll(term, replacement) {
    if (!this.isOpen() || !term) return 0;
    const count = this.textarea.value.split(term).length - 1;
    if (count > 0) {
      this.textarea.focus();
      this.textarea.select();
      document.execCommand('insertText', false, this.textarea.value.split(term).join(replacement));
    }
    return count;
  }
  
  goToLine(line) {
    if (!this.isOpen() || !line) return;
    const lines = this.textarea.value.split('\n');
    const target = Math.min(Math.max(line, 1), lines.length);
    const offset = lines.slice(0, target - 1).reduce((n, l) => n + l.length + 1, 0);
    this.textarea.focus();
    this.textarea.setSelectionRange(offset, offset + lines[target - 1].length);
    this.scrollToOffset(offset);
  }
  
  scrollToOffset(offset) {
    const line = this.textarea.value.slice(0, offset).split('\n').length;
    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 18;
    this.textarea.scrollTop = Math.max(0, (line - 3) * lineHeight);
  }
  
  updateLineNumbers() {
    const lines = this.textarea.value.split('\n');
    const lineCount = lines.length;
    
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      const hasError = this.errors.some(err => err.line === i);
      const className = hasError ? 'line-number error-line' : 'line-number';
      html += `<div class="${className}">${i}</div>`;
    }
    
    this.lineNumbers.innerHTML = html;
  }
  
  setErrors(errors) {
    this.errors = errors || [];
    this.updateLineNumbers();
    this.updateErrorPanel();
  }
  
  clearErrors() {
    this.errors = [];
    this.updateLineNumbers();
    this.errorPanel.style.display = 'none';
    this.errorPanel.innerHTML = '';
  }
  
  updateErrorPanel() {
    if (this.errors.length === 0) {
      this.errorPanel.style.display = 'none';
      this.errorPanel.innerHTML = '';
      return;
    }
    
    this.errorPanel.style.display = 'block';
    
    let html = '<div class="error-panel-title">Errors:</div>';
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.errors.forEach(error => {
      const severity = error.severity || 'error';
      const icon = severity === 'error' ? Icons.error : severity === 'warning' ? Icons.warning : Icons.info;
      const className = `error-item error-${severity}`;
      
      html += `
        <div class="${className}" data-line="${error.line || ''}">
          <span class="error-icon">${icon}</span>
          <span class="error-location">${error.line ? `Line ${error.line}:` : ''}</span>
          <span class="error-message">${esc(error.message)}</span>
        </div>
      `;
    });
    
    this.errorPanel.innerHTML = html;
    this.errorPanel.querySelectorAll('.error-item[data-line]').forEach(item => {
      item.onclick = () => this.goToLine(parseInt(item.dataset.line, 10));
    });
  }
  
  applySettings({ tabSize = 4, showLineNumbers = true } = {}) {
    this.tabSize = tabSize;
    this.textarea.style.tabSize = tabSize;
    this.lineNumbers.style.display = showLineNumbers ? '' : 'none';
  }
  
  onChange(callback) {
    this.changeCallback = callback;
  }
  
  applySyntaxHighlighting() {
    // Simple syntax highlighting using CSS classes
    // This is optional and can be enhanced with more sophisticated parsing
    if (!this.filename) return;
    
    const ext = this.filename.split('.').pop().toLowerCase();
    this.textarea.classList.remove('verilog-code', 'vhdl-code');
    
    if (ext === 'v' || ext === 'vh') {
      this.textarea.classList.add('verilog-code');
    } else if (ext === 'vhd' || ext === 'vhdl') {
      this.textarea.classList.add('vhdl-code');
    } else {
      this.textarea.className = 'editor-textarea';
    }
  }
}
