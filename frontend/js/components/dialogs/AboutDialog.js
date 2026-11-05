/**
 * AboutDialog.js - 关于对话框（支持国际化）
 */

import { Dialog } from '../Dialog.js';
import { APIClient } from '../../api/APIClient.js';
import i18n from '../../i18n/index.js';
import { Icons } from '../../ui/icons.js';

export class AboutDialog {
  static async show() {
    const t = i18n.t.bind(i18n);
    const apiClient = new APIClient();
    
    // 获取工具链状态
    let tools = {};
    try {
      const response = await apiClient.get('/api/tools');
      tools = response.tools || response;
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    }

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
        ${this.renderToolStatus(tools, t)}
      </div>
      
      <div class="about-footer">
        ${t('dialog.about.copyright')}<br>
        ${t('dialog.about.license')}
      </div>
    `;

    Dialog.show({
      title: t('dialog.about.title'),
      body: content,
      buttons: [
        {
          text: t('common.ok'),
          primary: true,
          onClick: () => {}
        }
      ]
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
