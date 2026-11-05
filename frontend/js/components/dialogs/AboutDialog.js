/**
 * AboutDialog.js - 关于对话框（支持国际化）
 */

import { Dialog } from '../Dialog.js';
import { APIClient } from '../../api/APIClient.js';
import i18n from '../../i18n/index.js';
import { Icons } from '../../ui/icons.js';

export class AboutDialog {
  static show() {
    const t = i18n.t.bind(i18n);
    const apiClient = new APIClient();

    const content = document.createElement('div');
    content.className = 'about-content';
    content.innerHTML = `
      <h2>WebVado</h2>
      <div class="about-version">${t('dialog.about.version', { version: '0.1.0' })}</div>
      <div class="about-description">
        ${t('dialog.about.description')}<br>
        ${t('dialog.about.subtitle')}
      </div>
      
      <div class="about-tools">
        <h4>${t('dialog.about.toolchainStatus')}:</h4>
        <div class="about-tools-list">${t('common.loading')}</div>
      </div>
      
      <div class="about-footer">
        ${t('dialog.about.copyright')}<br>
        ${t('dialog.about.license')}
      </div>
    `;

    // Open immediately; tool detection can take a few seconds
    Dialog.show({
      title: t('dialog.about.title'),
      body: content,
      buttons: [{ text: t('common.ok'), primary: true }]
    });

    apiClient.get('/api/tools')
      .then(response => {
        content.querySelector('.about-tools-list').innerHTML = this.renderToolStatus(response.tools || {}, t);
      })
      .catch(err => {
        content.querySelector('.about-tools-list').textContent = `${t('common.error')}: ${err.message}`;
      });
  }

  static renderToolStatus(tools, t) {
    const toolKeys = {
      iverilog: 'iverilog',
      verilator: 'verilator',
      yosys: 'yosys',
      'nextpnr-ice40': 'nextpnr_ice40',
      'nextpnr-ecp5': 'nextpnr_ecp5',
      icepack: 'icepack',
      iceprog: 'iceprog'
    };

    return Object.entries(tools)
      .map(([key, info]) => {
        const nameKey = toolKeys[key] || key;
        const name = t(`dialog.about.tools.${nameKey}`);
        const found = info.found;
        const statusClass = found ? 'tool-found' : 'tool-missing';
        const statusText = found ? t('dialog.about.found') : t('dialog.about.notFound');
        
        return `
          <div class="tool-status">
            <span class="tool-name">${name}</span>
            <span class="${statusClass}">${found ? Icons.success : Icons.error} ${statusText}</span>
          </div>
        `;
      })
      .join('');
  }
}
