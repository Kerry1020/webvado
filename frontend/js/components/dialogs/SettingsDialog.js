/**
 * SettingsDialog.js - 设置对话框
 */

import { Dialog } from '../Dialog.js';

export class SettingsDialog {
  static show(currentSettings = {}) {
    const settings = {
      autoSave: true,
      showLineNumbers: true,
      tabSize: 4,
      synthesisStrategy: 'default',
      simulator: 'iverilog',
      simulationTime: 1000000,
      ...currentSettings
    };

    const layout = document.createElement('div');
    layout.className = 'settings-layout';
    layout.innerHTML = `
      <div class="settings-categories">
        <div class="settings-category active" data-panel="general">常规</div>
        <div class="settings-category" data-panel="synthesis">综合</div>
        <div class="settings-category" data-panel="implementation">实现</div>
        <div class="settings-category" data-panel="simulation">仿真</div>
        <div class="settings-category" data-panel="bitstream">比特流</div>
      </div>
      
      <div class="settings-content">
        <div class="settings-panel active" data-panel-id="general">
          <h3>常规设置</h3>
          
          <div class="settings-group">
            <label>
              <input type="checkbox" id="setting-auto-save" ${settings.autoSave ? 'checked' : ''}>
              自动保存文件
            </label>
          </div>
          
          <div class="settings-group">
            <label>
              <input type="checkbox" id="setting-line-numbers" ${settings.showLineNumbers ? 'checked' : ''}>
              显示行号
            </label>
          </div>
          
          <div class="settings-group">
            <label for="setting-tab-size">Tab 大小:</label>
            <input type="number" id="setting-tab-size" min="2" max="8" value="${settings.tabSize}">
          </div>
        </div>
        
        <div class="settings-panel" data-panel-id="synthesis">
          <h3>综合设置</h3>
          
          <div class="settings-group">
            <label for="setting-synth-strategy">综合策略:</label>
            <select id="setting-synth-strategy">
              <option value="default" ${settings.synthesisStrategy === 'default' ? 'selected' : ''}>默认</option>
              <option value="area" ${settings.synthesisStrategy === 'area' ? 'selected' : ''}>面积优化</option>
              <option value="speed" ${settings.synthesisStrategy === 'speed' ? 'selected' : ''}>速度优化</option>
              <option value="power" ${settings.synthesisStrategy === 'power' ? 'selected' : ''}>功耗优化</option>
            </select>
          </div>
        </div>
        
        <div class="settings-panel" data-panel-id="implementation">
          <h3>实现设置</h3>
          <div class="settings-group">
            <label>实现策略:</label>
            <select>
              <option>默认</option>
              <option>性能优化</option>
              <option>功耗优化</option>
            </select>
          </div>
        </div>
        
        <div class="settings-panel" data-panel-id="simulation">
          <h3>仿真设置</h3>
          
          <div class="settings-group">
            <label for="setting-simulator">仿真器:</label>
            <select id="setting-simulator">
              <option value="iverilog" ${settings.simulator === 'iverilog' ? 'selected' : ''}>Icarus Verilog</option>
              <option value="verilator" ${settings.simulator === 'verilator' ? 'selected' : ''}>Verilator</option>
            </select>
          </div>
          
          <div class="settings-group">
            <label for="setting-sim-time">仿真时间 (ns):</label>
            <input type="number" id="setting-sim-time" min="1000" max="100000000" step="1000" value="${settings.simulationTime}">
          </div>
        </div>
        
        <div class="settings-panel" data-panel-id="bitstream">
          <h3>比特流设置</h3>
          <div class="settings-group">
            <label>比特流格式:</label>
            <select>
              <option>二进制 (.bin)</option>
              <option>ASCII (.asc)</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // 分类切换
    layout.querySelectorAll('.settings-category').forEach(cat => {
      cat.addEventListener('click', () => {
        const panel = cat.dataset.panel;
        
        // 更新分类激活状态
        layout.querySelectorAll('.settings-category').forEach(c => c.classList.remove('active'));
        cat.classList.add('active');
        
        // 显示对应面板
        layout.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        layout.querySelector(`.settings-panel[data-panel-id="${panel}"]`).classList.add('active');
      });
    });

    Dialog.show({
      title: '设置',
      body: layout,
      customClass: 'settings-dialog',
      buttons: [
        { text: '取消', onClick: () => {} },
        { 
          text: '确定',
          primary: true,
          onClick: () => {
            // 收集设置
            const newSettings = {
              autoSave: document.getElementById('setting-auto-save').checked,
              showLineNumbers: document.getElementById('setting-line-numbers').checked,
              tabSize: parseInt(document.getElementById('setting-tab-size').value),
              synthesisStrategy: document.getElementById('setting-synth-strategy').value,
              simulator: document.getElementById('setting-simulator').value,
              simulationTime: parseInt(document.getElementById('setting-sim-time').value)
            };
            
            // 保存到 localStorage
            localStorage.setItem('webvado-settings', JSON.stringify(newSettings));
            
            console.log('[Settings] Saved:', newSettings);
          }
        }
      ]
    });
  }
}
