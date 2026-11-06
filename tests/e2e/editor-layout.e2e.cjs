'use strict';
// Regression test for the editor layout collapse: when a file is open, the
// textarea must occupy real height (not be squeezed to ~1 line) and must sit
// to the RIGHT of the line-number gutter, not stacked below it.
// Root cause guarded: the inner editor container reused class `editor-area`,
// which inherited `flex-direction: column` from the outer container rule, so
// line numbers took the full height and the textarea collapsed to ~16px.
const assert = require('node:assert/strict');
const { chromium, request } = require('playwright');
const BASE = process.env.WEBVADO_URL || 'http://localhost:3000';
const SOURCE = Array.from({ length: 40 }, (_, i) => `// line ${i + 1} of the editor layout fixture`).join('\n') + '\n';

module.exports = async function run(existingPage, existingApi) {
  const api = existingApi || await request.newContext({ baseURL: BASE });
  const browser = existingPage ? null : await chromium.launch({ headless: true });
  const page = existingPage || await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const name = `e2e_layout_${Date.now().toString(36)}`;
  try {
    const created = await api.post('/api/projects', { data: { name, part: 'xc7a35t', language: 'verilog' } });
    assert.ok(created.ok(), 'create project');
    const project = await created.json();
    const put = await api.post(`/api/files/${project.id}/srcs/rtl/fixture.v`, { data: { content: SOURCE } });
    assert.ok(put.ok(), 'write source file');

    if (!existingPage) { await page.goto(BASE); }
    await page.waitForFunction(() => window.webvado?.initialized);
    await page.evaluate(n => window.webvado.openProject(n), name);
    await page.waitForFunction(n => window.webvado.currentProject?.name === n, name);
    await page.evaluate(() => window.webvado.openFile('srcs/rtl/fixture.v'));
    await page.waitForFunction(() => window.webvado.codeEditor.filename === 'srcs/rtl/fixture.v');

    const box = await page.evaluate(() => {
      const ta = document.querySelector('.editor-textarea');
      const ln = document.querySelector('.editor-line-numbers');
      const t = ta.getBoundingClientRect();
      const l = ln.getBoundingClientRect();
      return { taH: t.height, taX: t.x, taW: t.width, lnH: l.height, lnRight: l.right };
    });
    // 1) The textarea must be tall enough to show many lines, not one collapsed line.
    assert.ok(box.taH > 200, `textarea height collapsed: ${Math.round(box.taH)}px (expected > 200)`);
    // 2) The textarea must start to the right of the line-number gutter (side-by-side layout).
    assert.ok(box.taX >= box.lnRight - 1, `textarea not beside gutter: taX=${Math.round(box.taX)} lnRight=${Math.round(box.lnRight)}`);
    // 3) The textarea must have usable width.
    assert.ok(box.taW > 300, `textarea too narrow: ${Math.round(box.taW)}px`);
    console.log(`PASS editor layout: textarea ${Math.round(box.taW)}x${Math.round(box.taH)} at x=${Math.round(box.taX)} (gutter right=${Math.round(box.lnRight)})`);
  } finally {
    await api.delete(`/api/projects/${name}`).catch(() => {});
    if (browser) await browser.close();
    if (!existingApi) await api.dispose();
  }
};

if (require.main === module) {
  module.exports().then(() => console.log('editor-layout: done')).catch(e => { console.error(e.stack); process.exitCode = 1; });
}
