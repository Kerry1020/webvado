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
    this.container.innerHTML = '';
    this.container.className = 'code-editor';
    
    // Header
    const header = document.createElement('div');
    header.className = 'editor-header';
    
    this.fileLabel = document.createElement('span');
    this.fileLabel.className = 'editor-filename';
    this.fileLabel.textContent = 'No file open';
    
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'editor-close-btn';
    this.closeBtn.innerHTML = '×';
    this.closeBtn.title = 'Close file';
    this.closeBtn.style.display = 'none';
    this.closeBtn.onclick = () => this.close();
    
    header.appendChild(this.fileLabel);
    header.appendChild(this.closeBtn);
    
    // Editor area
    const editorArea = document.createElement('div');
    editorArea.className = 'editor-area';
    
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
    
    this.container.appendChild(header);
    this.container.appendChild(editorArea);
    this.container.appendChild(this.errorPanel);
    
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
    
    // Tab key inserts 4 spaces
    this.textarea.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        
        this.textarea.value = value.substring(0, start) + '    ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        
        this.content = this.textarea.value;
        this.updateLineNumbers();
        if (this.changeCallback) {
          this.changeCallback(this.content);
        }
      }
    };
    
    this.updateLineNumbers();
  }
  
  openFile(filename, content) {
    this.filename = filename;
    this.content = content || '';
    this.textarea.value = this.content;
    this.fileLabel.textContent = filename;
    this.closeBtn.style.display = 'block';
    this.updateLineNumbers();
    this.clearErrors();
    this.applySyntaxHighlighting();
  }
  
  getContent() {
    return this.textarea.value;
  }
  
  close() {
    this.filename = null;
    this.content = '';
    this.textarea.value = '';
    this.fileLabel.textContent = 'No file open';
    this.closeBtn.style.display = 'none';
    this.updateLineNumbers();
    this.clearErrors();
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
    this.errors.forEach(error => {
      const severity = error.severity || 'error';
      const icon = severity === 'error' ? Icons.error : severity === 'warning' ? Icons.warning : Icons.info;
      const className = `error-item error-${severity}`;
      
      html += `
        <div class="${className}">
          <span class="error-icon">${icon}</span>
          <span class="error-location">Line ${error.line}:</span>
          <span class="error-message">${error.message}</span>
        </div>
      `;
    });
    
    this.errorPanel.innerHTML = html;
  }
  
  onChange(callback) {
    this.changeCallback = callback;
  }
  
  applySyntaxHighlighting() {
    // Simple syntax highlighting using CSS classes
    // This is optional and can be enhanced with more sophisticated parsing
    if (!this.filename) return;
    
    const ext = this.filename.split('.').pop().toLowerCase();
    
    if (ext === 'v' || ext === 'vh') {
      this.textarea.classList.add('verilog-code');
    } else if (ext === 'vhd' || ext === 'vhdl') {
      this.textarea.classList.add('vhdl-code');
    } else {
      this.textarea.className = 'editor-textarea';
    }
  }
}
