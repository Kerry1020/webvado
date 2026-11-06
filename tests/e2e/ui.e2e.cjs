'use strict';
// 以各动作的真实后置条件验证 UI；只操作本次新建的工程，finally 清理。
// 图标工具栏没有唯一可见文字，因此用稳定 data-action / data-tab 定位。
const assert = require('node:assert/strict');
const { chromium, request } = require('playwright');
const BASE = process.env.WEBVADO_URL || 'http://localhost:3000';
const SOURCE = 'module top(input wire clk, output reg led);\n always @(posedge clk) led <= ~led;\nendmodule\n';
const PATH = 'srcs/rtl/top.v';

(async () => {
  const api = await request.newContext({ baseURL: BASE });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  const names = [];
  page.on('pageerror', e => errors.push(e.message));
  const dialog = () => page.locator('.dialog-overlay:not(.dialog-closing) .dialog');
  const toolbar = action => page.locator(`#toolbar [data-action="${action}"]`);
  const flow = action => page.locator(`#flowNavigator [data-action="${action}"]`);
  const primary = () => dialog().locator('.btn-primary');
  const menu = async (name, action) => {
    await page.locator(`[data-menu="${name}"] > span`).click();
    await page.locator(`#menuBar [data-action="${action}"]`).click();
  };
  const dismiss = async () => {
    await page.keyboard.press('Escape');
    await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor({ state: 'detached' });
  };
  const pass = msg => console.log(`PASS ${msg}`);
  const current = id => page.waitForFunction(id => window.webvado.currentProjectId === id, id);
  const readFile = async id => (await (await api.get(`/api/files/${id}/${PATH}`)).json()).content;
  try {
    await page.goto(BASE);
    await page.waitForFunction(() => window.webvado?.initialized);
    pass('application initializes');

    await toolbar('save-project').click();
    await dialog().waitFor();
    assert.match(await dialog().innerText(), /project/i);
    await dismiss();
    await toolbar('find').click();
    await dialog().waitFor();
    assert.match(await dialog().innerText(), /file/i);
    await dismiss();
    pass('save without project and find without editor explain prerequisites');

    const name = `e2e_ui_${Date.now().toString(36)}`;
    names.push(name); // record before creation, including failures after creation
    await page.locator('#welcomeScreen [data-action="new-project"]').click();
    await page.getByLabel('Project name:', { exact: false }).fill(name);
    await primary().click();
    await page.waitForFunction(name => window.webvado.currentProject?.name === name, name);
    await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor({ state: 'detached' });
    const project = await page.evaluate(() => window.webvado.currentProject);
    assert.equal((await api.get(`/api/projects/${name}`)).ok(), true);
    pass('new project persists and opens; async modal closes after completion');

    await toolbar('save-project').click();
    await page.waitForFunction(() => document.getElementById('statusBarText').textContent === 'Saved');
    pass('save with no file reports status without inventing a file change');

    await page.locator('#sourcesPanel [data-action="add-sources"]').click();
    await page.locator('#new-file-name').fill('top.v');
    await primary().click();
    await page.waitForFunction(() => window.webvado.codeEditor.filename === 'srcs/rtl/top.v');
    await page.locator('.dialog-overlay:not(.dialog-closing)').waitFor({ state: 'detached' });
    const editor = page.locator('.editor-textarea');
    await editor.fill(SOURCE);
    await toolbar('save-project').click();
    await page.waitForFunction(() => !window.webvado.codeEditor.isDirty() && !window.webvado.pendingSaves);
    assert.equal(await readFile(project.id), SOURCE);
    await editor.fill(`${SOURCE}// shortcut`);
    await editor.press('Control+s');
    await page.waitForFunction(() => !window.webvado.codeEditor.isDirty() && !window.webvado.pendingSaves);
    assert.equal(await readFile(project.id), `${SOURCE}// shortcut`);
    pass('create source, toolbar Save and Ctrl+S write exact file bytes');

    await editor.press('ControlOrMeta+End');
    await editor.pressSequentially(' undo-marker');
    await toolbar('undo').click();
    assert.equal((await editor.inputValue()).includes('undo-marker'), false);
    await toolbar('redo').click();
    assert.equal((await editor.inputValue()).includes('undo-marker'), true);
    await editor.selectText();
    await menu('edit', 'copy');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await editor.inputValue());
    await menu('edit', 'cut');
    assert.equal(await editor.inputValue(), '');
    await menu('edit', 'paste');
    await page.waitForFunction(() => document.querySelector('.editor-textarea').value.includes('undo-marker'));
    pass('undo, redo, cut, copy and paste operate on actual editor history/clipboard');

    await toolbar('find').click();
    await page.locator('#find-term').fill('undo-marker');
    await page.locator('#find-replace').fill('replaced-marker');
    await dialog().getByRole('button', { name: 'Replace All' }).click();
    assert.equal((await editor.inputValue()).includes('replaced-marker'), true);
    await page.locator('#find-term').fill('module');
    await dialog().getByRole('button', { name: 'Find Next' }).click();
    assert.equal(await editor.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd)), 'module');
    await dismiss();
    pass('find selects a real match; replace changes text and dialog stays usable');

    await flow('lang-templates').click();
    await page.locator('#template-select').selectOption('D flip-flop with enable');
    await primary().click();
    assert.match(await editor.inputValue(), /else if \(en\)/);
    await editor.fill(SOURCE);
    await toolbar('save-project').click();
    await page.waitForFunction(() => !window.webvado.codeEditor.isDirty() && !window.webvado.pendingSaves);
    pass('language template inserts selected source at cursor');

    await page.locator('#sourcesPanel [data-action="search-sources"]').click();
    await dialog().locator('input').fill('not-present');
    await primary().click();
    assert.equal(await page.locator('.tree-item[data-file="top.v"]').count(), 0);
    await page.locator('.tree-filter-clear').click();
    await page.locator('.tree-item[data-file="top.v"]').waitFor();
    await page.locator('#sourcesPanel [data-action="refresh-sources"]').click();
    await page.locator('.tree-item[data-file="top.v"]').waitFor();
    await menu('tools', 'compile-order');
    assert.match(await page.locator('#sourcesTree').innerText(), /1\. srcs\/rtl\/top.v/);
    await page.locator('.tab[data-tab="sources"]').click();
    await page.locator('.tab[data-tab="sources"]').click();
    assert.equal(await page.locator('.tree-item[data-file="top.v"]').isVisible(), true);
    await page.locator('.tree-item[data-file="top.v"]').click({ button: 'right' });
    await page.locator('[data-cmd="set-top"]').click();
    await page.waitForFunction(() => window.webvado.currentProject.top_module === 'top');
    assert.equal((await (await api.get(`/api/projects/${project.id}`)).json()).top_module, 'top');
    pass('source search, clear, refresh, compile order, idempotent tab and Set Top have specific effects');

    await toolbar('settings').click();
    await page.locator('#setting-line-numbers').uncheck();
    await page.locator('#setting-tab-size').fill('2');
    await primary().click();
    assert.equal(await page.locator('.editor-line-numbers').isVisible(), false);
    assert.equal(await editor.evaluate(el => el.style.tabSize), '2');
    await flow('sim-settings').click();
    assert.equal(await dialog().locator('[data-panel-id="simulation"]').isVisible(), true);
    await dismiss();
    pass('editor settings apply immediately; simulation settings opens the requested panel');

    for (const action of ['ip-catalog', 'create-block', 'open-block', 'open-elab', 'report-drc']) {
      assert.equal(await flow(action).getAttribute('aria-disabled'), 'true');
      assert.match(await flow(action).getAttribute('title'), /Not implemented/);
    }
    pass('unimplemented hardware/IP/schematic actions are explicitly disabled with reasons');

    const programmingRequests = [];
    page.on('request', r => { if (/\/api\/hardware\/.+\/program$/.test(r.url())) programmingRequests.push(r.url()); });
    const boardResponse = page.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith('/api/hardware'));
    await flow('open-hw').click();
    const boards = await boardResponse;
    const boardResult = await boards.json();
    await page.waitForFunction(() => !document.querySelector('.hardware-status').textContent.includes('Loading'));
    if (boards.ok()) assert.ok(Array.isArray(boardResult.boards));
    else assert.match(await dialog().locator('.hardware-status').innerText(), /installed|tool|hardware|board/i);
    await dialog().locator('#hardware-target').selectOption('flash');
    await dialog().locator('#hardware-cable').press('Enter');
    const detection = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/hardware/detect'), { timeout: 130000 });
    await dialog().getByRole('button', { name: 'Detect', exact: true }).click();
    const detected = await detection;
    const detectedResult = await detected.json();
    await page.waitForFunction(() => !document.querySelector('.hardware-status').textContent.includes('Detecting'));
    if (detectedResult.detected === true) assert.match(await dialog().locator('.hardware-status').innerText(), /Hardware detected/);
    else assert.doesNotMatch(await dialog().locator('.hardware-status').innerText(), /successfully|Hardware detected/);
    assert.deepEqual(programmingRequests, []);
    await dismiss();
    await flow('program-device').click();
    await dialog().locator('#hardware-board').waitFor();
    assert.deepEqual(programmingRequests, []);
    await dismiss();
    pass('hardware dialog lists/detects using real API, reports missing hardware/tools and never auto-programs');

    for (const [panel, action] of [['flowNavigator', 'toggle-flow-nav'], ['sourcesPanel', 'toggle-sources'], ['consolePanel', 'toggle-console']]) {
      await menu('window', action);
      assert.equal(await page.locator(`#${panel}`).isVisible(), false);
      await menu('window', action);
      assert.equal(await page.locator(`#${panel}`).isVisible(), true);
    }
    const section = page.locator('.fn-section').first();
    await section.locator('.fn-section-title').click();
    assert.equal(await section.locator('.fn-items').isVisible(), false);
    await section.locator('.fn-section-title').click();
    assert.equal(await section.locator('.fn-items').isVisible(), true);
    await page.locator('#minimizeBtn').click();
    assert.match(await page.locator('#app').getAttribute('class'), /minimized/);
    await page.locator('#minimizeBtn').click();
    assert.doesNotMatch(await page.locator('#app').getAttribute('class'), /minimized/);
    await page.locator('#maximizeBtn').click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.locator('#maximizeBtn').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    pass('panel toggles, section collapse, minimize and fullscreen work');

    await menu('window', 'show-summary');
    assert.match(await dialog().innerText(), new RegExp(name));
    assert.match(await dialog().innerText(), /Design sources:\s+1/);
    await dismiss();
    await menu('help', 'about');
    assert.match(await dialog().innerText(), /WebVado/);
    await dismiss();
    const popupPromise = context.waitForEvent('page');
    await menu('help', 'documentation');
    const popup = await popupPromise;
    await popup.waitForURL(/github\.com\/Kerry1020\/webvado/).catch(() => {});
    assert.match(popup.url(), /github\.com\/Kerry1020\/webvado/);
    await popup.close();
    pass('summary, About and documentation popup expose their actual destinations/content');

    await page.locator('#consoleInput').fill('version');
    await page.locator('#consoleInput').press('Enter');
    await page.waitForFunction(() => document.getElementById('consoleBody').textContent.includes('WebVado 0.1.0'));
    await page.locator('#consolePanel [data-action="find-in-console"]').click();
    await dialog().locator('input').fill('WebVado');
    await primary().click();
    assert.ok(await page.locator('#consoleBody .found').count() > 0);
    for (const tab of ['messages', 'logs', 'reports', 'tcl-console']) {
      await page.locator(`.console-tab[data-tab="${tab}"]`).click();
      assert.equal(await page.locator('#consoleBody').getAttribute('data-filter'), tab);
    }
    await page.evaluate(() => { for (let i = 0; i < 100; i++) window.webvado.consoleManager.log(`line ${i}`); document.getElementById('consoleBody').scrollTop = 0; });
    await page.locator('#consolePanel [data-action="scroll-bottom"]').click();
    assert.equal(await page.locator('#consoleBody').evaluate(el => el.scrollTop + el.clientHeight >= el.scrollHeight - 2), true);
    await page.locator('#consolePanel [data-action="clear-console"]').click();
    assert.equal(await page.locator('#consoleBody .cl').count(), 0);
    pass('console command, search, tab filters, scrolling and clearing work');

    await menu('file', 'close-project');
    await primary().click();
    await current(null);
    assert.equal(await page.locator('#welcomeScreen').isVisible(), true);
    await page.locator('#welcomeScreen [data-action="open-project"]').click();
    await page.locator('#project-select').selectOption(name);
    await primary().click();
    await current(project.id);
    await page.locator('.tree-item[data-file="top.v"]').click();
    await page.waitForFunction(() => window.webvado.codeEditor.filename === 'srcs/rtl/top.v');
    assert.equal(await editor.inputValue(), SOURCE);
    pass('close and reopen round-trips persisted project and source');

    await menu('help', 'toggle-language');
    assert.equal((await page.locator('[data-menu="file"] > span').innerText()).trim(), '文件');
    assert.match(await page.locator('#flowNavContent').innerText(), /运行仿真/);
    assert.match(await page.locator('#titleBarText').innerText(), new RegExp(name));
    await page.reload();
    await page.waitForFunction(() => window.webvado?.initialized);
    assert.equal((await page.locator('[data-menu="file"] > span').innerText()).trim(), '文件');
    await menu('help', 'toggle-language');
    assert.equal((await page.locator('[data-menu="file"] > span').innerText()).trim(), 'File');
    pass('language switches visible UI, preserves project during toggle, persists preference on reload');
    await require('./editor-safety.e2e.cjs');
    await require('./editor-layout.e2e.cjs')(page, api);
    await require('./netlist.e2e.cjs');
    await require('./build-flow.cjs')(page, api);
    assert.deepEqual(errors, []);
    pass('no uncaught browser errors');
  } catch (error) {
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await browser.close();
    for (const name of names) {
      const result = await api.delete(`/api/projects/${name}`);
      assert.ok(result.ok() || result.status() === 404, `cleanup ${name}`);
    }
    await api.dispose();
  }
})();
