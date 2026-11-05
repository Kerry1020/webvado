import i18n from '../i18n/index.js';

/**
 * Dialog.js - Modal dialog system
 * Provides modal dialogs with overlay, Vivado-style title bar, and button controls
 */

export class Dialog {
  /**
   * Show a custom dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string|HTMLElement} options.body - Dialog body content
   * @param {Array} options.buttons - Array of button configs [{text, primary, onClick}]
   * @param {Function} options.onClose - Callback when dialog closes
   * @returns {HTMLElement} The dialog element
   */
  static show({ title, body, buttons = [], onClose, customClass }) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', title);
    const previousFocus = document.activeElement;
    let pending = false;
    
    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'dialog-title-bar';
    
    const titleText = document.createElement('div');
    titleText.className = 'dialog-title';
    titleText.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'dialog-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', i18n.t('common.close'));
    
    titleBar.appendChild(titleText);
    titleBar.appendChild(closeBtn);
    
    // Body
    const bodyEl = document.createElement('div');
    bodyEl.className = 'dialog-body';
    
    if (typeof body === 'string') {
      bodyEl.innerHTML = body;
    } else if (body instanceof HTMLElement) {
      bodyEl.appendChild(body);
    }
    
    // Footer with buttons
    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    
    buttons.forEach(btnConfig => {
      const btn = document.createElement('button');
      btn.type = 'button'; // prevent form submission
      btn.className = btnConfig.primary ? 'btn btn-primary' : 'btn';
      btn.textContent = btnConfig.text;
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        pending = true;
        dialog.setAttribute('aria-busy', 'true');
        [...footer.querySelectorAll('button'), closeBtn].forEach(b => { b.disabled = true; });
        try {
          if (btnConfig.onClick && await btnConfig.onClick() === false) return;
          pending = false;
          finish();
        } catch (error) {
          let message = bodyEl.querySelector('.dialog-action-error');
          if (!message) {
            message = document.createElement('p');
            message.className = 'dialog-action-error';
            message.setAttribute('role', 'alert');
            bodyEl.appendChild(message);
          }
          message.textContent = error.message;
        } finally {
          pending = false;
          dialog.removeAttribute('aria-busy');
          [...footer.querySelectorAll('button'), closeBtn].forEach(b => { b.disabled = false; });
        }
      };
      footer.appendChild(btn);
    });
    
    dialog.appendChild(titleBar);
    dialog.appendChild(bodyEl);
    if (buttons.length > 0) {
      dialog.appendChild(footer);
    }
    if (customClass) dialog.classList.add(customClass);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Every way of closing runs onClose exactly once
    let closed = false;
    const finish = () => {
      if (closed || pending) return;
      closed = true;
      document.removeEventListener('keydown', handleEsc);
      Dialog.close(overlay);
      if (onClose) onClose();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
    
    closeBtn.onclick = finish;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) finish();
    };
    
    // ESC closes only the topmost dialog
    const handleEsc = (e) => {
      if (overlay !== [...document.querySelectorAll('.dialog-overlay:not(.dialog-closing)')].pop()) return;
      if (e.key === 'Tab') {
        const focusable = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
          .filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          e.preventDefault(); last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          e.preventDefault(); first?.focus();
        }
      }
      if (e.key === 'Escape' && overlay === [...document.querySelectorAll('.dialog-overlay')].pop()) {
        e.preventDefault();
        finish();
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Focus the first input, else the primary button, else close
    setTimeout(() => {
      if (closed) return;
      const target = bodyEl.querySelector('input, select, textarea') ||
        footer.querySelector('.btn-primary') || footer.querySelector('button') || closeBtn;
      target.focus();
      if (target.select) target.select();
    }, 0);
    
    return dialog;
  }
  
  /**
   * Close a dialog
   * @param {HTMLElement} overlay - The overlay element to remove
   */
  static close(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.classList.add('dialog-closing');
      setTimeout(() => {
        overlay.remove();
      }, 200);
    }
  }
  
  static escape(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  
  /**
   * Show a confirmation dialog
   * @returns {Promise<boolean>} true if confirmed, false otherwise
   */
  static confirm(title, message, { okText = i18n.t('common.ok'), cancelText = i18n.t('common.cancel') } = {}) {
    return new Promise((resolve) => {
      let result = false;
      Dialog.show({
        title,
        body: `<p>${Dialog.escape(message)}</p>`,
        buttons: [
          { text: cancelText },
          { text: okText, primary: true, onClick: () => { result = true; } }
        ],
        onClose: () => resolve(result)
      });
    });
  }
  
  /**
   * Show a prompt dialog
   * @returns {Promise<string|null>} input value, or null if canceled
   */
  static prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const form = document.createElement('form');
      form.innerHTML = `
        <div class="dialog-form-group">
          <label>${Dialog.escape(message)}</label>
          <input type="text" class="dialog-input">
        </div>
      `;
      const input = form.querySelector('input');
      input.value = defaultValue;
      
      let result = null;
      Dialog.show({
        title,
        body: form,
        buttons: [
          { text: i18n.t('common.cancel') },
          { text: i18n.t('common.ok'), primary: true, onClick: () => { result = input.value; } }
        ],
        onClose: () => resolve(result)
      });
      
      // Enter submits through the OK button
      form.onsubmit = (e) => {
        e.preventDefault();
        form.closest('.dialog')?.querySelector('.dialog-footer .btn-primary')?.click();
      };
    });
  }
  
  /**
   * Show an alert dialog. The message is plain text; line breaks are kept.
   * @returns {Promise<void>}
   */
  static alert(title, message) {
    return new Promise((resolve) => {
      Dialog.show({
        title,
        body: `<div class="dialog-pre">${Dialog.escape(message)}</div>`,
        buttons: [{ text: i18n.t('common.ok'), primary: true }],
        onClose: () => resolve()
      });
    });
  }
}
