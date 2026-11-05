/**
 * icons.js - SVG icon library for WebVado
 * All icons are 16x16 with currentColor for themability
 */

export const Icons = {
  // File Operations
  newFile: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 0H2C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V5l-7-5z M9 2l5 3H9V2z M2 14V2h5v4h7v8H2z"/></svg>',
  
  openFile: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2C0 0.9 0.9 0 2 0h4l2 2h6c1.1 0 2 0.9 2 2v10c0 1.1-0.9 2-2 2H2c-1.1 0-2-0.9-2-2V2z M2 2v12h12V4H7.5L5.5 2H2z"/></svg>',
  
  save: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 0H2C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V2c0-1.1-0.9-2-2-2zM5 2h6v4H5V2zm7 12H4V9h8v5z"/></svg>',
  
  close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.3 2.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4L6.6 8l-5.7 5.3c-.4.4-.4 1 0 1.4s1 .4 1.4 0L8 9.4l5.3 5.3c.4.4 1 .4 1.4 0s.4-1 0-1.4L9.4 8l5.3-5.3c.4-.4.4-1 0-1.4s-1-.4-1.4 0L8 6.6 2.7 1.3c-.4-.4-1-.4-1.4 0z"/></svg>',
  
  // Edit Operations
  undo: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3L3 8l5 5V9c3.3 0 6 2.7 6 6 0-4.4-2.6-8-6-8V3z"/></svg>',
  
  redo: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3l5 5-5 5V9c-3.3 0-6 2.7-6 6 0-4.4 2.6-8 6-8V3z"/></svg>',
  
  cut: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 8C3.5 6.6 4.6 5.5 6 5.5c0.7 0 1.3 0.3 1.8 0.7L14 0v2L9 6l5 4v2L7.8 6.3C7.3 6.7 6.7 7 6 7c-1.4 0-2.5-1.1-2.5-2.5 0-0.6 0.2-1.1 0.5-1.5l-2-2L0 0l2 2 2 2zm0 5c0-1.4 1.1-2.5 2.5-2.5 0.7 0 1.3 0.3 1.8 0.7l1.2 1.3-1.5 1.5c-0.5 0.4-1.1 0.7-1.8 0.7-1.4 0-2.5-1.1-2.5-2.5z"/></svg>',
  
  copy: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 0C2.9 0 2 0.9 2 2v10h2V2h8V0H4zm4 4c-1.1 0-2 0.9-2 2v8c0 1.1 0.9 2 2 2h6c1.1 0 2-0.9 2-2V6c0-1.1-0.9-2-2-2H8zm0 2h6v8H8V6z"/></svg>',
  
  paste: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10 0H6C5.4 0 5 0.4 5 1v1H3C1.9 2 1 2.9 1 4v10c0 1.1 0.9 2 2 2h10c1.1 0 2-0.9 2-2V4c0-1.1-0.9-2-2-2h-2V1c0-0.6-0.4-1-1-1zm0 2v2H6V2h4zm3 2v10H3V4h2v1h6V4h2z"/></svg>',
  
  find: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="14" y2="14" stroke="currentColor" stroke-width="2"/></svg>',
  
  // Flow Operations
  play: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2v12l10-6z"/></svg>',
  
  stop: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12"/></svg>',
  
  compile: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L2 8l6 6 6-6-6-6zm0 2.8L11.2 8 8 11.2 4.8 8 8 4.8z"/></svg>',
  
  debug: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1C6.3 1 5 2.3 5 4v1H2v2h1.1C3 7.3 3 7.7 3 8s0 0.7 0.1 1H2v2h1v1c0 1.7 1.3 3 3 3h4c1.7 0 3-1.3 3-3v-1h1V9h-1.1c0.1-0.3 0.1-0.7 0.1-1s0-0.7-0.1-1H14V5h-3V4c0-1.7-1.3-3-3-3zm0 2c0.6 0 1 0.4 1 1v1H7V4c0-0.6 0.4-1 1-1zM5 7h6v1c0 1.7-1.3 3-3 3S5 9.7 5 8V7z"/></svg>',
  
  // File Type Icons
  verilog: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 0C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V4l-4-4H2zm0 2h8v3h3v9H2V2zm3 4l2 6h2l2-6h-1.5l-1.5 4.5L6.5 6H5z"/></svg>',
  
  vhdl: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 0C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V4l-4-4H2zm0 2h8v3h3v9H2V2zm2 4v6h1.5l1-3 1 3H9V6H7.5v3L7 6H5.5L5 9V6H3z"/></svg>',
  
  constraint: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 0C0.9 0 0 0.9 0 2v12c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V4l-4-4H2zm0 2h8v3h3v9H2V2zm2 4v1h8V6H4zm0 2v1h6V8H4zm0 2v1h8v-1H4z"/></svg>',
  
  folder: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2C0 0.9 0.9 0 2 0h4l2 2h6c1.1 0 2 0.9 2 2v10c0 1.1-0.9 2-2 2H2c-1.1 0-2-0.9-2-2V2z"/></svg>',
  
  folderOpen: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2C0 0.9 0.9 0 2 0h4l2 2h6c1.1 0 2 0.9 2 2v2H2v8H0V2zm1 6h14l-1 6H2l-1-6z"/></svg>',
  
  // Status Icons
  success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#22c55e"><circle cx="8" cy="8" r="7" fill="#22c55e"/><path d="M6 8l2 2 4-4" stroke="white" stroke-width="2" fill="none"/></svg>',
  
  error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#ef4444"><circle cx="8" cy="8" r="7" fill="#ef4444"/><path d="M5 5l6 6M11 5l-6 6" stroke="white" stroke-width="2"/></svg>',
  
  warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f59e0b"><path d="M8 1L1 14h14L8 1z" fill="#f59e0b"/><path d="M8 6v4M8 11v1" stroke="white" stroke-width="1.5" fill="none"/></svg>',
  
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#3b82f6"><circle cx="8" cy="8" r="7" fill="#3b82f6"/><text x="8" y="12" font-size="12" font-weight="bold" fill="white" text-anchor="middle">i</text></svg>',
  
  // UI Control Icons
  expand: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 10l-4-4h8z"/></svg>',
  
  collapse: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 6l4 4H4z"/></svg>',
  
  settings: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5zm6.1 2.4l-1.4-.9c.1-.4.1-.8 0-1.2l1.4-.9c.3-.2.4-.6.2-.9l-1.5-2.6c-.2-.3-.6-.4-.9-.2l-1.4.9c-.6-.4-1.3-.7-2-.8V.5c0-.3-.3-.5-.5-.5h-3c-.3 0-.5.2-.5.5v1.7c-.7.2-1.4.5-2 .8l-1.4-.9c-.3-.2-.7-.1-.9.2L.5 4.9c-.2.3-.1.7.2.9l1.4.9c-.1.4-.1.8 0 1.2l-1.4.9c-.3.2-.4.6-.2.9l1.5 2.6c.2.3.6.4.9.2l1.4-.9c.6.4 1.3.7 2 .8v1.7c0 .3.2.5.5.5h3c.3 0 .5-.2.5-.5v-1.7c.7-.2 1.4-.5 2-.8l1.4.9c.3.2.7.1.9-.2l1.5-2.6c.2-.3.1-.7-.2-.9z"/></svg>',
  
  help: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 6c0-1.1 0.9-2 2-2s2 0.9 2 2c0 1-0.6 1.5-1.2 2C8.3 8.3 8 8.7 8 9.5M8 12v0.5"/><circle cx="8" cy="12" r="0.5" fill="currentColor"/></svg>',
  
  language: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 8h12M8 1c-2 2-3 5-3 7s1 5 3 7M8 1c2 2 3 5 3 7s-1 5-3 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  
  // Additional Icons
  add: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/></svg>',
  
  remove: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8h12" stroke="currentColor" stroke-width="2"/></svg>',
  
  refresh: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 8c0 3.3-2.7 6-6 6s-6-2.7-6-6h2c0 2.2 1.8 4 4 4s4-1.8 4-4-1.8-4-4-4V2c3.3 0 6 2.7 6 6z"/><path d="M5 4L8 7 5 10V4z"/></svg>',
  
  search: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="14" y2="14" stroke="currentColor" stroke-width="2"/></svg>',
  
  download: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2v8M4 7l4 4 4-4M2 14h12"/></svg>',
  
  upload: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 10V2M4 5l4-4 4 4M2 14h12"/></svg>',
  
  trash: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h12M5 4V2h6v2M6 6v6M8 6v6M10 6v6M4 4v10c0 1.1 0.9 2 2 2h4c1.1 0 2-0.9 2-2V4"/></svg>'
};

/**
 * Get an icon by name
 * @param {string} name - Icon name
 * @returns {string} SVG markup
 */
export function getIcon(name) {
  return Icons[name] || Icons.help;
}

/**
 * Create an icon element
 * @param {string} name - Icon name
 * @param {string} className - Optional CSS class
 * @returns {HTMLElement} Span element containing the icon
 */
export function createIcon(name, className = '') {
  const span = document.createElement('span');
  span.className = `icon ${className}`.trim();
  span.innerHTML = getIcon(name);
  return span;
}
