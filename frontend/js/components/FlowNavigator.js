/**
 * FlowNavigator - Vivado-style Flow Navigator sidebar
 * Uses SVG icons, no emoji
 */

import { Icons } from '../ui/icons.js';

export class FlowNavigator {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.container = null;
    this.sections = this.getSections();
  }

  init() {
    this.container = document.getElementById('flowNavContent');
    if (!this.container) {
      console.error('[FlowNavigator] Container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
    
    console.log('[FlowNavigator] Initialized');
  }

  getSections() {
    return [
      {
        id: 'project-manager',
        title: 'PROJECT MANAGER',
        items: [
          { id: 'settings', iconSvg: Icons.settings, label: 'Settings', action: 'settings' },
          { id: 'add-sources', iconSvg: Icons.add, label: 'Add Sources', action: 'add-sources' },
          { id: 'lang-templates', iconSvg: Icons.verilog, label: 'Language Templates', action: 'lang-templates' },
          { id: 'ip-catalog', iconSvg: Icons.compile, label: 'IP Catalog', action: 'ip-catalog' }
        ]
      },
      {
        id: 'ip-integrator',
        title: 'IP INTEGRATOR',
        items: [
          { id: 'create-block', iconSvg: Icons.add, label: 'Create Block Design', action: 'create-block' },
          { id: 'open-block', iconSvg: Icons.folderOpen, label: 'Open Block Design', action: 'open-block' }
        ]
      },
      {
        id: 'simulation',
        title: 'SIMULATION',
        items: [
          { id: 'sim-settings', iconSvg: Icons.settings, label: 'Simulation Settings', action: 'sim-settings' },
          { id: 'run-sim', iconSvg: Icons.play, label: 'Run Simulation', action: 'run-simulation', playable: true }
        ]
      },
      {
        id: 'rtl-analysis',
        title: 'RTL ANALYSIS',
        items: [
          { id: 'open-elab', iconSvg: Icons.folderOpen, label: 'Open Elaborated Design', action: 'open-elab' },
          { id: 'schematic', iconSvg: Icons.compile, label: 'Schematic', action: 'schematic' },
          { id: 'report-drc', iconSvg: Icons.verilog, label: 'Report DRC', action: 'report-drc' }
        ]
      },
      {
        id: 'synthesis',
        title: 'SYNTHESIS',
        items: [
          { id: 'run-synth', iconSvg: Icons.play, label: 'Run Synthesis', action: 'run-synthesis', playable: true },
          { id: 'open-synth', iconSvg: Icons.folderOpen, label: 'Open Synthesized Design', action: 'open-synth' }
        ]
      },
      {
        id: 'implementation',
        title: 'IMPLEMENTATION',
        items: [
          { id: 'run-impl', iconSvg: Icons.play, label: 'Run Implementation', action: 'run-implementation', playable: true },
          { id: 'open-impl', iconSvg: Icons.folderOpen, label: 'Open Implemented Design', action: 'open-impl' }
        ]
      },
      {
        id: 'program-debug',
        title: 'PROGRAM AND DEBUG',
        items: [
          { id: 'gen-bitstream', iconSvg: Icons.download, label: 'Generate Bitstream', action: 'generate-bitstream' },
          { id: 'open-hw', iconSvg: Icons.debug, label: 'Open Hardware Manager', action: 'open-hw' },
          { id: 'program-device', iconSvg: Icons.upload, label: 'Program Device', action: 'program-device' }
        ]
      }
    ];
  }

  render() {
    this.container.innerHTML = this.sections.map(section => `
      <div class="fn-section" data-section="${section.id}">
        <div class="fn-section-title" data-section-id="${section.id}">
          <span class="fn-arrow"></span>
          <span>${section.title}</span>
        </div>
        <div class="fn-items">
          ${section.items.map(item => `
            <div class="fn-item" data-action="${item.action}" data-item-id="${item.id}">
              ${item.playable ? '<span class="play">' + Icons.play + '</span>' : ''}
              <span class="fn-item-icon">${item.iconSvg}</span>
              <span class="fn-item-label">${item.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Section collapse/expand — only on title clicks
    this.container.addEventListener('click', (e) => {
      const sectionTitle = e.target.closest('.fn-section-title');
      if (sectionTitle) {
        e.stopPropagation();
        const section = sectionTitle.closest('.fn-section');
        section.classList.toggle('collapsed');
        return; // don't process item click
      }
    });

    // Item clicks — only on fn-item
    this.container.addEventListener('click', (e) => {
      const item = e.target.closest('.fn-item');
      if (!item) return;

      e.stopPropagation();
      const action = item.dataset.action;
      if (action) {
        this.eventBus.emit(`action:${action}`);
      }
    });
  }

  markItemComplete(itemId) {
    const item = this.container.querySelector(`[data-item-id="${itemId}"]`);
    if (item) {
      item.classList.add('done');
    }
  }

  markItemIncomplete(itemId) {
    const item = this.container.querySelector(`[data-item-id="${itemId}"]`);
    if (item) {
      item.classList.remove('done');
    }
  }
}
