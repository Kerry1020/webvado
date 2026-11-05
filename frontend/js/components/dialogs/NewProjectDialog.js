/**
 * NewProjectDialog.js - 新建工程对话框（支持国际化）
 */

import { Dialog } from '../Dialog.js';
import i18n from '../../i18n/index.js';

export class NewProjectDialog {
  static show(onCreate) {
    const t = i18n.t.bind(i18n);
    
    const form = document.createElement('form');
    form.className = 'dialog-form';
    form.innerHTML = `
      <div class="dialog-form-group">
        <label for="project-name">${t('dialog.newProject.projectName')}</label>
        <input type="text" id="project-name" name="name" required 
               placeholder="${t('dialog.newProject.projectNamePlaceholder')}" 
               autofocus pattern="[a-zA-Z0-9_-]+" 
               title="Only letters, numbers, underscores and hyphens">
      </div>
      
      <div class="dialog-form-group">
        <label for="project-part">${t('dialog.newProject.targetPart')}</label>
        <select id="project-part" name="part" required>
          <option value="ice40hx8k">${t('dialog.newProject.parts.ice40hx8k')}</option>
          <option value="ice40up5k">${t('dialog.newProject.parts.ice40up5k')}</option>
          <option value="ecp5-85k">${t('dialog.newProject.parts.ecp5_85k')}</option>
          <option value="generic">${t('dialog.newProject.parts.generic')}</option>
        </select>
      </div>
      
      <div class="dialog-form-group">
        <label for="project-language">${t('dialog.newProject.language')}</label>
        <select id="project-language" name="language" required>
          <option value="verilog" selected>${t('dialog.newProject.languageVerilog')}</option>
          <option value="vhdl">${t('dialog.newProject.languageVHDL')}</option>
        </select>
      </div>
    `;

    let submitted = false;
    
    Dialog.show({
      title: t('dialog.newProject.title'),
      body: form,
      buttons: [
        { 
          text: t('common.cancel'),
          onClick: () => {}
        },
        { 
          text: t('common.create'),
          primary: true,
          onClick: () => {
            if (form.checkValidity()) {
              submitted = true;
              const data = {
                name: form.querySelector('#project-name').value.trim(),
                part: form.querySelector('#project-part').value,
                language: form.querySelector('#project-language').value
              };
              onCreate(data);
            } else {
              form.reportValidity();
              return false;
            }
          }
        }
      ]
    });

    // 回车提交
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const createBtn = document.querySelector('.dialog-footer .btn-primary');
      if (createBtn) createBtn.click();
    });
  }
}
