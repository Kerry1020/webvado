/**
 * SettingsDialog.js - 设置对话框（支持国际化）
 * 设置保存在 localStorage 的 webvado-settings 里
 */

import { Dialog } from '../Dialog.js';
import i18n from '../../i18n/index.js';

const STORAGE_KEY = 'webvado-settings';

export const DEFAULT_SETTINGS = {
  autoSave: false,
  showLineNumbers: true,
  tabSize: 4,
  synthesisStrategy: 'default',
  simulator: 'iverilog',
  simulationTime: 1000000
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export class SettingsDialog {
  /**
   * @param {object} options
   * @param {string} [options.panel] - 打开时选中的分类：general | synthesis | simulation
   * @param {(settings: object) => void} [options.onSave]
   */
  static show({ panel = 'general', onSave } = {}) {
    const t = key => i18n.t(`dialog.settings.${key}`);
    const s = loadSettings();
    const sel = (value, current) => (value === current ? 'selected' : '');

    const layout = document.createElement('div');
    layout.className = 'settings-layout';
    layout.innerHTML = `
      <div class="settings-categories">
        ${['general', 'synthesis', 'simulation'].map(id => `
          <div class="settings-category" data-panel="${id}">${t(`categories.${id}`)}</div>`).join('')}
      </div>
      <div class="settings-content">
        <div class="settings-panel" data-panel-id="general">
          <h3>${t('general.title')}</h3>
          <div class="settings-group">
            <label><input type="checkbox" id="setting-auto-save" ${s.autoSave ? 'checked' : ''}> ${t('general.autoSave')}</label>
            <small>${t('general.autoSaveDesc')}</small>
          </div>
          <div class="settings-group">
            <label><input type="checkbox" id="setting-line-numbers" ${s.showLineNumbers ? 'checked' : ''}> ${t('general.showLineNumbers')}</label>
            <small>${t('general.showLineNumbersDesc')}</small>
          </div>
          <div class="settings-group">
            <label for="setting-tab-size">${t('general.tabSize')}</label>
            <input type="number" id="setting-tab-size" min="2" max="8" value="${s.tabSize}">
            <small>${t('general.tabSizeDesc')}</small>
          </div>
        </div>
        <div class="settings-panel" data-panel-id="synthesis">
          <h3>${t('synthesis.title')}</h3>
          <div class="settings-group">
            <label for="setting-synth-strategy">${t('synthesis.strategy')}</label>
            <select id="setting-synth-strategy" disabled title="Only the default Yosys strategy is supported">
              ${['default'].map(v => `
                <option value="${v}" ${sel(v, s.synthesisStrategy)}>${t(`synthesis.strategies.${v}`)}</option>`).join('')}
            </select>
            <small>${t('synthesis.strategyDesc')}</small>
          </div>
        </div>
        <div class="settings-panel" data-panel-id="simulation">
          <h3>${t('simulation.title')}</h3>
          <div class="settings-group">
            <label for="setting-simulator">${t('simulation.simulator')}</label>
            <select id="setting-simulator">
              <option value="iverilog" ${sel('iverilog', s.simulator)}>Icarus Verilog</option>
            </select>
            <small>${t('simulation.simulatorDesc')}</small>
          </div>
          <div class="settings-group">
            <label for="setting-sim-time">${t('simulation.runTime')}</label>
            <input type="number" id="setting-sim-time" min="1" max="1000000000" step="1" value="${s.simulationTime}">
            <small>${t('simulation.runTimeDesc')}</small>
          </div>
        </div>
      </div>
    `;

    const select = (id) => {
      layout.querySelectorAll('.settings-category').forEach(c => c.classList.toggle('active', c.dataset.panel === id));
      layout.querySelectorAll('.settings-panel').forEach(p => p.classList.toggle('active', p.dataset.panelId === id));
    };
    layout.querySelectorAll('.settings-category').forEach(cat => {
      cat.addEventListener('click', () => select(cat.dataset.panel));
    });
    select(panel);

    Dialog.show({
      title: t('title'),
      body: layout,
      customClass: 'settings-dialog',
      buttons: [
        { text: i18n.t('common.cancel') },
        {
          text: i18n.t('common.ok'),
          primary: true,
          onClick: () => {
            const num = (id, min, max, fallback) => {
              const n = parseInt(layout.querySelector(id).value, 10);
              return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
            };
            const settings = {
              autoSave: layout.querySelector('#setting-auto-save').checked,
              showLineNumbers: layout.querySelector('#setting-line-numbers').checked,
              tabSize: num('#setting-tab-size', 2, 8, DEFAULT_SETTINGS.tabSize),
              synthesisStrategy: layout.querySelector('#setting-synth-strategy').value,
              simulator: layout.querySelector('#setting-simulator').value,
              simulationTime: num('#setting-sim-time', 1, 1e9, DEFAULT_SETTINGS.simulationTime)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            if (onSave) onSave(settings);
          }
        }
      ]
    });
  }
}
