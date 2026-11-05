import { Dialog } from '../Dialog.js';
import i18n from '../../i18n/index.js';

export class HardwareDialog {
  static async show(app) {
    const t = key => i18n.t(`hardware.${key}`);
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="dialog-form-group"><label for="hardware-board">${t('board')}</label><select id="hardware-board"><option value="">${t('automatic')}</option></select></div>
      <div class="dialog-form-group"><label for="hardware-cable">${t('cable')}</label><input id="hardware-cable" type="text"></div>
      <div class="dialog-form-group"><label for="hardware-serial">${t('serial')}</label><input id="hardware-serial" type="text"></div>
      <div class="dialog-form-group"><label for="hardware-target">${t('target')}</label><select id="hardware-target"><option value="sram">SRAM</option><option value="flash">Flash</option></select></div>
      <p class="hardware-status" role="status">${t('loading')}</p><pre class="dialog-pre hardware-log"></pre>`;
    const status = form.querySelector('.hardware-status');
    const log = form.querySelector('.hardware-log');
    const board = form.querySelector('#hardware-board');
    const projectId = app.currentProjectId;
    const options = () => ({
      board: board.value || undefined,
      cable: form.querySelector('#hardware-cable').value.trim() || undefined,
      serial: form.querySelector('#hardware-serial').value.trim() || undefined,
      target: form.querySelector('#hardware-target').value
    });
    const perform = async program => {
      const body = options();
      if (program && !projectId) { status.textContent = i18n.t('messages.noProjectOpen'); return false; }
      if (program && !body.board && !body.cable) { status.textContent = t('selectBoard'); return false; }
      status.textContent = program ? t('programming') : t('detecting');
      try {
        const result = await app.apiClient.post(program ? `/api/hardware/${encodeURIComponent(projectId)}/program` : '/api/hardware/detect', body);
        const success = program ? result.success === true : result.success === true && result.detected === true;
        status.textContent = success ? t(program ? 'programmed' : 'detected') : t('notDetected');
        log.textContent = result.log || '';
        app.consoleManager.log(`${status.textContent}\n${result.log || ''}`, success ? 'success' : 'error');
      } catch (error) {
        status.textContent = error.message;
        log.textContent = error.details?.log || '';
        app.consoleManager.log(`${error.message}\n${log.textContent}`, 'error');
      }
      return false;
    };
    const dialog = Dialog.show({
      title: i18n.t('flowNav.openHw'), body: form,
      buttons: [
        { text: i18n.t('common.close') },
        { text: t('detect'), onClick: () => perform(false) },
        { text: t('program'), primary: true, onClick: () => perform(true) }
      ]
    });
    // Enter in a field must not implicitly program a physical device.
    form.onsubmit = e => e.preventDefault();
    try {
      const result = await app.apiClient.get('/api/hardware');
      if (!dialog.isConnected) return;
      for (const name of result.boards || []) board.add(new Option(name, name));
      status.textContent = t('ready');
      log.textContent = result.log || '';
    } catch (error) {
      if (dialog.isConnected) { status.textContent = error.message; log.textContent = error.details?.log || ''; }
    }
  }
}
