/**
 * FlowNavigator - Vivado-style Flow Navigator sidebar
 * Uses SVG icons, no emoji
 */

import { Icons } from '../ui/icons.js';
import i18n from '../i18n/index.js';

const UNAVAILABLE = new Set(['ip-catalog', 'create-block', 'open-block', 'open-elab', 'report-drc']);

// labelKey 指向 i18n 里 flowNav 下的键；run 为 true 的项显示绿色运行箭头（不再叠加图标）
const SECTIONS = [
  {
    id: 'project-manager', titleKey: 'projectManager', items: [
      { id: 'settings', icon: 'settings', labelKey: 'settings', action: 'settings' },
      { id: 'add-sources', icon: 'add', labelKey: 'addSources', action: 'add-sources' },
      { id: 'lang-templates', icon: 'verilog', labelKey: 'langTemplates', action: 'lang-templates' },
      { id: 'ip-catalog', icon: 'compile', labelKey: 'ipCatalog', action: 'ip-catalog' }
    ]
  },
  {
    id: 'ip-integrator', titleKey: 'ipIntegrator', items: [
      { id: 'create-block', icon: 'add', labelKey: 'createBlock', action: 'create-block' },
      { id: 'open-block', icon: 'folderOpen', labelKey: 'openBlock', action: 'open-block' }
    ]
  },
  {
    id: 'simulation', titleKey: 'simulation', items: [
      { id: 'sim-settings', icon: 'settings', labelKey: 'simSettings', action: 'sim-settings' },
      { id: 'run-sim', labelKey: 'runSim', action: 'run-simulation', run: true }
    ]
  },
  {
    id: 'rtl-analysis', titleKey: 'rtlAnalysis', items: [
      { id: 'open-elab', icon: 'folderOpen', labelKey: 'openElab', action: 'open-elab' },
      { id: 'schematic', icon: 'compile', labelKey: 'schematic', action: 'schematic' },
      { id: 'report-drc', icon: 'verilog', labelKey: 'reportDrc', action: 'report-drc' }
    ]
  },
  {
    id: 'synthesis', titleKey: 'synthesis', items: [
      { id: 'run-synth', labelKey: 'runSynth', action: 'run-synthesis', run: true },
      { id: 'open-synth', icon: 'folderOpen', labelKey: 'openSynth', action: 'open-synth' }
    ]
  },
  {
    id: 'implementation', titleKey: 'implementation', items: [
      { id: 'run-impl', labelKey: 'runImpl', action: 'run-implementation', run: true },
      { id: 'open-impl', icon: 'folderOpen', labelKey: 'openImpl', action: 'open-impl' }
    ]
  },
  {
    id: 'program-debug', titleKey: 'programDebug', items: [
      { id: 'gen-bitstream', icon: 'download', labelKey: 'genBitstream', action: 'generate-bitstream' },
      { id: 'open-hw', icon: 'debug', labelKey: 'openHw', action: 'open-hw' },
      { id: 'program-device', icon: 'upload', labelKey: 'programDevice', action: 'program-device' }
    ]
  }
];

export class FlowNavigator {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = null;
    this.collapsed = new Set();
    this.done = new Set();
  }

  init() {
    this.container = document.getElementById('flowNavContent');
    if (!this.container) {
      console.error('[FlowNavigator] Container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
    window.addEventListener('locale-changed', () => this.render());

    console.log('[FlowNavigator] Initialized');
  }

  render() {
    const t = key => i18n.t(`flowNav.${key}`);
    this.container.innerHTML = SECTIONS.map(section => `
      <div class="fn-section${this.collapsed.has(section.id) ? ' collapsed' : ''}" data-section="${section.id}">
        <div class="fn-section-title" data-section-id="${section.id}">
          <span class="fn-arrow"></span>
          <span>${t(section.titleKey)}</span>
        </div>
        <div class="fn-items">
          ${section.items.map(item => `
            <div class="fn-item${this.done.has(item.id) ? ' done' : ''}" data-action="${item.action}" data-item-id="${item.id}" role="button" tabindex="${UNAVAILABLE.has(item.action) ? '-1' : '0'}" ${UNAVAILABLE.has(item.action) ? `aria-disabled="true" title="${i18n.t('messages.featureUnavailable')}"` : ''}>
              ${item.run
                ? `<span class="play">${Icons.play}</span>`
                : `<span class="fn-item-icon">${Icons[item.icon] || ''}</span>`}
              <span class="fn-item-label">${t(item.labelKey)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Section titles collapse/expand; items emit their action.
    // Items are <div>s, so the global button[data-action] listener does not see them.
    this.container.addEventListener('click', (e) => {
      const title = e.target.closest('.fn-section-title');
      if (title) {
        const section = title.closest('.fn-section');
        section.classList.toggle('collapsed');
        if (section.classList.contains('collapsed')) this.collapsed.add(section.dataset.section);
        else this.collapsed.delete(section.dataset.section);
        return;
      }

      const item = e.target.closest('.fn-item');
      if (item?.dataset.action && item.getAttribute('aria-disabled') !== 'true') {
        this.eventBus.emit(`action:${item.dataset.action}`);
      }
    });

    // Keyboard: Enter/Space on a focused item
    this.container.addEventListener('keydown', (e) => {
      const item = e.target.closest('.fn-item');
      if (item && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        item.click();
      }
    });
  }

  markItemComplete(itemId) {
    this.done.add(itemId);
    this.container?.querySelector(`[data-item-id="${itemId}"]`)?.classList.add('done');
  }

  markItemIncomplete(itemId) {
    this.done.delete(itemId);
    this.container?.querySelector(`[data-item-id="${itemId}"]`)?.classList.remove('done');
  }

  resetProgress() {
    [...this.done].forEach(id => this.markItemIncomplete(id));
  }
}
