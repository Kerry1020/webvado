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
  static show({ title, body, buttons = [], onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    
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
    closeBtn.setAttribute('aria-label', 'Close dialog');
    
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
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btnConfig.onClick) {
          const result = btnConfig.onClick();
          // if onClick returns false explicitly, don't close
          if (result === false) return;
        }
        Dialog.close(overlay);
      };
      footer.appendChild(btn);
    });
    
    dialog.appendChild(titleBar);
    dialog.appendChild(bodyEl);
    if (buttons.length > 0) {
      dialog.appendChild(footer);
    }
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Close handlers
    const handleClose = () => {
      Dialog.close(overlay);
      if (onClose) onClose();
    };
    
    closeBtn.onclick = handleClose;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        handleClose();
      }
    };
    
    // ESC key handler
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Focus the first button or close button
    setTimeout(() => {
      const firstBtn = footer.querySelector('button') || closeBtn;
      firstBtn.focus();
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
  
  /**
   * Show a confirmation dialog
   * @param {string} title
   * @param {string} message
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if canceled
   */
  static confirm(title, message) {
    return new Promise((resolve) => {
      Dialog.show({
        title,
        body: `<p>${message}</p>`,
        buttons: [
          { text: 'Cancel', onClick: () => resolve(false) },
          { text: 'OK', primary: true, onClick: () => resolve(true) }
        ],
        onClose: () => resolve(false)
      });
    });
  }
  
  /**
   * Show a prompt dialog
   * @param {string} title
   * @param {string} message
   * @param {string} defaultValue
   * @returns {Promise<string|null>} Resolves to input value or null if canceled
   */
  static prompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const form = document.createElement('form');
      form.innerHTML = `
        <p>${message}</p>
        <input type="text" class="dialog-input" value="${defaultValue}" autofocus>
      `;
      
      const input = form.querySelector('input');
      
      const dialog = Dialog.show({
        title,
        body: form,
        buttons: [
          { text: 'Cancel', onClick: () => resolve(null) },
          { text: 'OK', primary: true, onClick: () => resolve(input.value) }
        ],
        onClose: () => resolve(null)
      });
      
      // Submit on Enter
      form.onsubmit = (e) => {
        e.preventDefault();
        resolve(input.value);
        Dialog.close(dialog.parentElement);
      };
      
      // Focus input after dialog appears
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }
  
  /**
   * Show an alert dialog
   * @param {string} title
   * @param {string} message
   * @returns {Promise<void>}
   */
  static alert(title, message) {
    return new Promise((resolve) => {
      Dialog.show({
        title,
        body: `<p>${message}</p>`,
        buttons: [
          { text: 'OK', primary: true, onClick: () => resolve() }
        ],
        onClose: () => resolve()
      });
    });
  }
}
