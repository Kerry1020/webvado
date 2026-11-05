/**
 * EditorManager - Manages code editor state and operations
 * TODO: Integrate CodeMirror 6
 */
export class EditorManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.openFiles = new Map(); // filename -> content
    this.currentFile = null;
    this.editor = null; // Will be CodeMirror instance
  }

  async init() {
    console.log('[EditorManager] Initialized (CodeMirror integration pending)');
  }

  openFile(filename, content) {
    this.openFiles.set(filename, content);
    this.currentFile = filename;
    this.eventBus.emit('editor:file-opened', { filename, content });
    
    // TODO: Display content in CodeMirror
    console.log(`[EditorManager] Opened file: ${filename}`);
  }

  saveCurrentFile() {
    if (!this.currentFile) return null;
    
    const content = this.openFiles.get(this.currentFile);
    this.eventBus.emit('editor:file-saved', { 
      filename: this.currentFile, 
      content 
    });
    
    return { filename: this.currentFile, content };
  }

  closeFile(filename) {
    this.openFiles.delete(filename);
    if (this.currentFile === filename) {
      this.currentFile = null;
    }
    this.eventBus.emit('editor:file-closed', { filename });
  }

  getCurrentFile() {
    return this.currentFile;
  }

  getOpenFiles() {
    return Array.from(this.openFiles.keys());
  }
}
