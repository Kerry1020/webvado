'use strict';
// 每个用例拥有独立临时工程；延迟响应用显式闸门复现保存竞态。
const assert = require('node:assert/strict');
const { chromium, request } = require('playwright');
const BASE = process.env.WEBVADO_URL || 'http://localhost:3000';
const SOURCE = 'module top;\nendmodule\n';
const PATH = 'srcs/rtl/top.v';

module.exports = (async () => {
  const api = await request.newContext({ baseURL: BASE });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const cases = {
    async 'close file asks before losing edits'(page) {
      await page.locator('.editor-textarea').fill(`${SOURCE}// unsaved`);
      await page.locator('.code-editor .editor-close-btn').click();
      await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.editor-textarea').inputValue(), `${SOURCE}// unsaved`);
      await page.locator('.code-editor .editor-close-btn').click();
      await page.locator('.dialog-overlay:not(.dialog-closing) .btn-primary').click();
      await page.waitForFunction(() => !window.webvado.codeEditor.isOpen());
    },
    async 'save acknowledgment never marks newer edits saved'(page, project) {
      let release, arrived;
      const gate = new Promise(r => { release = r; });
      const received = new Promise(r => { arrived = r; });
      await page.route('**/api/files/**', async route => {
        if (route.request().method() !== 'PUT') return route.continue();
        arrived();
        await gate;
        await route.continue();
      });
      await page.locator('.editor-textarea').fill(`${SOURCE}// first`);
      const saving = page.evaluate(() => window.webvado.handleSave());
      await received;
      await page.locator('.editor-textarea').fill(`${SOURCE}// second`);
      release();
      await saving;
      assert.equal((await (await api.get(`/api/files/${project.id}/${PATH}`)).json()).content, `${SOURCE}// first`);
      assert.equal(await page.evaluate(() => window.webvado.codeEditor.isDirty()), true);
    },
    async 'concurrent saves preserve invocation order'(page, project) {
      let release, arrived;
      const gate = new Promise(r => { release = r; });
      const received = new Promise(r => { arrived = r; });
      let puts = 0;
      await page.route('**/api/files/**', async route => {
        if (route.request().method() !== 'PUT') return route.continue();
        if (++puts === 1) { arrived(); await gate; }
        await route.continue();
      });
      await page.locator('.editor-textarea').fill(`${SOURCE}// first`);
      const first = page.evaluate(() => window.webvado.handleSave());
      await received;
      await page.locator('.editor-textarea').fill(`${SOURCE}// second`);
      const second = page.evaluate(() => window.webvado.handleSave());
      release();
      await Promise.all([first, second]);
      assert.equal((await (await api.get(`/api/files/${project.id}/${PATH}`)).json()).content, `${SOURCE}// second`);
      assert.equal(await page.evaluate(() => window.webvado.codeEditor.isDirty()), false);
    },
    async 'automatic saving persists edits after enabling setting'(page, project) {
      await page.locator('#flowNavigator [data-action="settings"]').click();
      await page.locator('#setting-auto-save').check();
      await page.locator('.dialog-overlay:not(.dialog-closing) .btn-primary').click();
      await page.locator('.editor-textarea').fill(`${SOURCE}// autosaved`);
      await page.waitForFunction(async ({ id, path }) => {
        const r = await fetch(`/api/files/${id}/${path}`);
        return (await r.json()).content.endsWith('// autosaved');
      }, { id: project.id, path: PATH });
      await page.waitForFunction(() => !window.webvado.pendingSaves && !window.webvado.codeEditor.isDirty());
      assert.equal(await page.evaluate(() => window.webvado.codeEditor.isDirty()), false);
    },
    async 'cancel project switch preserves dirty file and project'(page, project) {
      await page.locator('.editor-textarea').fill(`${SOURCE}// stay here`);
      const switching = page.evaluate(id => window.webvado.openProject(id), project.id);
      await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor();
      await page.keyboard.press('Escape');
      await switching;
      assert.equal(await page.evaluate(() => window.webvado.currentProjectId), project.id);
      assert.equal(await page.locator('.editor-textarea').inputValue(), `${SOURCE}// stay here`);
    },
    async 'cancel file switch preserves dirty buffer'(page, project) {
      const created = await api.post(`/api/files/${project.id}/srcs/rtl/other.v`, { data: { content: 'module other; endmodule' } });
      assert.equal(created.ok(), true);
      await page.locator('.editor-textarea').fill(`${SOURCE}// stay in top`);
      const switching = page.evaluate(() => window.webvado.openFile('srcs/rtl/other.v'));
      await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor();
      await page.keyboard.press('Escape');
      await switching;
      assert.equal(await page.evaluate(() => window.webvado.codeEditor.filename), PATH);
      assert.equal(await page.locator('.editor-textarea').inputValue(), `${SOURCE}// stay in top`);
    },
    async 'failed save keeps dirty buffer and reports failure'(page) {
      await page.route('**/api/files/**', route => route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, json: { error: { message: 'disk unavailable' } } }) : route.continue());
      await page.locator('.editor-textarea').fill(`${SOURCE}// keep me`);
      await page.locator('#toolbar [data-action="save-project"]').click();
      await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor();
      assert.match(await page.locator('.dialog-body').innerText(), /disk unavailable/);
      assert.equal(await page.evaluate(() => window.webvado.codeEditor.isDirty()), true);
      assert.equal(await page.locator('.editor-textarea').inputValue(), `${SOURCE}// keep me`);
    }
  };
  try {
    for (const [name, run] of Object.entries(cases)) {
      const projectName = `e2e_safety_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      let project;
      const page = await browser.newPage();
      page.setDefaultTimeout(6000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        const created = await api.post('/api/projects', { data: { name: projectName, part: 'ice40hx8k', language: 'verilog' } });
        assert.equal(created.ok(), true, await created.text());
        project = await created.json();
        const file = await api.post(`/api/files/${project.id}/${PATH}`, { data: { content: SOURCE } });
        assert.equal(file.ok(), true, await file.text());
        await page.goto(BASE);
        await page.waitForFunction(() => window.webvado?.initialized);
        await page.evaluate(async ({ id, path }) => {
          await window.webvado.openProject(id);
          await window.webvado.openFile(path);
        }, { id: project.id, path: PATH });
        await run(page, project);
        assert.deepEqual(errors, []);
        console.log(`PASS ${name}`);
      } catch (e) {
        failures.push(name);
        console.error(`FAIL ${name}: ${e.message}`);
      } finally {
        await page.close();
        if (project) {
          const removed = await api.delete(`/api/projects/${project.id}`);
          assert.equal(removed.ok(), true, 'temporary project cleanup');
        }
      }
    }
  } finally {
    await browser.close();
    await api.dispose();
  }
  if (failures.length) throw new Error(`${failures.length} editor safety checks failed: ${failures.join(', ')}`);
})();
if (require.main === module) module.exports.catch(error => { console.error(error); process.exitCode = 1; });
